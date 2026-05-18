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
 * The UNIQUE constraint on card_id is enforced at the database level.
 *
 * body is TEXT NOT NULL DEFAULT ''. When the user clears the note, the
 * application layer deletes this row entirely rather than persisting an
 * empty string — empty notes are not intended to persist long-term.
 *
 * Future: may be superseded by a card_blocks table with a type discriminator,
 * supporting multiple typed content blocks per card.
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
