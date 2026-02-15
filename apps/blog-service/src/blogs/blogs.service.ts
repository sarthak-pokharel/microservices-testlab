import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BlogEntity, BlogType } from './entities/blog.entity';

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(BlogEntity) private readonly blogRepo: Repository<BlogEntity>,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  async createBlog(authorId: string, title: string, content: string, mediaUrl?: string, type?: string) {
    const blog = this.blogRepo.create({
      authorId,
      title,
      content,
      mediaUrl: mediaUrl ?? null,
      type: (type as BlogType) ?? BlogType.BLOG,
    });
    const saved = await this.blogRepo.save(blog);

    await this.notificationQueue.add(
      'blog-published',
      { blogId: saved.id, authorId, title },
      { attempts: 3 },
    );

    return saved;
  }

  async getBlog(blogId: string) {
    const blog = await this.blogRepo.findOne({ where: { id: blogId } });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async listBlogs(authorId?: string, page = 1, limit = 20, type?: string) {
    const where: Record<string, any> = {};
    if (authorId) where['authorId'] = authorId;
    if (type) where['type'] = type;

    const [blogs, total] = await this.blogRepo.findAndCount({
      where,
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { blogs, total };
  }

  async updateBlog(blogId: string, authorId: string, title?: string, content?: string, mediaUrl?: string) {
    const blog = await this.blogRepo.findOne({ where: { id: blogId } });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.authorId !== authorId) throw new ForbiddenException('Not your blog');

    if (title) blog.title = title;
    if (content) blog.content = content;
    if (mediaUrl !== undefined) blog.mediaUrl = mediaUrl;

    return this.blogRepo.save(blog);
  }

  async deleteBlog(blogId: string, authorId: string) {
    const blog = await this.blogRepo.findOne({ where: { id: blogId } });
    if (!blog) throw new NotFoundException('Blog not found');
    if (blog.authorId !== authorId) throw new ForbiddenException('Not your blog');

    await this.blogRepo.remove(blog);
    return { success: true };
  }
}
