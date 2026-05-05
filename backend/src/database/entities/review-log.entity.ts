import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from './card.entity';

export type Rating = 'again' | 'hard' | 'good' | 'easy';

@Entity('review_logs')
@Check(`rating IN ('again', 'hard', 'good', 'easy')`)
export class ReviewLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id', type: 'uuid' })
  cardId: string;

  @Column({ type: 'text' })
  rating: Rating;

  @Column({
    name: 'reviewed_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  reviewedAt: Date;

  @ManyToOne(() => Card, (card) => card.reviewLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;
}
