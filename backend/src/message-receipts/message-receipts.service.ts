import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessageReceipt, MessageReceiptDocument } from './schemas/message-receipt.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatGateway } from '../chat/chat.gateway';
import { SocketEvent } from '../chat/enums/socket-event.enum';
import { MessageStatus } from '../messages/enums/message-status.enum';

@Injectable()
export class MessageReceiptsService {
  constructor(
    @InjectModel(MessageReceipt.name)
    private readonly messageReceiptModel: Model<MessageReceiptDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async markAsSeen(userId: string, conversationId: string, messageId: string): Promise<any> {
    const userObjectId = new Types.ObjectId(userId);
    const convObjectId = new Types.ObjectId(conversationId);
    const msgObjectId = new Types.ObjectId(messageId);

    const conversation = await this.conversationsService.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const participant = conversation.participants.find(p => p.userId.toString() === userId);
    if (!participant) {
      throw new BadRequestException('User is not a participant of this conversation');
    }

    const targetMessage = await this.messageModel.findById(msgObjectId);
    if (!targetMessage) {
      throw new NotFoundException('Message not found');
    }

    if (targetMessage.conversationId.toString() !== conversationId) {
      throw new BadRequestException('Message does not belong to this conversation');
    }

    participant.lastReadMessageId = msgObjectId;
    await conversation.save();

    const unreadMessages = await this.messageModel.find({
      conversationId: convObjectId,
      createdAt: { $lte: targetMessage.createdAt },
      senderId: { $ne: userObjectId },
    }).exec();

    const bulkOps = unreadMessages.map(msg => ({
      updateOne: {
        filter: { messageId: msg._id, userId: userObjectId, status: MessageStatus.SEEN },
        update: { $setOnInsert: { messageId: msg._id, userId: userObjectId, status: MessageStatus.SEEN } },
        upsert: true,
      }
    }));

    if (bulkOps.length > 0) {
      await this.messageReceiptModel.bulkWrite(bulkOps);
    }

    const seenReceipts = await this.messageReceiptModel.find({
      messageId: msgObjectId,
      status: MessageStatus.SEEN,
    }).exec();
    const seenByUserIds = seenReceipts.map(r => r.userId.toString());

    conversation.participants.forEach(p => {
      this.chatGateway.sendToUser(p.userId.toString(), SocketEvent.MESSAGE_SEEN, {
        conversationId,
        userId,
        messageId,
        seenByUserIds,
      });
    });

    return { success: true, lastReadMessageId: messageId };
  }

  async markAsDelivered(userId: string, conversationId: string): Promise<any> {
    const userObjectId = new Types.ObjectId(userId);
    const convObjectId = new Types.ObjectId(conversationId);

    const conversation = await this.conversationsService.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.messageModel.find({
      conversationId: convObjectId,
      senderId: { $ne: userObjectId },
    }).exec();

    const bulkOps = messages.map(msg => ({
      updateOne: {
        filter: { messageId: msg._id, userId: userObjectId, status: MessageStatus.DELIVERED },
        update: { $setOnInsert: { messageId: msg._id, userId: userObjectId, status: MessageStatus.DELIVERED } },
        upsert: true,
      }
    }));

    if (bulkOps.length > 0) {
      await this.messageReceiptModel.bulkWrite(bulkOps);
    }

    return { success: true };
  }
}
