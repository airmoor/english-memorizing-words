import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Word } from './word.entity';
import { UserMeaning } from './user-meaning.entity';
import { Card } from './card.entity';

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

  @ManyToOne(() => Word, (word) => word.meanings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'word_id' })
  word: Word;

  @OneToMany(() => UserMeaning, (um) => um.meaning)
  userMeanings: UserMeaning[];

  @OneToMany(() => Card, (card) => card.meaning)
  cards: Card[];
}
