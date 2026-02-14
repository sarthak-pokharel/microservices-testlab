import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('notification-queue')
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'blog-published':
        this.logger.log(
          `[notification-queue] New blog by authorId=${job.data.authorId}: "${job.data.title}" (blogId=${job.data.blogId})`,
        );
        break;
      default:
        this.logger.warn(`[notification-queue] Unknown job type: ${job.name}`);
    }
  }
}
