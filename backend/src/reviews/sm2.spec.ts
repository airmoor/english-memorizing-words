import { applySmTwo } from './sm2';

describe('applySmTwo', () => {
  const DEFAULT_EF = 2.5;

  describe('again', () => {
    it('resets intervalDays to 0', () => {
      const r = applySmTwo(10, DEFAULT_EF, 'again');
      expect(r.intervalDays).toBe(0);
    });

    it('decrements easeFactor by 0.2', () => {
      const r = applySmTwo(10, 2.5, 'again');
      expect(r.easeFactor).toBeCloseTo(2.3);
    });

    it('floors easeFactor at 1.3 when already low', () => {
      const r = applySmTwo(0, 1.4, 'again');
      expect(r.easeFactor).toBeCloseTo(1.3);
    });

    it('does not go below 1.3 even when ef is exactly at floor', () => {
      const r = applySmTwo(0, 1.3, 'again');
      expect(r.easeFactor).toBeCloseTo(1.3);
    });
  });

  describe('hard', () => {
    it('multiplies interval by 1.2 and rounds', () => {
      const r = applySmTwo(10, DEFAULT_EF, 'hard');
      expect(r.intervalDays).toBe(12);
    });

    it('ensures intervalDays is at least 1 when starting from 0', () => {
      const r = applySmTwo(0, DEFAULT_EF, 'hard');
      expect(r.intervalDays).toBe(1);
    });

    it('decrements easeFactor by 0.15', () => {
      const r = applySmTwo(10, 2.5, 'hard');
      expect(r.easeFactor).toBeCloseTo(2.35);
    });

    it('floors easeFactor at 1.3', () => {
      const r = applySmTwo(10, 1.35, 'hard');
      expect(r.easeFactor).toBeCloseTo(1.3);
    });
  });

  describe('good', () => {
    it('uses intervalDays=1 when starting from 0', () => {
      const r = applySmTwo(0, DEFAULT_EF, 'good');
      expect(r.intervalDays).toBe(1);
    });

    it('multiplies interval by easeFactor and rounds', () => {
      const r = applySmTwo(4, 2.5, 'good');
      expect(r.intervalDays).toBe(10);
    });

    it('does not change easeFactor', () => {
      const r = applySmTwo(4, DEFAULT_EF, 'good');
      expect(r.easeFactor).toBe(DEFAULT_EF);
    });
  });

  describe('easy', () => {
    it('uses intervalDays=2 when starting from 0', () => {
      const r = applySmTwo(0, DEFAULT_EF, 'easy');
      expect(r.intervalDays).toBe(2);
    });

    it('multiplies interval by easeFactor * 1.3 and rounds', () => {
      const r = applySmTwo(4, 2.5, 'easy');
      expect(r.intervalDays).toBe(13);
    });

    it('increments easeFactor by 0.15', () => {
      const r = applySmTwo(4, 2.5, 'easy');
      expect(r.easeFactor).toBeCloseTo(2.65);
    });
  });
});
