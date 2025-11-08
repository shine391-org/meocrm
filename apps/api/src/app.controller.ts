import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check with database status' })
  @ApiResponse({ status: 200, description: 'Returns API and database health' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0',
    };
  }
}
