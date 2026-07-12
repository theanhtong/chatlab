import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }]),
    AuthModule,
    UsersModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService, MongooseModule],
})
export class ConversationsModule {}
