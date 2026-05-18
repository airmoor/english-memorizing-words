import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CardTag } from './card-tag.entity';

/**
 * A lightweight, user-scoped label applied to cards for filtering.
 * Tags carry no structural weight — they are descriptive metadata only.
 *
 * name is stored as citext (case-insensitive). The application layer
 * additionally normalises names to lowercase before writing so that
 * stored values are consistent regardless of DB collation.
 */
@Entity('tags')
@Unique(['userId', 'name'])
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CardTag, (ct) => ct.tag)
  cardTags: CardTag[];
}
