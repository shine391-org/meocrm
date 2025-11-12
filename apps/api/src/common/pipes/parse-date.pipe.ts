import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const STRICT_DATE_REGEX = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    const match = typeof value === 'string' ? STRICT_DATE_REGEX.exec(value) : null;
    if (!match) {
      throw new BadRequestException('Validation failed: date must be a valid date string (YYYY-MM-DD or YYYY-MM).');
    }

    const [, year, month, day] = match;
    const normalizedDay = day ?? '01';
    const isoString = `${year}-${month}-${normalizedDay}T00:00:00.000Z`;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Validation failed: Invalid date value.');
    }

    return date;
  }
}
