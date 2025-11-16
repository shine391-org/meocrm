import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryCustomersDto } from './query-customers.dto';

describe('QueryCustomersDto', () => {
  it('should correctly transform and validate a valid DTO', async () => {
    const dto = plainToClass(QueryCustomersDto, {
      page: '1',
      limit: '20',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: 'test',
      segment: 'active',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('should apply default values', async () => {
    const dto = plainToClass(QueryCustomersDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.sortBy).toBe('createdAt');
    expect(dto.sortOrder).toBe('desc');
  });

  it('should fail validation for invalid values', async () => {
    const dto = plainToClass(QueryCustomersDto, {
      page: 0,
      limit: 101,
      sortBy: 'invalidField',
      sortOrder: 'invalidOrder',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
