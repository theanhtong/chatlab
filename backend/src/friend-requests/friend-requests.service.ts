import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FriendRequest,
  FriendRequestDocument,
} from './schemas/friend-request.schema';
import { UsersService } from '../users/users.service';
import { FriendsService } from '../friends/friends.service';
import { BlockedUsersService } from '../blocked-users/blocked-users.service';
import { ChatGateway } from '../chat/chat.gateway';
import { SocketEvent } from '../chat/enums/socket-event.enum';
import { FriendRequestStatus } from './enums/friend-request-status.enum';

@Injectable()
export class FriendRequestsService {
  constructor(
    @InjectModel(FriendRequest.name)
    private readonly friendRequestModel: Model<FriendRequestDocument>,
    private readonly usersService: UsersService,
    private readonly friendsService: FriendsService,
    private readonly blockedUsersService: BlockedUsersService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async sendFriendRequest(senderId: string, phone: string): Promise<any> {
    const receiver = await this.usersService.findByPhone(phone);
    if (!receiver) {
      throw new NotFoundException('User not found with this phone number');
    }

    const receiverId = receiver._id.toString();

    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const areAlreadyFriends = await this.friendsService.areFriends(
      senderId,
      receiverId,
    );
    if (areAlreadyFriends) {
      throw new BadRequestException('You are already friends with this user');
    }

    const isUserBlocked = await this.blockedUsersService.isBlocked(
      senderId,
      receiverId,
    );
    if (isUserBlocked) {
      throw new BadRequestException(
        'Cannot send friend request due to blocking',
      );
    }

    const existingRequest = await this.friendRequestModel
      .findOne({
        $or: [
          {
            senderId: new Types.ObjectId(senderId),
            receiverId: new Types.ObjectId(receiverId),
          },
          {
            senderId: new Types.ObjectId(receiverId),
            receiverId: new Types.ObjectId(senderId),
          },
        ],
      })
      .exec();

    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatus.PENDING) {
        throw new BadRequestException(
          'A pending friend request already exists between you',
        );
      }
      if (existingRequest.status === FriendRequestStatus.ACCEPTED) {
        throw new BadRequestException('You are already friends with this user');
      }
      if (existingRequest.status === FriendRequestStatus.DECLINED) {
        if (existingRequest.senderId.toString() === senderId) {
          throw new BadRequestException(
            'Your previous friend request was declined by this user.',
          );
        }
        existingRequest.senderId = new Types.ObjectId(senderId);
        existingRequest.receiverId = new Types.ObjectId(receiverId);
        existingRequest.status = FriendRequestStatus.PENDING;
        const savedRequest = await existingRequest.save();
        const populatedRequest = await savedRequest.populate({
          path: 'senderId',
          model: 'User',
          select: '_id username displayName avatar',
        });
        this.chatGateway.sendToUser(
          receiverId,
          SocketEvent.NEW_FRIEND_REQUEST,
          populatedRequest,
        );
        return {
          message: 'Friend request sent successfully',
          request: populatedRequest,
        };
      }
    }

    const request = new this.friendRequestModel({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(receiverId),
      status: 'pending',
    });

    const savedRequest = await request.save();
    const populatedRequest = await savedRequest.populate({
      path: 'senderId',
      model: 'User',
      select: '_id username displayName avatar',
    });

    this.chatGateway.sendToUser(
      receiverId,
      SocketEvent.NEW_FRIEND_REQUEST,
      populatedRequest,
    );

    return {
      message: 'Friend request sent successfully',
      request: populatedRequest,
    };
  }

  async getIncomingPending(userId: string): Promise<FriendRequestDocument[]> {
    return this.friendRequestModel
      .find({
        receiverId: new Types.ObjectId(userId),
        status: FriendRequestStatus.PENDING,
      })
      .populate({
        path: 'senderId',
        model: 'User',
        select: '_id username displayName avatar isOnline',
      })
      .exec();
  }

  async getOutgoingPending(userId: string): Promise<FriendRequestDocument[]> {
    return this.friendRequestModel
      .find({
        senderId: new Types.ObjectId(userId),
        status: FriendRequestStatus.PENDING,
      })
      .populate({
        path: 'receiverId',
        model: 'User',
        select: '_id username displayName avatar isOnline',
      })
      .exec();
  }

  async acceptFriendRequest(userId: string, requestId: string): Promise<any> {
    const request = await this.friendRequestModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(requestId),
          receiverId: new Types.ObjectId(userId),
          status: FriendRequestStatus.PENDING,
        },
        { status: FriendRequestStatus.ACCEPTED },
        { new: true },
      )
      .exec();

    if (!request) {
      throw new BadRequestException('Friend request not found or not pending');
    }

    const senderId = request.senderId.toString();
    const receiverId = request.receiverId.toString();

    await this.friendsService.createFriendship(senderId, receiverId);

    this.chatGateway.sendToUser(senderId, SocketEvent.FRIEND_REQUEST_ACCEPTED, {
      requestId: request._id,
      friendId: receiverId,
    });

    return { message: 'Friend request accepted successfully' };
  }

  async declineFriendRequest(userId: string, requestId: string): Promise<any> {
    const request = await this.friendRequestModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(requestId),
          receiverId: new Types.ObjectId(userId),
          status: FriendRequestStatus.PENDING,
        },
        { status: FriendRequestStatus.DECLINED },
        { new: true },
      )
      .exec();

    if (!request) {
      throw new BadRequestException('Friend request not found or not pending');
    }

    return { message: 'Friend request declined successfully' };
  }

  async cancelFriendRequest(userId: string, requestId: string): Promise<any> {
    const request = await this.friendRequestModel
      .findOneAndDelete({
        _id: new Types.ObjectId(requestId),
        senderId: new Types.ObjectId(userId),
        status: FriendRequestStatus.PENDING,
      })
      .exec();

    if (!request) {
      throw new BadRequestException('Friend request not found or not pending');
    }

    return { message: 'Friend request cancelled successfully' };
  }
}
