import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MessageStatus } from '../../messages/enums/message-status.enum';

export type MessageReceiptDocument = HydratedDocument<MessageReceipt>;

@Schema({ timestamps: true })
export class MessageReceipt {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: [MessageStatus.DELIVERED, MessageStatus.SEEN] })
  status: MessageStatus;
}

export const MessageReceiptSchema =
  SchemaFactory.createForClass(MessageReceipt);
