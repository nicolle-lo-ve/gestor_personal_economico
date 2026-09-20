
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotFoundError } from '../common/errors/domain-errors';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError();
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      currency: user.currency,
      initialBalance: user.initialBalance.toFixed(2),
      onboardingDone: user.onboardingDone,
      createdAt: user.createdAt,
    };
  }
}
