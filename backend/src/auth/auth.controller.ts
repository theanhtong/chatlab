import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as express from 'express';

function extractRefreshToken(req: any): string | null {
  if (!req.headers.cookie) return null;
  const cookies = req.headers.cookie.split(';').reduce((acc: any, c: string) => {
    const parts = c.trim().split('=');
    const name = parts[0];
    const val = parts.slice(1).join('=');
    acc[name] = val;
    return acc;
  }, {});
  return cookies['refreshToken'] || null;
}

function setRefreshTokenCookie(res: express.Response, token: string | null) {
  const isProd = process.env.NODE_ENV === 'production';
  if (!token) {
    res.setHeader(
      'Set-Cookie',
      `refreshToken=; HttpOnly; ${isProd ? 'Secure;' : ''} SameSite=Lax; Path=/auth; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `refreshToken=${token}; HttpOnly; ${isProd ? 'Secure;' : ''} SameSite=Lax; Path=/auth; Max-Age=${7 * 24 * 60 * 60}`
    );
  }
}

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
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const deviceInfo = `${userAgent || 'unknown'} (${ip})`;
    
    const result = await this.authService.login(loginDto, deviceInfo);
    setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const ip = req.ip || req.connection.remoteAddress || '';
    const deviceInfo = `${userAgent || 'unknown'} (${ip})`;
    
    const result = await this.authService.refresh(refreshToken, deviceInfo);
    
    // Set rotated refresh token cookie if rotation happened
    if (result.refreshToken) {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const refreshToken = extractRefreshToken(req);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    setRefreshTokenCookie(res, null);
    return { success: true };
  }
}
