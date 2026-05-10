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

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Stored as citext in PostgreSQL — lookups are case-insensitive at the DB level.
   * TypeORM sees it as text; the actual column type is managed via migrations.
   */
  @Column({ type: 'text', unique: true })
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
}
