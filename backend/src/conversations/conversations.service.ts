import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { UsersService } from '../users/users.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ChatGateway } from '../chat/chat.gateway';
import { SocketEvent } from '../chat/enums/socket-event.enum';
import { ConversationType } from './enums/conversation-type.enum';
import { ParticipantRole } from './enums/participant-role.enum';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) { }

  async findOrCreateDirect(userId1: string, userId2: string): Promise<ConversationDocument> {
    if (userId1 === userId2) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    const id1 = new Types.ObjectId(userId1);
    const id2 = new Types.ObjectId(userId2);

    const user2 = await this.usersService.findById(userId2);
    if (!user2) {
      throw new NotFoundException('Target user not found');
    }

    const existing = await this.conversationModel.findOne({
      type: ConversationType.DIRECT,
      participants: { $size: 2 },
      'participants.userId': { $all: [id1, id2] },
    }).exec();

    if (existing) {
      return existing;
    }

    const newConversation = new this.conversationModel({
      type: ConversationType.DIRECT,
      participants: [
        { userId: id1, role: ParticipantRole.MEMBER, joinedAt: new Date() },
        { userId: id2, role: ParticipantRole.MEMBER, joinedAt: new Date() },
      ],
    });

    return newConversation.save();
  }

  async createGroup(creatorId: string, dto: CreateGroupDto): Promise<ConversationDocument> {
    const creatorObjectId = new Types.ObjectId(creatorId);
    const uniqueIds = Array.from(new Set(dto.participantIds.filter(id => id !== creatorId)));

    const participantsList = [
      { userId: creatorObjectId, role: ParticipantRole.ADMIN, joinedAt: new Date() }
    ];

    for (const pId of uniqueIds) {
      const u = await this.usersService.findById(pId);
      if (!u) {
        throw new NotFoundException(`User with ID ${pId} not found`);
      }
      participantsList.push({
        userId: new Types.ObjectId(pId),
        role: ParticipantRole.MEMBER,
        joinedAt: new Date(),
      });
    }

    const group = new this.conversationModel({
      type: ConversationType.GROUP,
      name: dto.name,
      avatar: dto.avatar || '',
      creatorId: creatorObjectId,
      participants: participantsList,
    });

    const savedGroup = await group.save();

    const populated = await savedGroup.populate({
      path: 'participants.userId',
      model: 'User',
      select: '_id username displayName avatar isOnline lastActiveAt',
    });

    populated.participants.forEach(p => {
      this.chatGateway.sendToUser(p.userId._id.toString(), SocketEvent.GROUP_CREATED, populated);
    });

    return populated;
  }

  async addMember(conversationId: string, actorId: string, targetUserId: string): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot add members to a direct conversation');
    }

    // Check permission of actor: must be admin or moderator
    const actorParticipant = conversation.participants.find(p => p.userId.toString() === actorId);
    if (!actorParticipant || ![ParticipantRole.ADMIN, ParticipantRole.MODERATOR].includes(actorParticipant.role)) {
      throw new ForbiddenException('Only group admins or moderators can add members');
    }

    // Check if target already in group
    const isAlreadyMember = conversation.participants.some(p => p.userId.toString() === targetUserId);
    if (isAlreadyMember) {
      throw new BadRequestException('User is already a participant of this conversation');
    }

    const targetUser = await this.usersService.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    conversation.participants.push({
      userId: new Types.ObjectId(targetUserId),
      role: ParticipantRole.MEMBER,
      joinedAt: new Date(),
      lastReadMessageId: null,
    });

    const saved = await conversation.save();
    const populated = await saved.populate({
      path: 'participants.userId',
      model: 'User',
      select: '_id username displayName avatar isOnline lastActiveAt',
    });

    populated.participants.forEach(p => {
      this.chatGateway.sendToUser(p.userId._id.toString(), SocketEvent.MEMBER_JOINED, {
        conversationId,
        newMember: populated.participants.find(part => part.userId._id.toString() === targetUserId),
      });
    });

    return populated;
  }

  async removeMember(conversationId: string, actorId: string, targetUserId: string): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot remove members from a direct conversation');
    }

    const actorParticipant = conversation.participants.find(p => p.userId.toString() === actorId);
    if (!actorParticipant) {
      throw new ForbiddenException('You are not a participant in this group');
    }

    const targetParticipant = conversation.participants.find(p => p.userId.toString() === targetUserId);
    if (!targetParticipant) {
      throw new BadRequestException('Target user is not a member of this group');
    }

    const isSelfLeaving = actorId === targetUserId;

    if (!isSelfLeaving) {
      if (actorParticipant.role === ParticipantRole.MEMBER) {
        throw new ForbiddenException('Only group admins or moderators can kick members');
      }
      if (actorParticipant.role === ParticipantRole.MODERATOR && [ParticipantRole.ADMIN, ParticipantRole.MODERATOR].includes(targetParticipant.role)) {
        throw new ForbiddenException('Moderators cannot remove other moderators or admins');
      }
    }

    conversation.participants = conversation.participants.filter(p => p.userId.toString() !== targetUserId) as any;

    const saved = await conversation.save();
    const populated = await saved.populate({
      path: 'participants.userId',
      model: 'User',
      select: '_id username displayName avatar isOnline lastActiveAt',
    });

    this.chatGateway.sendToUser(targetUserId, SocketEvent.MEMBER_LEFT, {
      conversationId,
      leftUserId: targetUserId,
      kicked: !isSelfLeaving,
    });

    populated.participants.forEach(p => {
      this.chatGateway.sendToUser(p.userId._id.toString(), SocketEvent.MEMBER_LEFT, {
        conversationId,
        leftUserId: targetUserId,
        kicked: !isSelfLeaving,
      });
    });

    return populated;
  }

  async updateRole(conversationId: string, actorId: string, targetUserId: string, role: ParticipantRole): Promise<ConversationDocument> {
    if (!Object.values(ParticipantRole).includes(role)) {
      throw new BadRequestException('Invalid role name');
    }

    const conversation = await this.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot change roles in a direct conversation');
    }

    const actorParticipant = conversation.participants.find(p => p.userId.toString() === actorId);
    if (!actorParticipant || actorParticipant.role !== ParticipantRole.ADMIN) {
      throw new ForbiddenException('Only group admins can change participant roles');
    }

    const targetParticipant = conversation.participants.find(p => p.userId.toString() === targetUserId);
    if (!targetParticipant) {
      throw new BadRequestException('Target user is not a member of this group');
    }

    targetParticipant.role = role;

    const saved = await conversation.save();
    const populated = await saved.populate({
      path: 'participants.userId',
      model: 'User',
      select: '_id username displayName avatar isOnline lastActiveAt',
    });

    populated.participants.forEach(p => {
      this.chatGateway.sendToUser(p.userId._id.toString(), SocketEvent.ROLE_UPDATED, {
        conversationId,
        targetUserId,
        newRole: role,
      });
    });

    return populated;
  }

  async updateGroupDetails(conversationId: string, actorId: string, name?: string, avatar?: string): Promise<ConversationDocument> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot update details of a direct conversation');
    }

    const actorParticipant = conversation.participants.find(p => p.userId.toString() === actorId);
    if (!actorParticipant || ![ParticipantRole.ADMIN, ParticipantRole.MODERATOR].includes(actorParticipant.role)) {
      throw new ForbiddenException('Only group admins or moderators can update group details');
    }

    if (name !== undefined) conversation.name = name;
    if (avatar !== undefined) conversation.avatar = avatar;

    const saved = await conversation.save();
    const populated = await saved.populate({
      path: 'participants.userId',
      model: 'User',
      select: '_id username displayName avatar isOnline lastActiveAt',
    });

    populated.participants.forEach(p => {
      this.chatGateway.sendToUser(p.userId._id.toString(), SocketEvent.GROUP_UPDATED, populated);
    });

    return populated;
  }

  async getConversations(userId: string): Promise<ConversationDocument[]> {
    return this.conversationModel.find({
      'participants.userId': new Types.ObjectId(userId),
    })
      .populate({
        path: 'participants.userId',
        model: 'User',
        select: '_id username displayName avatar isOnline lastActiveAt',
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<ConversationDocument | null> {
    return this.conversationModel.findById(new Types.ObjectId(id)).exec();
  }

  async hasParticipant(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.conversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      'participants.userId': new Types.ObjectId(userId),
    }).exec();
    return !!conversation;
  }

  async update(id: string, updateDto: any): Promise<ConversationDocument | null> {
    return this.conversationModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updateDto,
      { new: true }
    ).exec();
  }

  async searchConversations(userId: string, queryText: string): Promise<ConversationDocument[]> {
    if (!queryText) {
      return [];
    }

    const conversations = await this.conversationModel.find({
      'participants.userId': new Types.ObjectId(userId),
    })
      .populate({
        path: 'participants.userId',
        model: 'User',
        select: '_id username displayName avatar isOnline lastActiveAt',
      })
      .sort({ updatedAt: -1 })
      .exec();

    const regex = new RegExp(queryText, 'i');

    return conversations.filter(c => {
      if (c.type === ConversationType.GROUP) {
        return regex.test(c.name);
      } else {
        const otherParticipant = c.participants.find(p => p.userId && (p.userId as any)._id.toString() !== userId);
        if (!otherParticipant || !otherParticipant.userId) return false;

        const userObj = otherParticipant.userId as any;
        return regex.test(userObj.username) || regex.test(userObj.displayName);
      }
    });
  }
}
