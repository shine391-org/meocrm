import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: 'CONFIRMED' })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiProperty({ required: false, example: 'Đã xác nhận với khách' })
  @IsOptional()
  @IsString()
  notes?: string;
}
