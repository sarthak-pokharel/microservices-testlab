import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CommentsService } from './comments.service';
import { CommentEntity } from './entities/comment.entity';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @GrpcMethod('CommentsService', 'CreateComment')
  async createComment(data: { blog_id: string; author_id: string; content: string; parent_comment_id: string }) {
    const comment = await this.commentsService.createComment(
      data.blog_id,
      data.author_id,
      data.content,
      data.parent_comment_id || undefined,
    );
    return this.toResponse(comment);
  }

  @GrpcMethod('CommentsService', 'ListComments')
  async listComments(data: { blog_id: string; parent_comment_id: string; page: number; limit: number }) {
    const result = await this.commentsService.listComments(
      data.blog_id,
      data.parent_comment_id || undefined,
      data.page,
      data.limit,
    );
    return { comments: result.comments.map((c) => this.toResponse(c)), total: result.total };
  }

  @GrpcMethod('CommentsService', 'DeleteComment')
  async deleteComment(data: { comment_id: string; author_id: string }) {
    return this.commentsService.deleteComment(data.comment_id, data.author_id);
  }

  private toResponse(c: CommentEntity) {
    return {
      comment_id: c.id,
      blog_id: c.blogId,
      author_id: c.authorId,
      content: c.content,
      parent_comment_id: c.parentCommentId ?? '',
      created_at: c.createdAt.toISOString(),
    };
  }
}
