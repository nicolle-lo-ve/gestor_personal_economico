
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async seedSystemCategories(userId: string, tx: any) {
    const cats = [
      { userId, name: 'Sueldo', type: 'INCOME' as any, systemKey: 'SALARY', icon: 'briefcase', color: '#16a34a', isSystem: true },
      { userId, name: 'Comida', type: 'EXPENSE' as any, systemKey: 'FOOD', icon: 'utensils', color: '#ea580c', isSystem: true },
    ];
    await tx.category.createMany({ data: cats });
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({ where: { userId } });
  }
}
