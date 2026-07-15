import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { MessageReceiptsService } from '../message-receipts/message-receipts.service';
import { BlockedUsersService } from '../blocked-users/blocked-users.service';
import { SocketEvent } from './enums/socket-event.enum';
import {
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private activeUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly messageReceiptsService: MessageReceiptsService,
    private readonly blockedUsersService: BlockedUsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `Disconnecting unauthenticated client ${client.id}: No token provided`,
        );
        client.disconnect(true);
        return;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'default_jwt_secret_key_12345';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      const userId = payload.sub;
      const username = payload.username;

      client.data.user = { id: userId, username };

      if (!this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, new Set());
      }
      this.activeUsers.get(userId)?.add(client.id);

      await client.join(`user_${userId}`);

      this.logger.log(
        `Client authenticated: User ${username} (Id: ${userId}) connected on socket ${client.id}`,
      );

      const user = await this.usersService.updateOnlineStatus(userId, true);

      this.server.emit(SocketEvent.USER_STATUS, {
        userId,
        username,
        isOnline: true,
        displayName: user?.displayName,
      });
    } catch (error) {
      this.logger.warn(
        `Disconnecting client ${client.id}: JWT verification failed (${error.message})`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (!user) {
      this.logger.log(
        `Client disconnected: Unauthenticated socket ${client.id}`,
      );
      return;
    }

    const userId = user.id;
    const username = user.username;

    const sockets = this.activeUsers.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.activeUsers.delete(userId);

        this.logger.log(
          `User ${username} is offline (all sockets disconnected)`,
        );
        const updatedUser = await this.usersService.updateOnlineStatus(
          userId,
          false,
        );

        this.server.emit(SocketEvent.USER_STATUS, {
          userId,
          username,
          isOnline: false,
          lastActiveAt: updatedUser?.lastActiveAt || new Date(),
        });
      } else {
        this.logger.log(
          `Socket disconnected for ${username}: ${sockets.size} active connection(s) remaining`,
        );
      }
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers['authorization'];
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.split(' ')[1];
    }

    const authPayload = client.handshake.auth?.token;
    if (authPayload && typeof authPayload === 'string') {
      if (authPayload.startsWith('Bearer ')) {
        return authPayload.split(' ')[1];
      }
      return authPayload;
    }

    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    const customTokenHeader = client.handshake.headers['token'];
    if (customTokenHeader && typeof customTokenHeader === 'string') {
      return customTokenHeader;
    }

    return null;
  }

  sendToUser(userId: string, event: SocketEvent, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId?: string;
      receiverId?: string;
      content: string | null;
      type?: string;
      attachments?: string[];
      parentId?: string;
    },
  ) {
    const user = client.data.user;
    if (!user) {
      this.logger.warn(
        `Unauthorized send-message attempt from socket ${client.id}`,
      );
      return { status: 'error', message: 'Unauthorized' };
    }

    const senderId = user.id;
    let conversationId = data.conversationId;

    try {
      if (!conversationId) {
        if (!data.receiverId) {
          throw new BadRequestException(
            'Either conversationId or receiverId must be provided',
          );
        }
        const conversation = await this.conversationsService.findOrCreateDirect(
          senderId,
          data.receiverId,
        );
        conversationId = conversation._id.toString();
      }

      const conversation =
        await this.conversationsService.findById(conversationId);
      if (!conversation) {
        throw new BadRequestException('Conversation not found');
      }

      // Check if blocked
      if (conversation.type === 'direct') {
        const otherParticipant = conversation.participants.find(
          (p) => p.userId.toString() !== senderId,
        );
        if (otherParticipant) {
          const isBlocked = await this.blockedUsersService.isBlocked(
            senderId,
            otherParticipant.userId.toString(),
          );
          if (isBlocked) {
            throw new BadRequestException(
              'Cannot send message. One of the users has blocked the other.',
            );
          }
        }
      }

      const message = await this.messagesService.createMessage(
        conversationId,
        senderId,
        data.content,
        data.type || 'text',
        data.attachments || [],
        data.parentId,
      );

      conversation.participants.forEach((p) => {
        this.sendToUser(
          p.userId.toString(),
          SocketEvent.NEW_MESSAGE,
          message,
        );
      });

      return { status: 'ok', conversationId, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  @SubscribeMessage('read-message')
  async handleReadMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      return { status: 'error', message: 'Unauthorized' };
    }

    try {
      await this.messageReceiptsService.markAsSeen(
        user.id,
        data.conversationId,
        data.messageId,
      );
      return { status: 'ok', messageId: data.messageId };
    } catch (error) {
      this.logger.error(`Error marking message as seen: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: 'hello!' };
  }
}
