import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageReceipt, MessageReceiptDocument } from '../message-receipts/schemas/message-receipt.schema';
import { MessageStatus } from './enums/message-status.enum';
import { ChatGateway } from '../chat/chat.gateway';
import { SocketEvent } from '../chat/enums/socket-event.enum';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(MessageReceipt.name)
    private readonly messageReceiptModel: Model<MessageReceiptDocument>,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
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
      content: m.isRevoked ? null : m.content,
      seenByUserIds: seenMap[m._id.toString()] || [],
    }));
  }

  async revokeMessage(messageId: string, userId: string): Promise<MessageDocument> {
    const message = await this.messageModel.findById(new Types.ObjectId(messageId)).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only revoke your own messages');
    }

    if (!message.isRevoked) {
      message.content = null;
      message.isRevoked = true;
      message.revokedAt = new Date();
      await message.save();
    }

    const populated = await message.populate({
      path: 'senderId',
      model: 'User',
      select: '_id username displayName avatar',
    });

    const conversation = await this.conversationsService.findById(message.conversationId.toString());
    if (conversation) {
      conversation.participants.forEach(p => {
        this.chatGateway.sendToUser(p.userId.toString(), SocketEvent.MESSAGE_REVOKED, {
          messageId: message._id.toString(),
          conversationId: message.conversationId.toString(),
        });
      });
    }

    return populated;
  }

  async searchMessages(userId: string, queryText: string, conversationId?: string): Promise<MessageDocument[]> {
    if (!queryText) {
      return [];
    }

    let conversationIds: Types.ObjectId[] = [];
    if (conversationId) {
      const isParticipant = await this.conversationsService.hasParticipant(conversationId, userId);
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }
      conversationIds = [new Types.ObjectId(conversationId)];
    } else {
      const userConversations = await this.conversationsService.getConversations(userId);
      conversationIds = userConversations.map(c => c._id);
    }

    const query = {
      conversationId: { $in: conversationIds },
      isRevoked: { $ne: true },
      content: { $regex: queryText, $options: 'i' },
    };

    return this.messageModel.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'senderId',
        model: 'User',
        select: '_id username displayName avatar',
      })
      .exec();
  }
}
