import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsDate, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GetDebtReportDto {
  @ApiProperty({ enum: ['day', 'month'], example: 'day' })
  @IsIn(['day', 'month'])
  groupBy: 'day' | 'month';

  @ApiProperty({ required: false, example: '2025-11-01' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @ApiProperty({ required: false, example: '2025-11-30' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
