import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FriendRequestStatus } from '../enums/friend-request-status.enum';

export type FriendRequestDocument = HydratedDocument<FriendRequest>;

@Schema({ timestamps: true })
export class FriendRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId;

  @Prop({ default: FriendRequestStatus.PENDING, enum: Object.values(FriendRequestStatus) })
  status: FriendRequestStatus;
}

export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);
