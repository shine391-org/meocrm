/* istanbul ignore file */
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isDateString } from 'class-validator';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    if (!isDateString(value)) {
      throw new BadRequestException('Validation failed: date must be a valid date string (YYYY-MM-DD or YYYY-MM).');
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        throw new BadRequestException('Validation failed: Invalid date value.');
    }
    return date;
  }
}
