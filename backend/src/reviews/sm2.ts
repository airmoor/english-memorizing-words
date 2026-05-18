export type Rating = 'again' | 'hard' | 'good' | 'easy';

export function applySmTwo(
  intervalDays: number,
  easeFactor: number,
  rating: Rating,
): { intervalDays: number; easeFactor: number } {
  switch (rating) {
    case 'again':
      return { intervalDays: 0, easeFactor: Math.max(1.3, easeFactor - 0.2) };

    case 'hard':
      return {
        intervalDays: Math.max(1, Math.round(intervalDays * 1.2)),
        easeFactor: Math.max(1.3, easeFactor - 0.15),
      };

    case 'good':
      return {
        intervalDays: intervalDays === 0 ? 1 : Math.round(intervalDays * easeFactor),
        easeFactor,
      };

    case 'easy':
      return {
        intervalDays: intervalDays === 0 ? 2 : Math.round(intervalDays * easeFactor * 1.3),
        easeFactor: easeFactor + 0.15,
      };

    default: {
      const exhaustive: never = rating;
      throw new Error(`Unsupported rating: ${exhaustive}`);
    }
  }
}
