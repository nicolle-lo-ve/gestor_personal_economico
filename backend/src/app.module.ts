import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DebtsModule } from './debts/debts.module';
import { GoalsModule } from './goals/goals.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AuthModule, UsersModule, CategoriesModule, TransactionsModule, DebtsModule, GoalsModule],
  controllers: [HealthController],
})
export class AppModule {}