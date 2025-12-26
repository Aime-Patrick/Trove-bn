import { Test, TestingModule } from '@nestjs/testing';
import { LotteryGateway } from './lottery.gateway';

describe('LotteryGateway', () => {
  let gateway: LotteryGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LotteryGateway],
    }).compile();

    gateway = module.get<LotteryGateway>(LotteryGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
