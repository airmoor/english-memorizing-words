import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Word } from './word.entity';

/**
 * A single sense/definition belonging to a word.
 * Meanings are dictionary data only — they do NOT drive review state.
 * Spaced repetition is tracked on the parent Word via the cards table.
 */
@Entity('meanings')
@Index(['wordId', 'definition', 'partOfSpeech'], { unique: true })
export class Meaning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'word_id', type: 'uuid' })
  wordId: string;

  @Column({ type: 'text' })
  definition: string;

  @Column({ name: 'part_of_speech', type: 'text', nullable: true })
  partOfSpeech: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  synonyms: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  examples: string[];

  @Column({ name: 'sense_number', type: 'text', nullable: true })
  senseNumber: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Word, (word) => word.meanings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word: Word;
}
