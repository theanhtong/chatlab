import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friend, FriendDocument } from './schemas/friend.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friend.name)
    private readonly friendModel: Model<FriendDocument>,
  ) {}

  async getFriends(userId: string): Promise<any[]> {
    const friendships = await this.friendModel.find({
      userId: new Types.ObjectId(userId),
    })
    .populate({
      path: 'friendId',
      model: 'User',
      select: '_id username displayName avatar isOnline lastActiveAt',
    })
    .exec();

    return friendships
      .filter(f => f.friendId !== null)
      .map(f => f.friendId);
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendModel.findOne({
      userId: new Types.ObjectId(userId1),
      friendId: new Types.ObjectId(userId2),
    }).exec();
    return !!friendship;
  }

  async createFriendship(userId1: string, userId2: string): Promise<void> {
    if (userId1 === userId2) {
      throw new BadRequestException('Cannot be friends with yourself');
    }

    const id1 = new Types.ObjectId(userId1);
    const id2 = new Types.ObjectId(userId2);

    const exists = await this.friendModel.findOne({ userId: id1, friendId: id2 }).exec();
    if (!exists) {
      await this.friendModel.create([
        { userId: id1, friendId: id2 },
        { userId: id2, friendId: id1 },
      ]);
    }
  }

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    const id1 = new Types.ObjectId(userId1);
    const id2 = new Types.ObjectId(userId2);

    await this.friendModel.deleteMany({
      $or: [
        { userId: id1, friendId: id2 },
        { userId: id2, friendId: id1 },
      ],
    }).exec();
  }
}
