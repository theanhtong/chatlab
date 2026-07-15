import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { MessageReceiptsModule } from '../message-receipts/message-receipts.module';
import { BlockedUsersModule } from '../blocked-users/blocked-users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    forwardRef(() => ConversationsModule),
    MessagesModule,
    forwardRef(() => MessageReceiptsModule),
    BlockedUsersModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
