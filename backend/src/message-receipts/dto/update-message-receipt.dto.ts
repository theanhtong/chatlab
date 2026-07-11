import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageReceiptDto } from './create-message-receipt.dto';

export class UpdateMessageReceiptDto extends PartialType(CreateMessageReceiptDto) {}
