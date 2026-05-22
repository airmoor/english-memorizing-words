import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { applySmTwo, Rating } from './sm2';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class RatingPreviewDto {
  @ApiProperty({ example: 0 })
  intervalDays: number;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-06-15T00:00:00.000Z' })
  nextReview: Date;

  @ApiProperty({ example: 'In 4 days' })
  human: string;
}

export class RatingPreviewsDto {
  @ApiProperty({ type: RatingPreviewDto })
  again: RatingPreviewDto;

  @ApiProperty({ type: RatingPreviewDto })
  hard: RatingPreviewDto;

  @ApiProperty({ type: RatingPreviewDto })
  good: RatingPreviewDto;

  @ApiProperty({ type: RatingPreviewDto })
  easy: RatingPreviewDto;
}

// ── Humanisation ──────────────────────────────────────────────────────────────
//
// Format table (from review-system.md):
//   past (> 0s overdue)           → "Overdue" | "Overdue by N days"
//   within 10 minutes             → "In a moment"  (covers again's 0-day preview)
//   within next 60 minutes        → "In N min"
//   same calendar day, <24h away  → "Today" | "In N hours"
//   tomorrow                      → "Tomorrow"
//   within next 6 days            → "In N days"
//   within next 4 weeks           → "In N weeks"
//   within next 12 months         → "In N months"
//   more than 12 months away      → "In over a year"

export function humaniseReviewTime(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();

  // ── Past ─────────────────────────────────────────────────────────────────
  if (diffMs < 0) {
    const overdueDays = Math.round(Math.abs(diffMs) / MS_PER_DAY);
    return overdueDays >= 2 ? `Overdue by ${overdueDays} days` : 'Overdue';
  }

  // ── ≤ 10 minutes (covers 0-day SM-2 "again" preview) ─────────────────────
  if (diffMs <= 10 * MS_PER_MIN) {
    return 'In a moment';
  }

  // ── Within 60 minutes ────────────────────────────────────────────────────
  if (diffMs < MS_PER_HOUR) {
    const mins = Math.round(diffMs / MS_PER_MIN);
    return `In ${mins} min`;
  }

  // ── Same calendar day, <24h away ─────────────────────────────────────────
  if (diffMs < MS_PER_DAY) {
    const hours = Math.round(diffMs / MS_PER_HOUR);
    return hours <= 1 ? 'Today' : `In ${hours} hours`;
  }

  // ── Tomorrow ─────────────────────────────────────────────────────────────
  if (diffMs < 2 * MS_PER_DAY) {
    return 'Tomorrow';
  }

  // ── Within 6 days ────────────────────────────────────────────────────────
  if (diffMs < 6 * MS_PER_DAY) {
    const days = Math.round(diffMs / MS_PER_DAY);
    return `In ${days} days`;
  }

  // ── Within 4 weeks ───────────────────────────────────────────────────────
  if (diffMs < 28 * MS_PER_DAY) {
    const weeks = Math.round(diffMs / (7 * MS_PER_DAY));
    return `In ${weeks} week${weeks === 1 ? '' : 's'}`;
  }

  // ── Within 12 months ─────────────────────────────────────────────────────
  if (diffMs < 365 * MS_PER_DAY) {
    const months = Math.round(diffMs / (30 * MS_PER_DAY));
    return `In ${months} month${months === 1 ? '' : 's'}`;
  }

  return 'In over a year';
}

const MS_PER_MIN  = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;
const MS_PER_DAY  = 24 * MS_PER_HOUR;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReviewTimingService {
  /**
   * Pure: no DB access. Simulates all four ratings against the card's current
   * SM-2 state and returns the projected next-review date and human label for each.
   *
   * For `again` (intervalDays → 0) a 10-minute offset is used so the preview
   * reads "In a moment" rather than "Overdue". This matches the SM-2 convention
   * that a forgotten card is shown again very shortly, not literally right now.
   */
  computePreviews(intervalDays: number, easeFactor: number): RatingPreviewsDto {
    const now = new Date();
    const ratings: Rating[] = ['again', 'hard', 'good', 'easy'];
    const result = {} as RatingPreviewsDto;

    for (const rating of ratings) {
      const next = applySmTwo(intervalDays, easeFactor, rating);
      // intervalDays=0 → add 10-minute minimum so humanisation reads "In a moment"
      const offsetMs = next.intervalDays === 0
        ? 10 * MS_PER_MIN
        : next.intervalDays * MS_PER_DAY;
      const nextReview = new Date(now.getTime() + offsetMs);
      result[rating] = {
        intervalDays: next.intervalDays,
        nextReview,
        human: humaniseReviewTime(nextReview, now),
      };
    }

    return result;
  }
}
