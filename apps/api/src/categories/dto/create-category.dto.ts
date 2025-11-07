import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Ví da' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'category-id-parent', description: 'Parent category ID for sub-categories' })
  @IsString()
  @IsOptional()
  parentId?: string;
}
