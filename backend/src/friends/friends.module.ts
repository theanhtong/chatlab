import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { Friend, FriendSchema } from './schemas/friend.schema';

import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Friend.name, schema: FriendSchema }]),
    UsersModule,
    AuthModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService, MongooseModule],
})
export class FriendsModule {}
