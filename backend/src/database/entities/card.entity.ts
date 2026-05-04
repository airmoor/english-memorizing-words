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
import { Meaning } from './meaning.entity';
import { ReviewLog } from './review-log.entity';

@Entity('cards')
@Unique(['userId', 'meaningId'])
@Index(['userId', 'nextReview'])
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'meaning_id', type: 'uuid' })
  meaningId: string;

  @Column({ name: 'ease_factor', type: 'float', default: 2.5 })
  easeFactor: number;

  @Column({ type: 'int', default: 0 })
  interval: number;

  @Column({ name: 'next_review', type: 'date', default: () => 'CURRENT_DATE' })
  nextReview: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Meaning, (meaning) => meaning.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meaning_id' })
  meaning: Meaning;

  @OneToMany(() => ReviewLog, (log) => log.card)
  reviewLogs: ReviewLog[];
}
