import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { Board } from './board.entity';

/**
 * Explicit many-to-many join between cards and boards.
 * Composite primary key (card_id, board_id) prevents duplicate assignments.
 *
 * No surrogate UUID — the join table has no independent identity beyond
 * the relationship it represents.
 */
@Entity('card_boards')
export class CardBoard {
  @PrimaryColumn({ name: 'card_id', type: 'uuid' })
  cardId: string;

  @PrimaryColumn({ name: 'board_id', type: 'uuid' })
  boardId: string;

  @Column({
    name: 'assigned_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  assignedAt: Date;

  @ManyToOne(() => Card, (card) => card.cardBoards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @ManyToOne(() => Board, (board) => board.cardBoards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Board;
}
