
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '@prisma/client';

// TODO: Add DTO for query params and role-based guards
@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('debt-snapshots')
  @ApiOperation({ summary: 'Get customer debt snapshots' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved debt snapshots.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getDebtSnapshots(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('customerId') customerId?: string,
    @Query('groupBy') groupBy?: 'day' | 'month',
  ) {
    return this.reportsService.findDebtSnapshots({
      organizationId: user.organizationId,
      dateFrom,
      dateTo,
      customerId,
      groupBy,
    });
  }
}
