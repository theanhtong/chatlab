import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: false })
export class Participant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 'member', enum: ['member', 'admin', 'moderator'] })
  role: string;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastReadMessageId: Types.ObjectId;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, enum: ['direct', 'group'] })
  type: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  creatorId: Types.ObjectId;

  @Prop({ type: [ParticipantSchema], default: [] })
  participants: Participant[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
