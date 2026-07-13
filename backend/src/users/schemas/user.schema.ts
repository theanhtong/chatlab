import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true })
  password?: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: null })
  lastActiveAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
