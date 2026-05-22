import { ReviewTimingService, humaniseReviewTime } from './review-timing.service';

// ── humaniseReviewTime ────────────────────────────────────────────────────────

describe('humaniseReviewTime', () => {
  const now = new Date('2024-06-15T12:00:00.000Z');

  const at = (ms: number) => new Date(now.getTime() + ms);
  const min  = (n: number) => n * 60 * 1000;
  const hour = (n: number) => n * 60 * min(1);
  const day  = (n: number) => n * 24 * hour(1);

  describe('past (overdue)', () => {
    it('returns "Overdue" for 1 second in the past', () => {
      expect(humaniseReviewTime(at(-1000), now)).toBe('Overdue');
    });

    it('returns "Overdue" for 1 day overdue', () => {
      expect(humaniseReviewTime(at(-day(1)), now)).toBe('Overdue');
    });

    it('returns "Overdue by N days" for 2+ days overdue', () => {
      expect(humaniseReviewTime(at(-day(2)), now)).toBe('Overdue by 2 days');
      expect(humaniseReviewTime(at(-day(5)), now)).toBe('Overdue by 5 days');
    });
  });

  describe('within 10 minutes (covers again preview)', () => {
    it('returns "In a moment" for 0ms', () => {
      expect(humaniseReviewTime(now, now)).toBe('In a moment');
    });

    it('returns "In a moment" for 10 minutes exactly', () => {
      expect(humaniseReviewTime(at(min(10)), now)).toBe('In a moment');
    });

    it('returns "In a moment" for 5 minutes', () => {
      expect(humaniseReviewTime(at(min(5)), now)).toBe('In a moment');
    });
  });

  describe('within 60 minutes', () => {
    it('returns "In N min" for 15 minutes', () => {
      expect(humaniseReviewTime(at(min(15)), now)).toBe('In 15 min');
    });

    it('returns "In N min" for 45 minutes', () => {
      expect(humaniseReviewTime(at(min(45)), now)).toBe('In 45 min');
    });
  });

  describe('same day, <24h away', () => {
    it('returns "Today" for 1 hour', () => {
      expect(humaniseReviewTime(at(hour(1)), now)).toBe('Today');
    });

    it('returns "In N hours" for 4 hours', () => {
      expect(humaniseReviewTime(at(hour(4)), now)).toBe('In 4 hours');
    });
  });

  describe('tomorrow', () => {
    it('returns "Tomorrow" for 24-48 hours away', () => {
      expect(humaniseReviewTime(at(day(1) + hour(1)), now)).toBe('Tomorrow');
    });
  });

  describe('within 6 days', () => {
    it('returns "In N days" for 3 days', () => {
      expect(humaniseReviewTime(at(day(3)), now)).toBe('In 3 days');
    });

    it('returns "In N days" for 5 days', () => {
      expect(humaniseReviewTime(at(day(5)), now)).toBe('In 5 days');
    });
  });

  describe('within 4 weeks', () => {
    it('returns "In 1 week" for 7 days', () => {
      expect(humaniseReviewTime(at(day(7)), now)).toBe('In 1 week');
    });

    it('returns "In N weeks" for 14 days', () => {
      expect(humaniseReviewTime(at(day(14)), now)).toBe('In 2 weeks');
    });
  });

  describe('within 12 months', () => {
    it('returns "In N months" for 60 days', () => {
      expect(humaniseReviewTime(at(day(60)), now)).toBe('In 2 months');
    });

    it('returns "In N months" for 180 days', () => {
      expect(humaniseReviewTime(at(day(180)), now)).toBe('In 6 months');
    });
  });

  describe('more than 12 months', () => {
    it('returns "In over a year" for 400 days', () => {
      expect(humaniseReviewTime(at(day(400)), now)).toBe('In over a year');
    });
  });
});

// ── ReviewTimingService.computePreviews ───────────────────────────────────────

describe('ReviewTimingService.computePreviews', () => {
  let service: ReviewTimingService;

  beforeEach(() => {
    service = new ReviewTimingService();
  });

  it('returns previews for all four ratings', () => {
    const previews = service.computePreviews(4, 2.5);
    expect(previews).toHaveProperty('again');
    expect(previews).toHaveProperty('hard');
    expect(previews).toHaveProperty('good');
    expect(previews).toHaveProperty('easy');
  });

  it('again preview has intervalDays=0 and human="In a moment"', () => {
    const { again } = service.computePreviews(4, 2.5);
    expect(again.intervalDays).toBe(0);
    expect(again.human).toBe('In a moment');
    expect(again.nextReview).toBeInstanceOf(Date);
  });

  it('hard preview has higher intervalDays than 1', () => {
    const { hard } = service.computePreviews(4, 2.5);
    expect(hard.intervalDays).toBe(5); // round(4 * 1.2)
  });

  it('good preview uses interval * easeFactor', () => {
    const { good } = service.computePreviews(4, 2.5);
    expect(good.intervalDays).toBe(10); // round(4 * 2.5)
  });

  it('easy preview has the longest interval', () => {
    const { easy } = service.computePreviews(4, 2.5);
    expect(easy.intervalDays).toBe(13); // round(4 * 2.5 * 1.3)
  });

  it('all nextReview dates are in the future (or now for again)', () => {
    const previews = service.computePreviews(0, 2.5);
    const now = Date.now();
    expect(previews.again.nextReview.getTime()).toBeGreaterThanOrEqual(now);
    expect(previews.hard.nextReview.getTime()).toBeGreaterThanOrEqual(now);
    expect(previews.good.nextReview.getTime()).toBeGreaterThanOrEqual(now);
    expect(previews.easy.nextReview.getTime()).toBeGreaterThanOrEqual(now);
  });

  it('interval ordering: again < hard < good < easy', () => {
    const p = service.computePreviews(4, 2.5);
    expect(p.again.intervalDays).toBeLessThan(p.hard.intervalDays);
    expect(p.hard.intervalDays).toBeLessThan(p.good.intervalDays);
    expect(p.good.intervalDays).toBeLessThan(p.easy.intervalDays);
  });

  it('human labels are non-empty strings', () => {
    const previews = service.computePreviews(7, 2.5);
    for (const key of ['again', 'hard', 'good', 'easy'] as const) {
      expect(typeof previews[key].human).toBe('string');
      expect(previews[key].human.length).toBeGreaterThan(0);
    }
  });
});
