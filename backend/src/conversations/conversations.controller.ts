import { Controller, Get, Post, Delete, Patch, Body, Req, Param, Query, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { ParticipantRole } from './enums/participant-role.enum';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(@Req() req: any) {
    const userId = req.user.sub;
    return this.conversationsService.getConversations(userId);
  }

  @Get('search')
  async searchConversations(
    @Req() req: any,
    @Query('q') queryText: string,
  ) {
    const userId = req.user.sub;
    return this.conversationsService.searchConversations(userId, queryText);
  }

  @Post('direct')
  async createDirectConversation(
    @Req() req: any,
    @Body('targetUserId') targetUserId: string,
  ) {
    const userId = req.user.sub;
    return this.conversationsService.findOrCreateDirect(userId, targetUserId);
  }

  @Post('group')
  async createGroup(
    @Req() req: any,
    @Body() dto: CreateGroupDto,
  ) {
    const userId = req.user.sub;
    return this.conversationsService.createGroup(userId, dto);
  }

  @Post('group/:id/members')
  async addMember(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body('userId') targetUserId: string,
  ) {
    const userId = req.user.sub;
    return this.conversationsService.addMember(conversationId, userId, targetUserId);
  }

  @Delete('group/:id/members/:userId')
  async removeMember(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Param('userId') targetUserId: string,
  ) {
    const userId = req.user.sub;
    return this.conversationsService.removeMember(conversationId, userId, targetUserId);
  }

  @Patch('group/:id/role')
  async updateRole(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body('userId') targetUserId: string,
    @Body('role') role: ParticipantRole,
  ) {
    const userId = req.user.sub;
    return this.conversationsService.updateRole(conversationId, userId, targetUserId, role);
  }

  @Patch('group/:id')
  async updateGroupDetails(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body('name') name?: string,
    @Body('avatar') avatar?: string,
  ) {
    const userId = req.user.sub;
    return this.conversationsService.updateGroupDetails(conversationId, userId, name, avatar);
  }
}
