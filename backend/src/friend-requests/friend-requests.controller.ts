import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { FriendRequestsService } from './friend-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('friend-requests')
@UseGuards(JwtAuthGuard)
export class FriendRequestsController {
  constructor(private readonly friendRequestsService: FriendRequestsService) { }

  @Post('send')
  async sendRequest(@Req() req: any, @Body('phone') phone: string) {
    const senderId = req.user.sub;
    return this.friendRequestsService.sendFriendRequest(senderId, phone);
  }

  @Get('pending/incoming')
  async getIncoming(@Req() req: any) {
    const userId = req.user.sub;
    return this.friendRequestsService.getIncomingPending(userId);
  }

  @Get('pending/outgoing')
  async getOutgoing(@Req() req: any) {
    const userId = req.user.sub;
    return this.friendRequestsService.getOutgoingPending(userId);
  }

  @Post(':id/accept')
  async acceptRequest(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.friendRequestsService.acceptFriendRequest(userId, id);
  }

  @Post(':id/decline')
  async declineRequest(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.friendRequestsService.declineFriendRequest(userId, id);
  }

  @Post(':id/cancel')
  async cancelRequest(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.friendRequestsService.cancelFriendRequest(userId, id);
  }
}
