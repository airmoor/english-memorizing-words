import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CardBoard } from './card-board.entity';

/**
 * A named, user-owned collection. Cards are linked to boards via CardBoard.
 * Deleting a board cascades to CardBoard rows only — cards are unaffected.
 *
 * name is stored as citext (PostgreSQL case-insensitive text, extension enabled
 * in migration 1747000007000). The UNIQUE(user_id, name) constraint is therefore
 * case-insensitive at the database level. The application layer trims the name
 * before writing to produce consistent stored values.
 */
@Entity('boards')
@Unique(['userId', 'name'])
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'citext' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'color_accent', type: 'text', nullable: true })
  colorAccent: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.boards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CardBoard, (cb) => cb.board)
  cardBoards: CardBoard[];
}
