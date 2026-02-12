import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';
import { trace } from '@opentelemetry/api';
import { UserEntity } from './entities/user.entity';

const tracer = trace.getTracer('auth-service');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await tracer.startActiveSpan('bcrypt.hash', async (span) => {
      try {
        return await bcrypt.hash(password, 10);
      } finally {
        span.end();
      }
    });
    const user = this.userRepo.create({ email, passwordHash });
    await this.userRepo.save(user);

    await this.emailQueue.add('welcome', { userId: user.id, email }, { attempts: 3 });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, userId: user.id };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await tracer.startActiveSpan('bcrypt.compare', async (span) => {
      try {
        return await bcrypt.compare(password, user.passwordHash);
      } finally {
        span.end();
      }
    });
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, userId: user.id };
  }

  async logout(userId: string) {
    await this.userRepo.update(userId, { hashedRefreshToken: null });
    return { success: true };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) throw new UnauthorizedException('Access denied');

    const valid = await tracer.startActiveSpan('bcrypt.compare', async (span) => {
      try {
        return await bcrypt.compare(refreshToken, user.hashedRefreshToken);
      } finally {
        span.end();
      }
    });
    if (!valid) throw new UnauthorizedException('Access denied');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, userId: user.id };
  }

  async validateToken(accessToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(accessToken, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      return { valid: true, userId: payload.sub, email: payload.email };
    } catch {
      return { valid: false, userId: '', email: '' };
    }
  }

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: this.config.get<string>('JWT_ACCESS_SECRET'), expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: this.config.get<string>('JWT_REFRESH_SECRET'), expiresIn: '7d' },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const hashed = await tracer.startActiveSpan('bcrypt.hash (refresh-token)', async (span) => {
      try {
        return await bcrypt.hash(refreshToken, 10);
      } finally {
        span.end();
      }
    });
    await this.userRepo.update(userId, { hashedRefreshToken: hashed });
  }
}
