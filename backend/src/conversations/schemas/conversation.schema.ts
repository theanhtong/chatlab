import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ParticipantRole } from '../enums/participant-role.enum';
import { ConversationType } from '../enums/conversation-type.enum';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: false })
export class Participant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: ParticipantRole.MEMBER, enum: Object.values(ParticipantRole) })
  role: ParticipantRole;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastReadMessageId: Types.ObjectId | null;

  @Prop({ default: false })
  isPinned?: boolean;

  @Prop({ type: Date, default: null })
  pinnedAt?: Date | null;

  @Prop({ default: false })
  isArchived?: boolean;

  @Prop({ type: Date, default: null })
  archivedAt?: Date | null;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, enum: Object.values(ConversationType) })
  type: ConversationType;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  creatorId: Types.ObjectId;

  @Prop({ type: [ParticipantSchema], default: [] })
  participants: Participant[];

  createdAt: Date;
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
