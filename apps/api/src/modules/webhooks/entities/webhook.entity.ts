import { ApiProperty } from '@nestjs/swagger';

export class WebhookEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ isArray: true, type: String })
  events!: string[];

  @ApiProperty({ default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Flag indicating whether a secret is stored.' })
  hasSecret!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
