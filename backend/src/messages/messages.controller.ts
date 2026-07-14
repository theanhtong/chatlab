import { Controller, Get, Post, Patch, Param, Query, Req, Body, UseGuards, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get('search')
  async searchMessages(
    @Req() req: any,
    @Query('q') queryText: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const userId = req.user.sub;
    return this.messagesService.searchMessages(userId, queryText, conversationId);
  }

  @Post('share')
  @HttpCode(HttpStatus.OK)
  async shareMessage(
    @Req() req: any,
    @Body('messageId') messageId: string,
    @Body('targetConversationIds') targetConversationIds: string[],
  ) {
    const userId = req.user.sub;
    return this.messagesService.shareMessage(userId, messageId, targetConversationIds);
  }

  @Get(':conversationId')
  async getHistory(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    const userId = req.user.sub;
    
    const isParticipant = await this.conversationsService.hasParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return this.messagesService.getMessageHistory(conversationId, limit ? +limit : 50, before, userId);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeMessage(
    @Req() req: any,
    @Param('id') messageId: string,
  ) {
    const userId = req.user.sub;
    return this.messagesService.revokeMessage(messageId, userId);
  }

  @Get(':conversationId/pinned')
  async getPinned(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = req.user.sub;
    const isParticipant = await this.conversationsService.hasParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
    return this.messagesService.getPinnedMessages(conversationId, userId);
  }

  @Patch(':id/pin')
  async togglePin(
    @Req() req: any,
    @Param('id') messageId: string,
    @Body('pin') pin: boolean,
  ) {
    const userId = req.user.sub;
    return this.messagesService.togglePinMessage(messageId, userId, pin);
  }
}
