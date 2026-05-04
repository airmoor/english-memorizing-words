import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Meaning } from './meaning.entity';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  text: string;

  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt: Date;

  @OneToMany(() => Meaning, (meaning) => meaning.word)
  meanings: Meaning[];
}
