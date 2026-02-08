import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '@app/common';
import { CurrentUser, CurrentUserPayload } from '@app/common';

interface AuthGrpc {
  register(data: object): Observable<any>;
  login(data: object): Observable<object>;
  logout(data: object): Observable<object>;
  refreshToken(data: object): Observable<object>;
}

interface UsersGrpc {
  createProfile(data: object): Observable<object>;
}

@Controller('auth')
export class AuthController {
  private authGrpc: AuthGrpc;
  private usersGrpc: UsersGrpc;

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientGrpc,
    @Inject('USER_SERVICE') private readonly userClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.authGrpc = this.authClient.getService<AuthGrpc>('AuthService');
    this.usersGrpc = this.userClient.getService<UsersGrpc>('UsersService');
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await lastValueFrom(
      this.authGrpc.register({ email: dto.email, password: dto.password }),
    );
    // Auto-create a profile using the email prefix as default username
    const username = dto.email.split('@')[0];
    await lastValueFrom(
      this.usersGrpc.createProfile({ user_id: result.user_id, username }),
    ).catch((err) => {
      console.error('[register] failed to auto-create profile:', err?.details ?? err?.message ?? err);
    });
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return lastValueFrom(this.authGrpc.login({ email: dto.email, password: dto.password }));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: CurrentUserPayload) {
    return lastValueFrom(this.authGrpc.logout({ user_id: user.userId }));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return lastValueFrom(
      this.authGrpc.refreshToken({ user_id: dto.userId, refresh_token: dto.refreshToken }),
    );
  }
}
