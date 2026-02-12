import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: { email: string; password: string }) {
    const result = await this.authService.register(data.email, data.password);
    return {
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user_id: result.userId,
    };
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: { email: string; password: string }) {
    const result = await this.authService.login(data.email, data.password);
    return {
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user_id: result.userId,
    };
  }

  @GrpcMethod('AuthService', 'Logout')
  async logout(data: { user_id: string }) {
    return this.authService.logout(data.user_id);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(data: { user_id: string; refresh_token: string }) {
    const result = await this.authService.refreshToken(data.user_id, data.refresh_token);
    return {
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user_id: result.userId,
    };
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(data: { access_token: string }) {
    const result = await this.authService.validateToken(data.access_token);
    return {
      valid: result.valid,
      user_id: result.userId,
      email: result.email,
    };
  }
}
