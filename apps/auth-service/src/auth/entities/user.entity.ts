import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'hashed_refresh_token', nullable: true, type: 'text' })
  hashedRefreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
