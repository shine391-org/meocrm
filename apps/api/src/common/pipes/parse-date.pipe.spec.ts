import { BadRequestException } from '@nestjs/common';
import { ParseDatePipe } from './parse-date.pipe';

describe('ParseDatePipe', () => {
  let pipe: ParseDatePipe;

  beforeEach(() => {
    pipe = new ParseDatePipe();
  });

  it('normalizes YYYY-MM inputs by adding the first day of the month', () => {
    const result = pipe.transform('2025-02');
    expect(result.toISOString()).toBe('2025-02-01T00:00:00.000Z');
  });

  it('preserves exact days for YYYY-MM-DD inputs', () => {
    const result = pipe.transform('2023-07-12');
    expect(result.toISOString()).toBe('2023-07-12T00:00:00.000Z');
  });

  it('rejects ISO strings with time information', () => {
    expect(() => pipe.transform('2023-01-01T10:30:00Z')).toThrow(BadRequestException);
  });

  it('rejects values outside the strict pattern', () => {
    expect(() => pipe.transform('01-2024')).toThrow(BadRequestException);
  });
});
