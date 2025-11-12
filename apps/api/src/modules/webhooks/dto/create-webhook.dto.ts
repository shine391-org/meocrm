import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Destination URL that will receive webhook calls.',
    example: 'https://hooks.example.com/meocrm',
  })
  @IsUrl()
  url!: string;

  @ApiProperty({
    description: 'List of event keys the webhook subscribes to.',
    example: ['order.completed', 'inventory.low'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events!: string[];

  @ApiProperty({
    description: 'Plaintext secret used to sign webhook payloads.',
    example: 'whsec_1234567890abcdef',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @ApiProperty({
    description: 'Whether the webhook is active.',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
