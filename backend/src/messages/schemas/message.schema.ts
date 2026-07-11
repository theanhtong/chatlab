import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ default: null })
  content: string;

  @Prop({ default: 'text', enum: ['text', 'image', 'file', 'system'] })
  type: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ default: 'sent', enum: ['sent', 'delivered', 'seen'] })
  status: string;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ default: null })
  revokedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
