/* istanbul ignore file */
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'manager@lano.vn' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  email!: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])/, {
    message: 'Password cần chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  password!: string;

  @ApiProperty({ example: 'Manager Hanoi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: UserRole, default: UserRole.STAFF })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
