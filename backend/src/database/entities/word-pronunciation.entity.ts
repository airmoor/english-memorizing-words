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
import { PronunciationProvider } from '../enums/pronunciation-provider.enum';
import { PronunciationAccent } from '../enums/pronunciation-accent.enum';
import { Word } from './word.entity';

/**
 * A pronunciation recording of a canonical Word in one accent.
 *
 * Cached forever once written: the external TTS provider (Amazon Polly) is
 * called only when no row exists for (word, accent). Audio is synthesized once
 * and reused for every user — `apple/us` is generated a single time. The bytes
 * live in object storage (S3 / MinIO); this row stores the metadata + the public
 * URL we serve to clients.
 *
 * One row per (word_id, accent) by design (see UNIQUE below) — same shape as
 * WordTranslation's one-per-language. Multiple voices per accent are a future
 * extension (drop the unique, add is_primary).
 *
 * The audio file fields (storage_key, audio_url, content_hash, license…) are
 * inlined here for the MVP. Splitting them into a shared `audio_assets` table
 * (to dedup identical files across words/senses) is a non-destructive future
 * migration — see docs/audio-pronunciation-research.md.
 */
@Entity('word_pronunciations')
@Index(['wordId', 'accent'], { unique: true })
export class WordPronunciation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'word_id', type: 'uuid' })
  wordId: string;

  @Column({
    type: 'enum',
    enum: PronunciationAccent,
    enumName: 'pronunciation_accent',
  })
  accent: PronunciationAccent;

  @Column({
    type: 'enum',
    enum: PronunciationProvider,
    enumName: 'pronunciation_provider',
  })
  provider: PronunciationProvider;

  /** TTS voice id (e.g. 'Joanna'). NULL for human recordings. */
  @Column({ type: 'text', nullable: true })
  voice: string | null;

  /** True for real human recordings; false for TTS. Lets us prefer human later. */
  @Column({ name: 'is_human', type: 'boolean', default: false })
  isHuman: boolean;

  /** Object key in S3 / MinIO, e.g. 'pronunciations/us/amazon-polly/apple-joanna.mp3'. */
  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  /** Public / CDN URL served to clients. */
  @Column({ name: 'audio_url', type: 'text' })
  audioUrl: string;

  @Column({ type: 'text', default: 'mp3' })
  format: string;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ name: 'file_size_bytes', type: 'integer', nullable: true })
  fileSizeBytes: number | null;

  /** sha256 of the audio bytes — integrity check and future cross-word dedup. */
  @Column({ name: 'content_hash', type: 'text' })
  contentHash: string;

  /**
   * License under which we hold the audio, e.g. 'amazon-polly-tos', 'CC0',
   * 'CC-BY-SA-4.0'. Mandatory for legal defensibility once human-voice sources
   * (Wikimedia) are mixed in.
   */
  @Column({ type: 'text' })
  license: string;

  /** Required credit for CC-BY-SA sources; NULL for Polly/CC0. */
  @Column({ type: 'text', nullable: true })
  attribution: string | null;

  /** Where the audio came from (audit trail), e.g. the Commons file page. */
  @Column({ name: 'source_ref_url', type: 'text', nullable: true })
  sourceRefUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Word, (word) => word.pronunciations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word: Word;
}
