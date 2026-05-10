import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Word } from './word.entity';
import { ReviewLog } from './review-log.entity';

/**
 * One card per (user, word) pair.
 * Spaced-repetition state belongs to the canonical word — not to a sense/meaning.
 * Updating or refreshing dictionary meanings never resets learning progress.
 */
@Entity('cards')
@Unique(['userId', 'wordId'])
@Index(['userId', 'nextReview'])
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'word_id', type: 'uuid' })
  wordId: string;

  @Column({ name: 'ease_factor', type: 'float', default: 2.5 })
  easeFactor: number;

  /** Number of days until next scheduled review. Renamed from `interval` for clarity. */
  @Column({ name: 'interval_days', type: 'int', default: 0 })
  intervalDays: number;

  /** Stored as timestamptz for timezone-safe scheduling. */
  @Column({ name: 'next_review', type: 'timestamptz', default: () => 'NOW()' })
  nextReview: Date;

  /**
   * Populated on every review submission.
   * Null for cards that have never been reviewed (newly added).
   * Required for future FSRS stability calculations.
   */
  @Column({ name: 'last_reviewed_at', type: 'timestamptz', nullable: true })
  lastReviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Word, (word) => word.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word: Word;

  @OneToMany(() => ReviewLog, (log) => log.card)
  reviewLogs: ReviewLog[];
}
