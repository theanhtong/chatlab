import { Controller, Get, Param, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
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

    return this.messagesService.getMessageHistory(conversationId, limit ? +limit : 50, before);
  }
}
