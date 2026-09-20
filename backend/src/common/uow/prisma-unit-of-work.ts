import { Injectable } from '@nestjs/common';
import { UnitOfWork } from './unit-of-work';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private prisma: PrismaClient) {}

  async run<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return fn(tx);
    });
  }
}