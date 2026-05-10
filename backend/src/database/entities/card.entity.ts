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

  @Column({ type: 'int', default: 0 })
  interval: number;

  @Column({ name: 'next_review', type: 'date', default: () => 'CURRENT_DATE' })
  nextReview: Date;

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
