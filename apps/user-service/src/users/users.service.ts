import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from './entities/profile.entity';
import { FollowEntity } from './entities/follow.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(ProfileEntity) private readonly profileRepo: Repository<ProfileEntity>,
    @InjectRepository(FollowEntity) private readonly followRepo: Repository<FollowEntity>,
  ) {}

  async createProfile(userId: string, username: string, bio?: string, avatarUrl?: string) {
    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Profile already exists');

    const profile = this.profileRepo.create({ userId, username, bio: bio ?? null, avatarUrl: avatarUrl ?? null });
    return this.profileRepo.save(profile);
  }

  async getUser(userId: string) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('User not found');

    const [followersCount, followingCount] = await Promise.all([
      this.followRepo.count({ where: { followingId: userId } }),
      this.followRepo.count({ where: { followerId: userId } }),
    ]);
    return { ...profile, followersCount, followingCount };
  }

  async updateProfile(userId: string, username?: string, bio?: string, avatarUrl?: string) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('User not found');

    if (username) profile.username = username;
    if (bio !== undefined) profile.bio = bio;
    if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;

    await this.profileRepo.save(profile);
    return this.getUser(userId);
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new ConflictException('Cannot follow yourself');
    const existing = await this.followRepo.findOne({ where: { followerId, followingId } });
    if (existing) return { success: true };

    const follow = this.followRepo.create({ followerId, followingId });
    await this.followRepo.save(follow);
    return { success: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.followRepo.delete({ followerId, followingId });
    return { success: true };
  }

  async getFollowers(userId: string, page = 1, limit = 20) {
    const [rows, total] = await this.followRepo.findAndCount({
      where: { followingId: userId },
      skip: (page - 1) * limit,
      take: limit,
    });
    const users = await Promise.all(rows.map((r) => this.getUser(r.followerId).catch(() => null)));
    return { users: users.filter(Boolean), total };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    const [rows, total] = await this.followRepo.findAndCount({
      where: { followerId: userId },
      skip: (page - 1) * limit,
      take: limit,
    });
    const users = await Promise.all(rows.map((r) => this.getUser(r.followingId).catch(() => null)));
    return { users: users.filter(Boolean), total };
  }
}
