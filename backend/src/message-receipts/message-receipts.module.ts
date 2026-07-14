import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageReceiptsService } from './message-receipts.service';
import { MessageReceiptsController } from './message-receipts.controller';
import {
  MessageReceipt,
  MessageReceiptSchema,
} from './schemas/message-receipt.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageReceipt.name, schema: MessageReceiptSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    forwardRef(() => ConversationsModule),
    AuthModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [MessageReceiptsController],
  providers: [MessageReceiptsService],
  exports: [MessageReceiptsService, MongooseModule],
})
export class MessageReceiptsModule {}
