import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'blog_id' })
  blogId: string;

  @Index()
  @Column({ name: 'author_id' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'parent_comment_id', type: 'varchar', nullable: true })
  parentCommentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
