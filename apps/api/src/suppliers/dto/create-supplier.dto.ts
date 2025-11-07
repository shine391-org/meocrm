import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
@ApiProperty({ example: 'Công ty Da Bò Việt' })
@IsString()
@IsNotEmpty()
@MaxLength(100)
name!: string;

@ApiProperty({ example: '0287654321' })
@IsString()
@IsNotEmpty()
@Length(10, 11)
phone!: string;

@ApiPropertyOptional({ example: 'contact@daboviet.com' })
@IsEmail()
@IsOptional()
email?: string;

@ApiPropertyOptional({ example: '456 Nguyễn Huệ, Q1, HCM' })
@IsString()
@IsOptional()
@MaxLength(500)
address?: string;

@ApiPropertyOptional({ example: '0123456789' })
@IsString()
@IsOptional()
@Length(10, 10)
taxCode?: string;
}
