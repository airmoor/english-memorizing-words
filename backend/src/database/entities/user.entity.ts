import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserWord } from './user-word.entity';
import { Card } from './card.entity';
import { Board } from './board.entity';
import { Tag } from './tag.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  /**
   * ISO 639-1 code of the user's native language ('ru', 'uk', …).
   * Drives which translation the UI surfaces on cards. NULL = not chosen yet.
   */
  @Column({ name: 'native_language_code', type: 'text', nullable: true })
  nativeLanguageCode: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => UserWord, (uw) => uw.user)
  userWords: UserWord[];

  @OneToMany(() => Card, (card) => card.user)
  cards: Card[];

  @OneToMany(() => Board, (board) => board.user)
  boards: Board[];

  @OneToMany(() => Tag, (tag) => tag.user)
  tags: Tag[];
}
