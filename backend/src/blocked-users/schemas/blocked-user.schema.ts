import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BlockedUserDocument = HydratedDocument<BlockedUser>;

@Schema({ timestamps: true })
export class BlockedUser {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blockedUserId: Types.ObjectId;
}

export const BlockedUserSchema = SchemaFactory.createForClass(BlockedUser);
