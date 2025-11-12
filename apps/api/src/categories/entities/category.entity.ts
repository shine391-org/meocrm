/* istanbul ignore file */
import { ApiProperty } from '@nestjs/swagger';

export class CategoryEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: () => [CategoryEntity] })
  children?: CategoryEntity[];

  @ApiProperty({ type: () => CategoryEntity, nullable: true })
  parent?: CategoryEntity | null;
}
