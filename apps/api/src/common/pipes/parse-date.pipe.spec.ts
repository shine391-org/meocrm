import { BadRequestException } from '@nestjs/common';
import { ParseDatePipe } from './parse-date.pipe';

describe('ParseDatePipe', () => {
  let pipe: ParseDatePipe;

  beforeEach(() => {
    pipe = new ParseDatePipe();
  });

  it('normalizes YYYY-MM inputs by adding the first day', () => {
    const result = pipe.transform('2025-02');
    expect(result.toISOString()).toBe('2025-02-01T00:00:00.000Z');
  });

  it('accepts full YYYY-MM-DD inputs without modification', () => {
    const result = pipe.transform('2023-07-12');
    expect(result.toISOString()).toBe('2023-07-12T00:00:00.000Z');
  });

  it('rejects timestamps with time components', () => {
    expect(() => pipe.transform('2023-01-01T10:30:00Z')).toThrow(BadRequestException);
  });

  it('rejects malformed strings', () => {
    expect(() => pipe.transform('01-2024')).toThrow(BadRequestException);
  });
});
