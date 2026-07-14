import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BlockedUsersService } from './blocked-users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('blocked-users')
@UseGuards(JwtAuthGuard)
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @Post()
  async blockUser(
    @Req() req: any,
    @Body('blockedUserId') blockedUserId: string,
  ) {
    const userId = req.user.sub;
    return this.blockedUsersService.block(userId, blockedUserId);
  }

  @Post('unblock')
  async unblockUser(
    @Req() req: any,
    @Body('blockedUserId') blockedUserId: string,
  ) {
    const userId = req.user.sub;
    return this.blockedUsersService.unblock(userId, blockedUserId);
  }

  @Get('check/:targetUserId')
  async checkBlocked(
    @Req() req: any,
    @Param('targetUserId') targetUserId: string,
  ) {
    const userId = req.user.sub;
    const blocked = await this.blockedUsersService.isBlockedByUser(
      userId,
      targetUserId,
    );
    return { blocked };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blockedUsersService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blockedUsersService.remove(id);
  }
}
