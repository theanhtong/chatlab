import { Controller, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) { }

  @Get()
  async getFriends(@Req() req: any) {
    const userId = req.user.sub;
    return this.friendsService.getFriends(userId);
  }

  @Delete(':friendId')
  async removeFriend(@Req() req: any, @Param('friendId') friendId: string) {
    const userId = req.user.sub;
    await this.friendsService.removeFriendship(userId, friendId);
    return { message: 'Friend removed successfully' };
  }
}
