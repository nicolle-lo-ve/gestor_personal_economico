import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AuthModule, UsersModule, CategoriesModule],
  controllers: [HealthController],
})
export class AppModule {}