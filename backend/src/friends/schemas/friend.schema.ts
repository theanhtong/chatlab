import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendDocument = HydratedDocument<Friend>;

@Schema({ timestamps: true })
export class Friend {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  friendId: Types.ObjectId;
}

export const FriendSchema = SchemaFactory.createForClass(Friend);
