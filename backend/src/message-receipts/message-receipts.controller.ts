import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { MessageReceiptsService } from './message-receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('message-receipts')
@UseGuards(JwtAuthGuard)
export class MessageReceiptsController {
  constructor(
    private readonly messageReceiptsService: MessageReceiptsService,
  ) {}

  @Post('seen')
  async markAsSeen(
    @Req() req: any,
    @Body('conversationId') conversationId: string,
    @Body('messageId') messageId: string,
  ) {
    const userId = req.user.sub;
    return this.messageReceiptsService.markAsSeen(
      userId,
      conversationId,
      messageId,
    );
  }

  @Post('delivered')
  async markAsDelivered(
    @Req() req: any,
    @Body('conversationId') conversationId: string,
  ) {
    const userId = req.user.sub;
    return this.messageReceiptsService.markAsDelivered(userId, conversationId);
  }
}
