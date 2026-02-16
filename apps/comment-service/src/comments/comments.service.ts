import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CommentEntity } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity) private readonly commentRepo: Repository<CommentEntity>,
  ) {}

  async createComment(blogId: string, authorId: string, content: string, parentCommentId?: string) {
    const comment = this.commentRepo.create({
      blogId,
      authorId,
      content,
      parentCommentId: parentCommentId ?? null,
    });
    return this.commentRepo.save(comment);
  }

  async listComments(blogId: string, parentCommentId?: string, page = 1, limit = 20) {
    const where: Record<string, any> = { blogId };
    where['parentCommentId'] = parentCommentId ? parentCommentId : IsNull();

    const [comments, total] = await this.commentRepo.findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { comments, total };
  }

  async deleteComment(commentId: string, authorId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== authorId) throw new ForbiddenException('Not your comment');

    await this.commentRepo.remove(comment);
    return { success: true };
  }
}
