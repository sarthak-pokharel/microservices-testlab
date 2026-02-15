import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { BlogEntity } from './entities/blog.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlogEntity]),
    BullModule.registerQueue({ name: 'notification-queue' }),
  ],
  controllers: [BlogsController],
  providers: [BlogsService],
})
export class BlogsModule {}
