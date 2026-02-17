import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body_html: string;
  body_text?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('EMAIL_FROM') ?? user ?? 'noreply@example.com';
    this.enabled = !!host && !!user && user !== 'your@gmail.com';
    this.enabled = config.get<string>('STRICTLYDISABLEEMAILS') === "yes" ? false : this.enabled;

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(config.get('SMTP_PORT') ?? 587),
        secure: config.get('SMTP_SECURE') === 'true',
        auth: {
          user,
          pass: config.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  async onModuleInit() {
    if (this.enabled) {
      try {
        await this.transporter.verify();
        this.logger.log('SMTP connection verified');
      } catch (err: any) {
        this.logger.error(`SMTP verification failed: ${err.message}`);
      }
    }
  }

  async send(opts: SendEmailOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`[DRY-RUN] To: ${opts.to} | Subject: ${opts.subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.body_html,
      text: opts.body_text ?? opts.body_html.replace(/<[^>]+>/g, ''),
    });
    this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
  }

  buildWelcomeEmail(email: string): SendEmailOptions {
    return {
      to: email,
      subject: 'Welcome to Vlogging!',
      body_html: `<h1>Welcome!</h1><p>Thanks for signing up, ${email}.</p>`,
    };
  }

  buildPasswordResetEmail(email: string, resetLink: string): SendEmailOptions {
    return {
      to: email,
      subject: 'Reset your password',
      body_html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    };
  }
}
