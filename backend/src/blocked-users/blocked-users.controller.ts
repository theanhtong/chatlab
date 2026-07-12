import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { BlockedUsersService } from './blocked-users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('blocked-users')
@UseGuards(JwtAuthGuard)
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @Post()
  create(@Body() createBlockedUserDto: any) {
    return this.blockedUsersService.create(createBlockedUserDto);
  }

  @Get()
  findAll() {
    return this.blockedUsersService.findAll();
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
