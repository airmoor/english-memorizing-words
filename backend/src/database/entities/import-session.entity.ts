import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/** Snapshot of a single word that failed enrichment during an import. */
export interface ImportErrorRowSnapshot {
  word: string;
  reason: string;
  clientRowId?: string;
  lineNumber?: number;
}

/**
 * Persistent record of one import execution.
 *
 * Created by ImportService.execute() after each successful call — regardless
 * of whether words were imported or all were duplicates. Acts as a log/audit
 * trail and enables the Import History + failed-row retry UX.
 *
 * Design notes:
 *   - error_rows is JSONB: avoids a join table for display-only snapshot data.
 *   - No FK to cards: the session is a log, not a live relation. Cards may be
 *     deleted independently without affecting session history.
 *   - submitted = imported + skipped + duplicates_ignored + errors (full accounting).
 */
@Entity('import_sessions')
export class ImportSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /**
   * How the words were supplied:
   *   paste — typed/pasted directly into the textarea
   *   csv   — uploaded/dropped .csv or .txt file
   *   anki  — Anki TSV export with column-mapping step
   */
  @Column({ name: 'source_type', type: 'varchar', length: 20, default: 'paste' })
  sourceType: 'paste' | 'csv' | 'anki';

  @Column({ type: 'varchar', length: 20 })
  status: 'completed' | 'partial_failure' | 'no_changes' | 'failed';

  /** Total rows submitted = imported + skipped + duplicatesIgnored + errors */
  @Column({ name: 'submitted', type: 'int' })
  submitted: number;

  @Column({ type: 'int' })
  imported: number;

  @Column({ type: 'int' })
  skipped: number;

  @Column({ name: 'duplicates_ignored', type: 'int' })
  duplicatesIgnored: number;

  @Column({ type: 'int' })
  errors: number;

  /**
   * Snapshot of every word that failed enrichment during this import.
   * Stored as JSONB so failed rows can be displayed and retried without
   * joining to any other table.
   */
  @Column({ name: 'error_rows', type: 'jsonb', default: '[]' })
  errorRows: ImportErrorRowSnapshot[];

  /**
   * Snapshot of word strings successfully imported during this session.
   * Stored as JSONB (array of strings). Capped at MAX_STORED_IMPORTED_WORDS
   * to bound size; the `imported` counter remains the accurate total.
   * Empty array for sessions created before this column existed.
   */
  @Column({ name: 'imported_words', type: 'jsonb', default: '[]' })
  importedWords: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
