import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DictionaryProvider } from '../enums/dictionary-provider.enum';
import { Meaning } from './meaning.entity';
import { UserWord } from './user-word.entity';
import { Card } from './card.entity';
import { WordTranslation } from './word-translation.entity';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Stored as citext in PostgreSQL (extension enabled in migration 1747000007000).
   * Lookups are case-insensitive at the DB level via the citext operator class.
   */
  @Column({ type: 'citext', unique: true })
  text: string;

  @Column({ type: 'text', nullable: true })
  transcription: string | null;

  @Column({
    type: 'enum',
    enum: DictionaryProvider,
    enumName: 'dictionary_provider',
  })
  provider: DictionaryProvider;

  @Column({ name: 'fetched_at', type: 'timestamptz', default: () => 'NOW()' })
  fetchedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Meaning, (meaning) => meaning.word)
  meanings: Meaning[];

  @OneToMany(() => UserWord, (uw) => uw.word)
  userWords: UserWord[];

  @OneToMany(() => Card, (card) => card.word)
  cards: Card[];

  @OneToMany(() => WordTranslation, (translation) => translation.word)
  translations: WordTranslation[];
}
