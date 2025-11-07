import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsPhoneNumber('VN')
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsOptional()
  segment?: string;
}
