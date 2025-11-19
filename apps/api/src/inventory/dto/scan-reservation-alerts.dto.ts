import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ScanReservationAlertsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAgeMinutes = 30;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minQuantity = 1;

  @IsOptional()
  @IsString()
  orderId?: string;
}
