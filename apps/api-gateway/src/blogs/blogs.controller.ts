import { Controller, Get, Post, Put, Delete, Param, Body, Query, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CurrentUser, CurrentUserPayload, Public } from '@app/common';

interface BlogsGrpc {
  createBlog(data: object): Observable<object>;
  getBlog(data: object): Observable<object>;
  listBlogs(data: object): Observable<object>;
  updateBlog(data: object): Observable<object>;
  deleteBlog(data: object): Observable<object>;
}

@Controller('blogs')
export class BlogsController {
  private blogsGrpc: BlogsGrpc;

  constructor(@Inject('BLOG_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.blogsGrpc = this.client.getService<BlogsGrpc>('BlogsService');
  }

  @Post()
  create(@Body() dto: CreateBlogDto, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(
      this.blogsGrpc.createBlog({
        author_id: user.userId,
        title: dto.title,
        content: dto.content,
        media_url: dto.mediaUrl ?? '',
        type: dto.type ?? 'BLOG',
      }),
    );
  }

  @Public()
  @Get()
  list(@Query('authorId') authorId: string, @Query('page') page = '1', @Query('limit') limit = '20', @Query('type') type: string) {
    return lastValueFrom(
      this.blogsGrpc.listBlogs({ author_id: authorId ?? '', page: +page, limit: +limit, type: type ?? '' }),
    );
  }

  @Public()
  @Get(':blogId')
  get(@Param('blogId') blogId: string) {
    return lastValueFrom(this.blogsGrpc.getBlog({ blog_id: blogId }));
  }

  @Put(':blogId')
  update(@Param('blogId') blogId: string, @Body() dto: UpdateBlogDto, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(
      this.blogsGrpc.updateBlog({
        blog_id: blogId,
        author_id: user.userId,
        title: dto.title ?? '',
        content: dto.content ?? '',
        media_url: dto.mediaUrl ?? '',
      }),
    );
  }

  @Delete(':blogId')
  @HttpCode(HttpStatus.OK)
  delete(@Param('blogId') blogId: string, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(this.blogsGrpc.deleteBlog({ blog_id: blogId, author_id: user.userId }));
  }
}
