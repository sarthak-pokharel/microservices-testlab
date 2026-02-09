import { Controller, Get, Post, Put, Param, Body, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser, CurrentUserPayload } from '@app/common';

interface UsersGrpc {
  createProfile(data: object): Observable<object>;
  getUser(data: object): Observable<object>;
  updateProfile(data: object): Observable<object>;
  follow(data: object): Observable<object>;
  unfollow(data: object): Observable<object>;
  getFollowers(data: object): Observable<object>;
  getFollowing(data: object): Observable<object>;
}

@Controller('users')
export class UsersController {
  private usersGrpc: UsersGrpc;

  constructor(@Inject('USER_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.usersGrpc = this.client.getService<UsersGrpc>('UsersService');
  }

  @Post('profile')
  createProfile(@Body() dto: CreateProfileDto, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(
      this.usersGrpc.createProfile({ user_id: user.userId, username: dto.username, bio: dto.bio ?? '', avatar_url: dto.avatarUrl ?? '' }),
    );
  }

  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(this.usersGrpc.getUser({ user_id: user.userId }));
  }

  @Get(':userId')
  getUser(@Param('userId') userId: string) {
    return lastValueFrom(this.usersGrpc.getUser({ user_id: userId }));
  }

  @Put('profile')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(
      this.usersGrpc.updateProfile({ user_id: user.userId, username: dto.username ?? '', bio: dto.bio ?? '', avatar_url: dto.avatarUrl ?? '' }),
    );
  }

  @Post(':userId/follow')
  @HttpCode(HttpStatus.OK)
  follow(@Param('userId') followingId: string, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(this.usersGrpc.follow({ follower_id: user.userId, following_id: followingId }));
  }

  @Post(':userId/unfollow')
  @HttpCode(HttpStatus.OK)
  unfollow(@Param('userId') followingId: string, @CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(this.usersGrpc.unfollow({ follower_id: user.userId, following_id: followingId }));
  }

  @Get(':userId/followers')
  getFollowers(@Param('userId') userId: string) {
    return lastValueFrom(this.usersGrpc.getFollowers({ user_id: userId, page: 1, limit: 20 }));
  }

  @Get(':userId/following')
  getFollowing(@Param('userId') userId: string) {
    return lastValueFrom(this.usersGrpc.getFollowing({ user_id: userId, page: 1, limit: 20 }));
  }
}
