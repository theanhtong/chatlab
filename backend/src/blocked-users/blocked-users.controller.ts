import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BlockedUsersService } from './blocked-users.service';
import { CreateBlockedUserDto } from './dto/create-blocked-user.dto';
import { UpdateBlockedUserDto } from './dto/update-blocked-user.dto';

@Controller('blocked-users')
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @Post()
  create(@Body() createBlockedUserDto: CreateBlockedUserDto) {
    return this.blockedUsersService.create(createBlockedUserDto);
  }

  @Get()
  findAll() {
    return this.blockedUsersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blockedUsersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlockedUserDto: UpdateBlockedUserDto) {
    return this.blockedUsersService.update(+id, updateBlockedUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blockedUsersService.remove(+id);
  }
}
