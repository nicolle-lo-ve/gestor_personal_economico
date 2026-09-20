
import { Test, TestingModule } from '@nestjs/testing';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { JwtService } from '@nestjs/jwt';

describe('DebtsController', () => {
  let controller: DebtsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebtsController],
      providers: [{ provide: DebtsService, useValue: {} }, { provide: JwtService, useValue: {} }],
    }).compile();

    controller = module.get<DebtsController>(DebtsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
