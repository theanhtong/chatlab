import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockedUsersService } from './blocked-users.service';
import { BlockedUsersController } from './blocked-users.controller';
import { BlockedUser, BlockedUserSchema } from './schemas/blocked-user.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BlockedUser.name, schema: BlockedUserSchema }]),
    AuthModule,
  ],
  controllers: [BlockedUsersController],
  providers: [BlockedUsersService],
  exports: [BlockedUsersService, MongooseModule],
})
export class BlockedUsersModule {}
