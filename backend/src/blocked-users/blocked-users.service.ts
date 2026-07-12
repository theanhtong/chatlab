import { Injectable } from '@nestjs/common';
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

  create(createBlockedUserDto: any) {
    return 'This action adds a new blockedUser';
  }

  findAll() {
    return `This action returns all blockedUsers`;
  }

  findOne(id: string) {
    return this.blockedUserModel.findById(new Types.ObjectId(id)).exec();
  }

  remove(id: string) {
    return this.blockedUserModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }
}
