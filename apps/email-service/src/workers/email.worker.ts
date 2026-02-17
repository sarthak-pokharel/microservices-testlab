import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';

@Processor('email-queue')
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case 'send':
          await this.emailService.send({
            to: job.data.to,
            subject: job.data.subject,
            body_html: job.data.body_html,
            body_text: job.data.body_text,
          });
          break;
        case 'welcome':
          await this.emailService.send(this.emailService.buildWelcomeEmail(job.data.email));
          break;
        case 'password-reset':
          await this.emailService.send(
            this.emailService.buildPasswordResetEmail(job.data.email, job.data.resetLink ?? '#'),
          );
          break;
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to process job "${job.name}" for ${job.data.email}: ${err?.message ?? err}`);
      if (err?.response?.body) {
        this.logger.error(`SendGrid error: ${JSON.stringify(err.response.body)}`);
      }
      throw err;
    }
  }
}
