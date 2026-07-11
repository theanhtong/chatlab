import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ default: '' })
  deviceInfo: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
