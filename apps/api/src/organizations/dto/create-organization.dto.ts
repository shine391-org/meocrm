import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Lano Hanoi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'lano-hn',
    description: 'Unique slug used for multi-tenant routing',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(/^(?=.*[a-z])(?!.*--)[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug phải viết thường, phân tách bằng dấu gạch ngang và không chứa khoảng trắng/hai dấu gạch liên tiếp',
  })
  @MaxLength(60)
  slug!: string;

  @ApiProperty({
    example: 'LANO-HN',
    description: 'Unique organization code used during user registration',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Code chỉ chấp nhận ký tự in hoa, số và dấu gạch ngang',
  })
  code!: string;
}
