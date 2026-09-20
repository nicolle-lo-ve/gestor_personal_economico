const fs = require('fs');
const path = require('path');

function createFiles(moduleName) {
  const dir = `src/${moduleName}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const upper = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const service = `${upper}Service`;
  const controller = `${upper}Controller`;
  const moduleClass = `${upper}Module`;

  fs.writeFileSync(path.join(dir, `${moduleName}.module.ts`), `
import { Module } from '@nestjs/common';
import { ${service} } from './${moduleName}.service';
import { ${controller} } from './${moduleName}.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [${controller}],
  providers: [${service}, PrismaService],
  exports: [${service}],
})
export class ${moduleClass} {}
`);

  fs.writeFileSync(path.join(dir, `${moduleName}.service.ts`), `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ${service} {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return [];
  }
}
`);

  fs.writeFileSync(path.join(dir, `${moduleName}.controller.ts`), `
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ${service} } from './${moduleName}.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('${moduleName}')
export class ${controller} {
  constructor(private readonly service: ${service}) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.sub);
  }
}
`);

  fs.writeFileSync(path.join(dir, `${moduleName}.service.spec.ts`), `
import { Test, TestingModule } from '@nestjs/testing';
import { ${service} } from './${moduleName}.service';
import { PrismaService } from '../prisma.service';

describe('${service}', () => {
  let service: ${service};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${service}, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<${service}>(${service});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
`);

  fs.writeFileSync(path.join(dir, `${moduleName}.controller.spec.ts`), `
import { Test, TestingModule } from '@nestjs/testing';
import { ${controller} } from './${moduleName}.controller';
import { ${service} } from './${moduleName}.service';
import { JwtService } from '@nestjs/jwt';

describe('${controller}', () => {
  let controller: ${controller};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${controller}],
      providers: [{ provide: ${service}, useValue: {} }, { provide: JwtService, useValue: {} }],
    }).compile();

    controller = module.get<${controller}>(${controller});
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
`);
}

['transactions', 'debts', 'goals'].forEach(createFiles);

const appModulePath = 'src/app.module.ts';
let appModule = fs.readFileSync(appModulePath, 'utf8');

if (!appModule.includes('TransactionsModule')) {
  appModule = appModule.replace(
    "import { CategoriesModule } from './categories/categories.module';",
    "import { CategoriesModule } from './categories/categories.module';\nimport { TransactionsModule } from './transactions/transactions.module';\nimport { DebtsModule } from './debts/debts.module';\nimport { GoalsModule } from './goals/goals.module';"
  );
  appModule = appModule.replace(
    "imports: [AuthModule, UsersModule, CategoriesModule],",
    "imports: [AuthModule, UsersModule, CategoriesModule, TransactionsModule, DebtsModule, GoalsModule],"
  );
  fs.writeFileSync(appModulePath, appModule);
}

console.log('Phase 4 modules generated successfully.');