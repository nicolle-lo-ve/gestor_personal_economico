
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.sub);
  }
}
