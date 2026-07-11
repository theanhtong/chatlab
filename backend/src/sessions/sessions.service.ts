import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async create(userId: string, refreshToken: string, deviceInfo: string, expiresAt: Date): Promise<Session> {
    // Delete expired sessions for this user
    await this.sessionModel.deleteMany({ userId: new Types.ObjectId(userId), expiresAt: { $lt: new Date() } });

    const newSession = new this.sessionModel({
      userId: new Types.ObjectId(userId),
      refreshToken,
      deviceInfo,
      expiresAt,
    });
    return newSession.save();
  }

  async findActiveSessionsByUserId(userId: string): Promise<SessionDocument[]> {
    return this.sessionModel.find({
      userId: new Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async deleteSession(userId: string, sessionId: string): Promise<any> {
    return this.sessionModel.deleteOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });
  }

  async deleteSessionByToken(userId: string, hashedRefreshToken: string): Promise<any> {
    return this.sessionModel.deleteOne({
      userId: new Types.ObjectId(userId),
      refreshToken: hashedRefreshToken,
    });
  }

  async deleteSessionsByUserId(userId: string): Promise<any> {
    return this.sessionModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });
  }
}
