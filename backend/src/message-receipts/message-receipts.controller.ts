import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MessageReceiptsService } from './message-receipts.service';
import { CreateMessageReceiptDto } from './dto/create-message-receipt.dto';
import { UpdateMessageReceiptDto } from './dto/update-message-receipt.dto';

@Controller('message-receipts')
export class MessageReceiptsController {
  constructor(private readonly messageReceiptsService: MessageReceiptsService) {}

  @Post()
  create(@Body() createMessageReceiptDto: CreateMessageReceiptDto) {
    return this.messageReceiptsService.create(createMessageReceiptDto);
  }

  @Get()
  findAll() {
    return this.messageReceiptsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messageReceiptsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMessageReceiptDto: UpdateMessageReceiptDto) {
    return this.messageReceiptsService.update(+id, updateMessageReceiptDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.messageReceiptsService.remove(+id);
  }
}
