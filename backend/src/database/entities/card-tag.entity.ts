import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { Tag } from './tag.entity';

/**
 * Explicit many-to-many join between cards and tags.
 * Mirrors the structure of card_boards.
 *
 * Composite PK (card_id, tag_id) prevents duplicate tag assignments.
 */
@Entity('card_tags')
export class CardTag {
  @PrimaryColumn({ name: 'card_id', type: 'uuid' })
  cardId: string;

  @PrimaryColumn({ name: 'tag_id', type: 'uuid' })
  tagId: string;

  @Column({
    name: 'assigned_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  assignedAt: Date;

  @ManyToOne(() => Card, (card) => card.cardTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @ManyToOne(() => Tag, (tag) => tag.cardTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
