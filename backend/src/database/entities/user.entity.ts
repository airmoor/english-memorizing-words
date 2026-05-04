import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserMeaning } from './user-meaning.entity';
import { Card } from './card.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => UserMeaning, (um) => um.user)
  userMeanings: UserMeaning[];

  @OneToMany(() => Card, (card) => card.user)
  cards: Card[];
}
