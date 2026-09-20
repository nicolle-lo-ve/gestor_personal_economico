
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return [];
  }
}
