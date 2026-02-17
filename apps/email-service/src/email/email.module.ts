import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailWorker } from '../workers/email.worker';

@Module({
  imports: [BullModule.registerQueue({ name: 'email-queue' })],
  controllers: [EmailController],
  providers: [EmailService, EmailWorker],
})
export class EmailModule {}
