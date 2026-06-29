import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TranslationProvider } from '../enums/translation-provider.enum';
import { Word } from './word.entity';

/**
 * A translation of a canonical Word into one language.
 *
 * Cached forever once written: the external translation API is queried only when
 * no row exists for (word, language). Translations are shared across all users —
 * `apple → яблоко` is fetched once and reused for every `ru` speaker.
 *
 * One row per (word_id, language_code) by design (see UNIQUE below). Multiple
 * variants per language are a future extension (drop the unique, add is_primary).
 */
@Entity('word_translations')
@Index(['wordId', 'languageCode'], { unique: true })
export class WordTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'word_id', type: 'uuid' })
  wordId: string;

  /** ISO 639-1 language code, lowercased: 'ru', 'uk', 'de', 'es', 'fr', 'ja'. */
  @Column({ name: 'language_code', type: 'text' })
  languageCode: string;

  /** The translated text. citext → case-insensitive, consistent with words.text. */
  @Column({ type: 'citext' })
  text: string;

  @Column({
    type: 'enum',
    enum: TranslationProvider,
    enumName: 'translation_provider',
  })
  provider: TranslationProvider;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Word, (word) => word.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word: Word;
}
