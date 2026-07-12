import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message, MessageSchema } from './schemas/message.schema';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessageReceiptsModule } from '../message-receipts/message-receipts.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    AuthModule,
    forwardRef(() => ConversationsModule),
    MessageReceiptsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService, MongooseModule],
})
export class MessagesModule {}
