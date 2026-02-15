import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { BlogsService } from './blogs.service';
import { BlogEntity } from './entities/blog.entity';

@Controller()
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @GrpcMethod('BlogsService', 'CreateBlog')
  async createBlog(data: { author_id: string; title: string; content: string; media_url: string; type: string }) {
    const blog = await this.blogsService.createBlog(data.author_id, data.title, data.content, data.media_url, data.type);
    return this.toResponse(blog);
  }

  @GrpcMethod('BlogsService', 'GetBlog')
  async getBlog(data: { blog_id: string }) {
    const blog = await this.blogsService.getBlog(data.blog_id);
    return this.toResponse(blog);
  }

  @GrpcMethod('BlogsService', 'ListBlogs')
  async listBlogs(data: { author_id: string; page: number; limit: number; type: string }) {
    const result = await this.blogsService.listBlogs(data.author_id, data.page, data.limit, data.type);
    return { blogs: result.blogs.map((b) => this.toResponse(b)), total: result.total };
  }

  @GrpcMethod('BlogsService', 'UpdateBlog')
  async updateBlog(data: { blog_id: string; author_id: string; title: string; content: string; media_url: string }) {
    const blog = await this.blogsService.updateBlog(data.blog_id, data.author_id, data.title, data.content, data.media_url);
    return this.toResponse(blog);
  }

  @GrpcMethod('BlogsService', 'DeleteBlog')
  async deleteBlog(data: { blog_id: string; author_id: string }) {
    return this.blogsService.deleteBlog(data.blog_id, data.author_id);
  }

  private toResponse(b: BlogEntity) {
    return {
      blog_id: b.id,
      author_id: b.authorId,
      title: b.title,
      content: b.content,
      media_url: b.mediaUrl ?? '',
      type: b.type,
      published_at: b.publishedAt.toISOString(),
    };
  }
}
