import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Word } from './word.entity';

/**
 * Represents a word the user has saved to their vocabulary.
 * The learning unit is the canonical word — not an individual sense/meaning.
 */
@Entity('user_words')
@Unique(['userId', 'wordId'])
export class UserWord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'word_id', type: 'uuid' })
  wordId: string;

  @Column({
    name: 'saved_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  savedAt: Date;

  /**
   * Subset of meaning IDs the user selected when saving.
   * NULL = all meanings (backwards-compatible default).
   * Non-null = only these meaning IDs are displayed on the vocabulary card.
   */
  @Column({
    name: 'selected_meaning_ids',
    type: 'uuid',
    array: true,
    nullable: true,
    default: null,
  })
  selectedMeaningIds: string[] | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Word, (word) => word.userWords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word: Word;
}
