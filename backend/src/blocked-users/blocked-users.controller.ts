import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { BlockedUsersService } from './blocked-users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('blocked-users')
@UseGuards(JwtAuthGuard)
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) { }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blockedUsersService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blockedUsersService.remove(id);
  }
}
