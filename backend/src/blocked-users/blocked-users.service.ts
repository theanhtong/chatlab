import { Injectable } from '@nestjs/common';
import { CreateBlockedUserDto } from './dto/create-blocked-user.dto';
import { UpdateBlockedUserDto } from './dto/update-blocked-user.dto';

@Injectable()
export class BlockedUsersService {
  create(createBlockedUserDto: CreateBlockedUserDto) {
    return 'This action adds a new blockedUser';
  }

  findAll() {
    return `This action returns all blockedUsers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} blockedUser`;
  }

  update(id: number, updateBlockedUserDto: UpdateBlockedUserDto) {
    return `This action updates a #${id} blockedUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} blockedUser`;
  }
}
