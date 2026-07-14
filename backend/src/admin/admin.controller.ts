import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('users/:id/ban')
  async toggleUserBan(@Param('id') userId: string) {
    return this.adminService.toggleUserBan(userId);
  }

  @Post('users/:id/role')
  async toggleUserAdmin(@Param('id') userId: string) {
    return this.adminService.toggleUserAdmin(userId);
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Post('messages/:id/revoke')
  async revokeMessageSystemWide(@Param('id') messageId: string) {
    return this.adminService.revokeMessageSystemWide(messageId);
  }
}
