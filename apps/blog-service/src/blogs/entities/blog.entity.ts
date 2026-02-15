import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum BlogType {
  BLOG = 'BLOG',
  VLOG = 'VLOG',
}

@Entity('blogs')
export class BlogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'author_id' })
  authorId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'media_url', type: 'varchar', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'enum', enum: BlogType, default: BlogType.BLOG })
  type: BlogType;

  @CreateDateColumn({ name: 'published_at' })
  publishedAt: Date;
}
