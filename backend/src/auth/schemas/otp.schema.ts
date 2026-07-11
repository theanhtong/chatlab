import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: 'register', enum: ['register', 'login', 'forgot_password'] })
  type: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ required: true })
  expiresAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ phone: 1, code: 1 });
