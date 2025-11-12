import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookDto } from './create-webhook.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
  @ApiPropertyOptional({ description: 'Webhook URL', example: 'https://hooks.example.com/meocrm' })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Event subscriptions', isArray: true, type: String })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  events?: string[];

  @ApiPropertyOptional({ description: 'New plaintext secret' })
  @IsString()
  @IsOptional()
  secret?: string;

  @ApiPropertyOptional({ description: 'Active state' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
