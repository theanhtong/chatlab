import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body('phone') phone: string) {
    return this.authService.requestOtp(phone);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body('phone') phone: string, @Body('code') code: string) {
    return this.authService.verifyOtp(phone, code);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const deviceInfo = `${userAgent || 'unknown'} (${ip})`;
    return this.authService.login(loginDto, deviceInfo);
  }

  @Post('refresh')
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const ip = req.ip || req.connection.remoteAddress || '';
    const deviceInfo = `${userAgent || 'unknown'} (${ip})`;
    return this.authService.refresh(refreshToken, deviceInfo);
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.logout(refreshToken);
  }
}
