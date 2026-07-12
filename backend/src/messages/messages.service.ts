import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageReceipt, MessageReceiptDocument } from '../message-receipts/schemas/message-receipt.schema';
import { MessageStatus } from './enums/message-status.enum';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(MessageReceipt.name)
    private readonly messageReceiptModel: Model<MessageReceiptDocument>,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
  ) {}

  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type = 'text',
  ): Promise<MessageDocument> {
    const conversation = await this.conversationsService.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      p => p.userId.toString() === senderId,
    );
    if (!isParticipant) {
      throw new BadRequestException('You are not a participant in this conversation');
    }

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      content,
      type,
      status: 'sent',
    });

    const savedMessage = await message.save();

    await this.conversationsService.update(conversationId, { updatedAt: new Date() });

    return savedMessage.populate({
      path: 'senderId',
      model: 'User',
      select: '_id username displayName avatar',
    });
  }

  async getMessageHistory(
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<any[]> {
    const query: any = {
      conversationId: new Types.ObjectId(conversationId),
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await this.messageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'senderId',
        model: 'User',
        select: '_id username displayName avatar',
      })
      .lean()
      .exec();

    const messageIds = messages.map(m => m._id);
    const receipts = await this.messageReceiptModel.find({
      messageId: { $in: messageIds },
      status: MessageStatus.SEEN,
    }).exec();

    const seenMap: { [key: string]: string[] } = {};
    receipts.forEach(r => {
      const mId = r.messageId.toString();
      if (!seenMap[mId]) {
        seenMap[mId] = [];
      }
      seenMap[mId].push(r.userId.toString());
    });

    return messages.map(m => ({
      ...m,
      seenByUserIds: seenMap[m._id.toString()] || [],
    }));
  }
}
