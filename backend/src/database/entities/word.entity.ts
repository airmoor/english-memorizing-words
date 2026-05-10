import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Meaning } from './meaning.entity';
import { UserWord } from './user-word.entity';
import { Card } from './card.entity';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  text: string;

  @Column({ type: 'text', nullable: true })
  transcription: string | null;

  @Column({ type: 'text' })
  provider: 'merriam-webster' | 'free-dictionary';

  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt: Date;

  @OneToMany(() => Meaning, (meaning) => meaning.word)
  meanings: Meaning[];

  @OneToMany(() => UserWord, (uw) => uw.word)
  userWords: UserWord[];

  @OneToMany(() => Card, (card) => card.word)
  cards: Card[];
}
