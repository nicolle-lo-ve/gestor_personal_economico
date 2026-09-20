const fs = require('fs');

fs.writeFileSync('src/users/users.module.ts', `
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
`);

fs.writeFileSync('src/users/users.service.ts', `
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
`);

fs.writeFileSync('src/users/users.controller.ts', `
import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.usersService.findById(user.sub);
  }
}
`);

fs.writeFileSync('src/auth/auth.module.ts', `
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { CategoriesService } from '../categories/categories.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, CategoriesService],
})
export class AuthModule {}
`);

fs.writeFileSync('src/auth/auth.service.ts', `
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
`);

fs.writeFileSync('src/auth/auth.controller.ts', `
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() data: any) {
    return this.authService.register(data);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() data: any) {
    return this.authService.login(data);
  }
}
`);

fs.writeFileSync('src/categories/categories.module.ts', `
import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, PrismaService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
`);

fs.writeFileSync('src/categories/categories.service.ts', `
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
`);

fs.writeFileSync('src/categories/categories.controller.ts', `
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.categoriesService.findAll(user.sub);
  }
}
`);

fs.writeFileSync('src/main.ts', `
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors();
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
`);

fs.writeFileSync('src/app.module.ts', `
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [AuthModule, UsersModule, CategoriesModule],
})
export class AppModule {}
`);