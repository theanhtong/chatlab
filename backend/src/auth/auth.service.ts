import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { Otp, OtpDocument } from './schemas/otp.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(Otp.name)
    private readonly otpModel: Model<OtpDocument>,
  ) { }

  async requestOtp(phone: string, type = 'register'): Promise<{ message: string; code: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpModel.deleteMany({ phone, type });
    const newOtp = new this.otpModel({
      phone,
      code,
      type,
      expiresAt,
      attempts: 0,
    });
    await newOtp.save();

    return {
      message: 'OTP sent successfully',
      code: code,
    };
  }

  async verifyOtp(phone: string, code: string, type = 'register'): Promise<any> {
    const otp = await this.otpModel.findOne({
      phone,
      code,
      type,
      expiresAt: { $gt: new Date() },
    }).exec();

    if (!otp) {
      const existingOtp = await this.otpModel.findOne({
        phone,
        type,
        expiresAt: { $gt: new Date() },
      }).exec();

      if (existingOtp) {
        await this.otpModel.findByIdAndUpdate(
          existingOtp._id,
          { $inc: { attempts: 1 } },
          { new: true },
        ).exec();

        if (existingOtp.attempts >= 2) {
          await this.otpModel.findByIdAndDelete(existingOtp._id).exec();
          throw new BadRequestException('Too many verification attempts. OTP has been invalidated.');
        }
      }
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.otpModel.findByIdAndDelete(otp._id).exec();
    const user = await this.usersService.findByPhone(phone);
    if (user) {
      user.isPhoneVerified = true;
      await user.save();
    }
    return { message: 'Phone number verified successfully' };
  }

  async register(registerDto: any): Promise<any> {
    const { username, password, displayName, phone } = registerDto;
    const isDev = this.configService.get<string>('NODE_ENV') === 'development' || process.env.NODE_ENV === 'development';

    const existingPhone = await this.usersService.findByPhone(phone);
    if (existingPhone && existingPhone.isPhoneVerified && !isDev) {
      throw new ConflictException('Phone number is already registered');
    }

    const existingUser = await this.usersService.findByUsername(username);
    if (existingUser) {
      throw new ConflictException('Username is already taken');
    }

    let user;
    if (existingPhone && !existingPhone.isPhoneVerified) {
      existingPhone.username = username;
      existingPhone.displayName = displayName;
      existingPhone.password = await bcrypt.hash(password, 10);
      existingPhone.isPhoneVerified = isDev ? true : false;
      user = await existingPhone.save();
    } else {
      user = await this.usersService.create({
        username,
        password,
        displayName,
        phone,
        isPhoneVerified: isDev ? true : false,
      });
    }

    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: any, deviceInfo: string): Promise<any> {
    const { username, password } = loginDto;
    const isDev = this.configService.get<string>('NODE_ENV') === 'development' || process.env.NODE_ENV === 'development';

    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isPhoneVerified && !isDev) {
      throw new BadRequestException('Phone number is not verified');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.username);
    const refreshExpiresInDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_DAYS') || '7');
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.sessionsService.create(user._id.toString(), hashedRefreshToken, deviceInfo, refreshExpiresAt);

    return {
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string, deviceInfo: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'default_jwt_secret_key_12345';
      const payload = this.jwtService.verify(refreshToken, { secret });

      const userId = payload.sub;
      const username = payload.username;

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const activeSessions = await this.sessionsService.findActiveSessionsByUserId(userId);

      let matchingSession: any = null;
      for (const session of activeSessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.refreshToken);
        if (isMatch) {
          matchingSession = session;
          break;
        }
      }

      if (!matchingSession) {
        throw new UnauthorizedException('Session not found or expired');
      }

      const tokens = await this.generateTokens(userId, username);
      const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
      matchingSession.refreshToken = hashedRefreshToken;

      const refreshExpiresInDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_DAYS') || '7');
      matchingSession.expiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);
      matchingSession.deviceInfo = deviceInfo;
      await matchingSession.save();

      return {
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
        },
        ...tokens,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'default_jwt_secret_key_12345';
      const payload = this.jwtService.verify(refreshToken, { secret });
      const userId = payload.sub;

      const activeSessions = await this.sessionsService.findActiveSessionsByUserId(userId);
      for (const session of activeSessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.refreshToken);
        if (isMatch) {
          await this.sessionsService.deleteSession(userId, session._id.toString());
          break;
        }
      }
      return { message: 'Logged out successfully' };
    } catch (e) {
      return { message: 'Logged out successfully' };
    }
  }

  async generateTokens(userId: string, username: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, username };

    const secret = this.configService.get<string>('JWT_SECRET') || 'default_jwt_secret_key_12345';
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m';
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret, expiresIn: accessExpires as any }),
      this.jwtService.signAsync(payload, { secret, expiresIn: refreshExpires as any }),
    ]);

    return { accessToken, refreshToken };
  }
}
