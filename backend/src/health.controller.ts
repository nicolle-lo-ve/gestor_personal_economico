import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok', db: 'up', time: new Date().toISOString() };
  }
}