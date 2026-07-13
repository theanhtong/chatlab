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
    content: string | null,
    type: string = 'text',
    attachments: string[] = [],
    parentId?: string,
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

    let parentObjectId: Types.ObjectId | null = null;
    if (parentId) {
      const parentMessage = await this.messageModel.findById(new Types.ObjectId(parentId)).exec();
      if (!parentMessage) {
        throw new BadRequestException('Parent message not found');
      }
      parentObjectId = parentMessage._id;
    }

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      content,
      type,
      attachments,
      parentId: parentObjectId,
      status: 'sent',
    });

    const savedMessage = await message.save();

    await this.conversationsService.update(conversationId, { updatedAt: new Date() });

    return savedMessage.populate([
      {
        path: 'senderId',
        model: 'User',
        select: '_id username displayName avatar',
      },
      {
        path: 'parentId',
        select: '_id content senderId type attachments isRevoked',
        populate: {
          path: 'senderId',
          model: 'User',
          select: '_id username displayName avatar',
        }
      }
    ]);
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
      .populate([
        {
          path: 'senderId',
          model: 'User',
          select: '_id username displayName avatar',
        },
        {
          path: 'parentId',
          select: '_id content senderId type attachments isRevoked',
          populate: {
            path: 'senderId',
            model: 'User',
            select: '_id username displayName avatar',
          }
        }
      ])
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

    return messages.map(m => {
      if (m.parentId && (m.parentId as any).isRevoked) {
        (m.parentId as any).content = null;
      }
      return {
        ...m,
        content: m.isRevoked ? null : m.content,
        seenByUserIds: seenMap[m._id.toString()] || [],
      };
    });
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
      message.isPinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
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

  async togglePinMessage(messageId: string, userId: string, pin: boolean): Promise<MessageDocument> {
    const message = await this.messageModel.findById(new Types.ObjectId(messageId)).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isParticipant = await this.conversationsService.hasParticipant(message.conversationId.toString(), userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    if (pin && !message.isPinned) {
      const pinnedCount = await this.messageModel.countDocuments({
        conversationId: message.conversationId,
        isPinned: true,
      });

      if (pinnedCount >= 5) {
        throw new BadRequestException('You can only pin a maximum of 5 messages per conversation');
      }

      message.isPinned = true;
      message.pinnedAt = new Date();
      message.pinnedBy = new Types.ObjectId(userId) as any;
    } else if (!pin) {
      message.isPinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
    }

    const saved = await message.save();
    const populated = await saved.populate([
      {
        path: 'senderId',
        model: 'User',
        select: '_id username displayName avatar',
      },
      {
        path: 'parentId',
        select: '_id content senderId type attachments isRevoked',
        populate: {
          path: 'senderId',
          model: 'User',
          select: '_id username displayName avatar',
        }
      }
    ]);

    const conversation = await this.conversationsService.findById(message.conversationId.toString());
    if (conversation) {
      conversation.participants.forEach(p => {
        this.chatGateway.sendToUser(p.userId.toString(), SocketEvent.MESSAGE_PINNED, populated);
      });
    }

    return populated;
  }

  async getPinnedMessages(conversationId: string): Promise<MessageDocument[]> {
    return this.messageModel.find({
      conversationId: new Types.ObjectId(conversationId),
      isPinned: true,
    })
      .sort({ pinnedAt: -1 })
      .populate([
        {
          path: 'senderId',
          model: 'User',
          select: '_id username displayName avatar',
        },
        {
          path: 'parentId',
          select: '_id content senderId type attachments isRevoked',
          populate: {
            path: 'senderId',
            model: 'User',
            select: '_id username displayName avatar',
          }
        }
      ])
      .exec();
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

  async shareMessage(userId: string, messageId: string, targetConversationIds: string[]): Promise<MessageDocument[]> {
    const sourceMessage = await this.messageModel.findById(new Types.ObjectId(messageId)).exec();
    if (!sourceMessage) {
      throw new NotFoundException('Message not found');
    }

    const isSourceParticipant = await this.conversationsService.hasParticipant(sourceMessage.conversationId.toString(), userId);
    if (!isSourceParticipant) {
      throw new ForbiddenException('You are not a participant in the source conversation');
    }

    if (sourceMessage.isRevoked) {
      throw new BadRequestException('Cannot share a revoked message');
    }

    const createdMessages: MessageDocument[] = [];

    for (const targetId of targetConversationIds) {
      const isTargetParticipant = await this.conversationsService.hasParticipant(targetId, userId);
      if (!isTargetParticipant) {
        throw new ForbiddenException(`You are not a participant in the target conversation: ${targetId}`);
      }

      const newMessage = await this.createMessage(
        targetId,
        userId,
        sourceMessage.content,
        sourceMessage.type,
        sourceMessage.attachments || [],
      );

      const targetConversation = await this.conversationsService.findById(targetId);
      if (targetConversation) {
        targetConversation.participants.forEach(p => {
          this.chatGateway.sendToUser(p.userId.toString(), SocketEvent.NEW_MESSAGE, newMessage);
        });
      }

      createdMessages.push(newMessage);
    }

    return createdMessages;
  }
}
