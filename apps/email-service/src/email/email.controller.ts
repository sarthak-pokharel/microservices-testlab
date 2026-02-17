import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

interface SendEmailRequest {
  to: string;
  subject: string;
  body_html: string;
  body_text?: string;
  template?: string;
}

@Controller()
export class EmailController {
  constructor(@InjectQueue('email-queue') private readonly emailQueue: Queue) {}

  @GrpcMethod('EmailService', 'SendEmail')
  async sendEmail(data: SendEmailRequest) {
    await this.emailQueue.add('send', {
      to: data.to,
      subject: data.subject,
      body_html: data.body_html,
      body_text: data.body_text,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    return { success: true, message: 'Email queued for delivery' };
  }
}
