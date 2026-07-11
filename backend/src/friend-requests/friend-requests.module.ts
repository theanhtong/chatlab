import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendRequestsService } from './friend-requests.service';
import { FriendRequestsController } from './friend-requests.controller';
import { FriendRequest, FriendRequestSchema } from './schemas/friend-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FriendRequest.name, schema: FriendRequestSchema }]),
  ],
  controllers: [FriendRequestsController],
  providers: [FriendRequestsService],
  exports: [FriendRequestsService, MongooseModule],
})
export class FriendRequestsModule {}
