import { Controller, Get, Post, Delete, Param, Body, Query, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser, CurrentUserPayload, Public } from '@app/common';

interface CommentsGrpc {
  createComment(data: object): Observable<object>;
  listComments(data: object): Observable<object>;
  deleteComment(data: object): Observable<object>;
}

@Controller('blogs/:blogId/comments')
export class CommentsController {
  private commentsGrpc: CommentsGrpc;

  constructor(@Inject('COMMENT_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.commentsGrpc = this.client.getService<CommentsGrpc>('CommentsService');
  }

  @Post()
  create(@Param('blogId') blogId: string, @Body() dto: CreateCommentDto, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(
      this.commentsGrpc.createComment({
        blog_id: blogId,
        author_id: user.userId,
        content: dto.content,
        parent_comment_id: dto.parentCommentId ?? '',
      }),
    );
  }

  @Public()
  @Get()
  list(
    @Param('blogId') blogId: string,
    @Query('parentCommentId') parentCommentId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return lastValueFrom(
      this.commentsGrpc.listComments({ blog_id: blogId, parent_comment_id: parentCommentId ?? '', page: +page, limit: +limit }),
    );
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  delete(@Param('commentId') commentId: string, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(this.commentsGrpc.deleteComment({ comment_id: commentId, author_id: user.userId }));
  }
}
