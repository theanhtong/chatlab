import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageReceiptsService } from './message-receipts.service';
import { MessageReceiptsController } from './message-receipts.controller';
import { MessageReceipt, MessageReceiptSchema } from './schemas/message-receipt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MessageReceipt.name, schema: MessageReceiptSchema }]),
  ],
  controllers: [MessageReceiptsController],
  providers: [MessageReceiptsService],
  exports: [MessageReceiptsService, MongooseModule],
})
export class MessageReceiptsModule {}
