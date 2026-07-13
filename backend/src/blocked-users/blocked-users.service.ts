import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BlockedUser, BlockedUserDocument } from './schemas/blocked-user.schema';

@Injectable()
export class BlockedUsersService {
  constructor(
    @InjectModel(BlockedUser.name)
    private readonly blockedUserModel: Model<BlockedUserDocument>,
  ) { }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const block = await this.blockedUserModel.findOne({
      $or: [
        { userId: new Types.ObjectId(userId), blockedUserId: new Types.ObjectId(targetUserId) },
        { userId: new Types.ObjectId(targetUserId), blockedUserId: new Types.ObjectId(userId) },
      ],
    }).exec();
    return !!block;
  }

  async isBlockedByUser(userId: string, targetUserId: string): Promise<boolean> {
    const block = await this.blockedUserModel.findOne({
      userId: new Types.ObjectId(userId),
      blockedUserId: new Types.ObjectId(targetUserId),
    }).exec();
    return !!block;
  }

  async block(userId: string, blockedUserId: string): Promise<BlockedUserDocument> {
    if (userId === blockedUserId) {
      throw new BadRequestException('Cannot block yourself');
    }
    const existing = await this.blockedUserModel.findOne({
      userId: new Types.ObjectId(userId),
      blockedUserId: new Types.ObjectId(blockedUserId),
    }).exec();
    if (existing) {
      return existing;
    }
    const newBlock = new this.blockedUserModel({
      userId: new Types.ObjectId(userId),
      blockedUserId: new Types.ObjectId(blockedUserId),
    });
    return newBlock.save();
  }

  async unblock(userId: string, blockedUserId: string): Promise<any> {
    return this.blockedUserModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      blockedUserId: new Types.ObjectId(blockedUserId),
    }).exec();
  }

  findOne(id: string) {
    return this.blockedUserModel.findById(new Types.ObjectId(id)).exec();
  }

  remove(id: string) {
    return this.blockedUserModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
