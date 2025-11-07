import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEmail, 
  MaxLength, 
  Matches 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ 
    example: 'Nguyễn Văn A', 
    description: 'Customer full name',
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    example: '0901234567', 
    description: 'Phone number (10-11 digits)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,11}$/, { message: 'Phone must be 10-11 digits' })
  phone: string;

  @ApiPropertyOptional({ 
    example: 'nguyenva@example.com', 
    description: 'Email address' 
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ 
    example: '123 Lê Lợi, Q1, HCM', 
    description: 'Full street address' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ 
    example: 'Hồ Chí Minh', 
    description: 'Province/City' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ 
    example: 'Quận 1', 
    description: 'District' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ 
    example: 'Phường Bến Nghé', 
    description: 'Ward' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ward?: string;

  @ApiPropertyOptional({ 
    example: 'VIP', 
    description: 'Customer segment/tier' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  segment?: string;
}
