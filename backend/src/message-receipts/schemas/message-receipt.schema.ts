import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageReceiptDocument = HydratedDocument<MessageReceipt>;

@Schema({ timestamps: true })
export class MessageReceipt {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['delivered', 'seen'] })
  status: string;
}

export const MessageReceiptSchema = SchemaFactory.createForClass(MessageReceipt);
