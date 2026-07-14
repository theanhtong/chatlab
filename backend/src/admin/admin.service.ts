import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Conversation,
  ConversationDocument,
} from '../conversations/schemas/conversation.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { ConversationType } from '../conversations/enums/conversation-type.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.userModel
      .find({}, { password: 0 })
      .sort({ createdAt: -1 })
      .exec();
  }

  async toggleUserBan(userId: string): Promise<User> {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) {
      throw new Error('User not found');
    }
    user.isBanned = !user.isBanned;
    return user.save();
  }

  async toggleUserAdmin(userId: string): Promise<User> {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) {
      throw new Error('User not found');
    }
    user.role = user.role === 'admin' ? 'user' : 'admin';
    return user.save();
  }

  async getStats(): Promise<any> {
    const [
      totalUsers,
      onlineUsers,
      bannedUsers,
      totalMessages,
      totalConversations,
      directConversations,
      groupConversations,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isOnline: true }).exec(),
      this.userModel.countDocuments({ isBanned: true }).exec(),
      this.messageModel.countDocuments({ isRevoked: false }).exec(),
      this.conversationModel.countDocuments().exec(),
      this.conversationModel
        .countDocuments({ type: ConversationType.DIRECT })
        .exec(),
      this.conversationModel
        .countDocuments({ type: ConversationType.GROUP })
        .exec(),
    ]);

    return {
      totalUsers,
      onlineUsers,
      bannedUsers,
      totalMessages,
      totalConversations,
      directConversations,
      groupConversations,
    };
  }

  async revokeMessageSystemWide(messageId: string): Promise<any> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        new Types.ObjectId(messageId),
        { isRevoked: true, content: null, isPinned: false },
        { new: true },
      )
      .exec();
    return message;
  }
}
