import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { FriendRequestsModule } from './friend-requests/friend-requests.module';
import { FriendsModule } from './friends/friends.module';
import { BlockedUsersModule } from './blocked-users/blocked-users.module';
import { MessageReceiptsModule } from './message-receipts/message-receipts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    SessionsModule,
    ConversationsModule,
    MessagesModule,
    FriendRequestsModule,
    FriendsModule,
    BlockedUsersModule,
    MessageReceiptsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
