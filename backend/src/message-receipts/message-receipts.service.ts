import { Injectable } from '@nestjs/common';
import { CreateMessageReceiptDto } from './dto/create-message-receipt.dto';
import { UpdateMessageReceiptDto } from './dto/update-message-receipt.dto';

@Injectable()
export class MessageReceiptsService {
  create(createMessageReceiptDto: CreateMessageReceiptDto) {
    return 'This action adds a new messageReceipt';
  }

  findAll() {
    return `This action returns all messageReceipts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} messageReceipt`;
  }

  update(id: number, updateMessageReceiptDto: UpdateMessageReceiptDto) {
    return `This action updates a #${id} messageReceipt`;
  }

  remove(id: number) {
    return `This action removes a #${id} messageReceipt`;
  }
}
