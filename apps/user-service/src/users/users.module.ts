import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ProfileEntity } from './entities/profile.entity';
import { FollowEntity } from './entities/follow.entity';
import { NotificationWorker } from '../workers/notification.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileEntity, FollowEntity]),
    BullModule.registerQueue({ name: 'notification-queue' }),
  ],
  controllers: [UsersController],
  providers: [UsersService, NotificationWorker],
})
export class UsersModule {}
