import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Card } from './card.entity';

/**
 * User-authored plain-text note for a card. One note per card maximum.
 * The unique constraint on card_id is enforced at the database level.
 *
 * body is stored as TEXT NOT NULL DEFAULT '' rather than nullable.
 * An empty body after trim signals deletion — the application layer
 * deletes the row rather than persisting an empty string.
 *
 * Future: may be superseded by a card_blocks table with a type discriminator,
 * supporting multiple content blocks per card.
 */
@Entity('card_notes')
export class CardNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id', type: 'uuid', unique: true })
  cardId: string;

  @Column({ type: 'text', default: '' })
  body: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Card, (card) => card.note, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;
}
