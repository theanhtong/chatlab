import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendRequestsService } from './friend-requests.service';
import { FriendRequestsController } from './friend-requests.controller';
import {
  FriendRequest,
  FriendRequestSchema,
} from './schemas/friend-request.schema';
import { UsersModule } from '../users/users.module';
import { FriendsModule } from '../friends/friends.module';
import { BlockedUsersModule } from '../blocked-users/blocked-users.module';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FriendRequest.name, schema: FriendRequestSchema },
    ]),
    UsersModule,
    FriendsModule,
    BlockedUsersModule,
    ChatModule,
    AuthModule,
  ],
  controllers: [FriendRequestsController],
  providers: [FriendRequestsService],
  exports: [FriendRequestsService, MongooseModule],
})
export class FriendRequestsModule {}
