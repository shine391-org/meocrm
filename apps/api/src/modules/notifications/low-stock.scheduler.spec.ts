
import { Test, TestingModule } from '@nestjs/testing';
import { LowStockScheduler } from './schedulers/low-stock.scheduler';
import { LowStockService } from './services/low-stock.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('LowStockScheduler', () => {
  let scheduler: LowStockScheduler;
  let lowStockService: DeepMockProxy<LowStockService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LowStockScheduler,
        {
          provide: LowStockService,
          useValue: mockDeep<LowStockService>(),
        },
      ],
    }).compile();

    scheduler = module.get<LowStockScheduler>(LowStockScheduler);
    lowStockService = module.get(LowStockService);
  });

  it('should call the service to send digests', async () => {
    lowStockService.sendDigestsToAllOrganizations.mockResolvedValue(undefined);
    await scheduler.handleCron();
    expect(lowStockService.sendDigestsToAllOrganizations).toHaveBeenCalled();
  });
});
