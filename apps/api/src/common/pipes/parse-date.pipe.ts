import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const STRICT_DATE_REGEX = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12][0-9]|3[01]))?$/;

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    const match = typeof value === 'string' ? STRICT_DATE_REGEX.exec(value) : null;
    if (!match) {
      throw new BadRequestException('Validation failed: date must be a valid date string (YYYY-MM-DD or YYYY-MM).');
    }

    const [, yearStr, monthStr, dayStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = dayStr ? Number(dayStr) : 1;

    if (!this.isValidCalendarDate(year, month, day)) {
      throw new BadRequestException('Validation failed: Invalid date value.');
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  private isValidCalendarDate(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12) {
      return false;
    }

    const maxDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day >= 1 && day <= maxDaysInMonth;
  }
}
