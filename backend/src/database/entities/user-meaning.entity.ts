import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Meaning } from './meaning.entity';

@Entity('user_meanings')
@Unique(['userId', 'meaningId'])
@Index(['userId', 'meaningId'])
export class UserMeaning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'meaning_id', type: 'uuid' })
  meaningId: string;

  @Column({
    name: 'saved_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  savedAt: Date;

  @ManyToOne(() => User, (user) => user.userMeanings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Meaning, (meaning) => meaning.userMeanings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meaning_id' })
  meaning: Meaning;
}
