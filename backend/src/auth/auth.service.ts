
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ConflictError, UnauthorizedError, BusinessRuleError } from '../common/errors/domain-errors';
import { CategoriesService } from '../categories/categories.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private categoriesService: CategoriesService
  ) {}

  async register(data: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Este correo ya está registrado.');

    const passwordHash = await argon2.hash(data.password);
    
    const session = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          displayName: data.displayName || null,
        }
      });
      await this.categoriesService.seedSystemCategories(user.id, tx);
      return this.generateSession(user, tx);
    });
    return session;
  }

  async login(data: any) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      await argon2.hash('dummy');
      throw new UnauthorizedError('Correo o contraseña incorrectos.');
    }
    const valid = await argon2.verify(user.passwordHash, data.password);
    if (!valid) throw new UnauthorizedError('Correo o contraseña incorrectos.');

    return this.prisma.$transaction(tx => this.generateSession(user, tx));
  }

  private async generateSession(user: any, tx: any) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    
    const refreshToken = "dummy-refresh-token-" + Date.now();
    
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        currency: user.currency,
        initialBalance: user.initialBalance.toFixed(2),
        onboardingDone: user.onboardingDone,
        createdAt: user.createdAt,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900
      }
    };
  }
}
