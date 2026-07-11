import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendRequestDocument = HydratedDocument<FriendRequest>;

@Schema({ timestamps: true })
export class FriendRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId;

  @Prop({ default: 'pending', enum: ['pending', 'accepted', 'declined'] })
  status: string;
}

export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);
