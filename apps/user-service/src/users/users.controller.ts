import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @GrpcMethod('UsersService', 'CreateProfile')
  async createProfile(data: { user_id: string; username: string; bio: string; avatar_url: string }) {
    const profile = await this.usersService.createProfile(data.user_id, data.username, data.bio, data.avatar_url);
    return this.toResponse(profile as any);
  }

  @GrpcMethod('UsersService', 'GetUser')
  async getUser(data: { user_id: string }) {
    const profile = await this.usersService.getUser(data.user_id);
    return this.toResponse(profile);
  }

  @GrpcMethod('UsersService', 'UpdateProfile')
  async updateProfile(data: { user_id: string; username: string; bio: string; avatar_url: string }) {
    const profile = await this.usersService.updateProfile(data.user_id, data.username, data.bio, data.avatar_url);
    return this.toResponse(profile);
  }

  @GrpcMethod('UsersService', 'Follow')
  async follow(data: { follower_id: string; following_id: string }) {
    return this.usersService.follow(data.follower_id, data.following_id);
  }

  @GrpcMethod('UsersService', 'Unfollow')
  async unfollow(data: { follower_id: string; following_id: string }) {
    return this.usersService.unfollow(data.follower_id, data.following_id);
  }

  @GrpcMethod('UsersService', 'GetFollowers')
  async getFollowers(data: { user_id: string; page: number; limit: number }) {
    const result = await this.usersService.getFollowers(data.user_id, data.page, data.limit);
    return { users: result.users.map((u) => this.toResponse(u as any)), total: result.total };
  }

  @GrpcMethod('UsersService', 'GetFollowing')
  async getFollowing(data: { user_id: string; page: number; limit: number }) {
    const result = await this.usersService.getFollowing(data.user_id, data.page, data.limit);
    return { users: result.users.map((u) => this.toResponse(u as any)), total: result.total };
  }

  private toResponse(p: {
    userId: string;
    username: string;
    bio: string | null;
    avatarUrl: string | null;
    followersCount?: number;
    followingCount?: number;
  }) {
    return {
      user_id: p.userId,
      username: p.username,
      bio: p.bio ?? '',
      avatar_url: p.avatarUrl ?? '',
      followers_count: p.followersCount ?? 0,
      following_count: p.followingCount ?? 0,
    };
  }
}
