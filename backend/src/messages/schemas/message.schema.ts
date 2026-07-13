import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MessageType } from '../enums/message-type.enum';
import { MessageStatus } from '../enums/message-status.enum';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, default: null })
  content: string | null;

  @Prop({ default: MessageType.TEXT, enum: Object.values(MessageType) })
  type: MessageType;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ default: MessageStatus.SENT, enum: Object.values(MessageStatus) })
  status: MessageStatus;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ default: null })
  revokedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  parentId?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
