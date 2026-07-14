import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from './users/users.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private readonly usersService: UsersService) { }

  async onApplicationBootstrap() {
    await this.seedUsers();
  }

  private async seedUsers() {
    try {
      const adminUser = await this.usersService.findByUsername('admin');
      if (!adminUser) {
        console.log('--- SEEDING INITIAL USERS ---');
        await this.usersService.create({
          username: 'admin',
          displayName: 'Quản Trị Viên',
          phone: '0901234567',
          password: 'password123',
          role: 'admin',
        });
        await this.usersService.create({
          username: 'user1',
          displayName: 'User Test 1',
          phone: '0912345678',
          password: 'password123',
        });
        await this.usersService.create({
          username: 'user2',
          displayName: 'User Test 2',
          phone: '0987654321',
          password: 'password123',
        });
        console.log('Seeded 3 default test users successfully!');
      }
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
