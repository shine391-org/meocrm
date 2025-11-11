import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetDebtReportDto } from './dto/get-debt-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('debt')
  @ApiOperation({ summary: 'Get customer debt report' })
  async getDebtReport(@Query() query: GetDebtReportDto) {
    return this.reportsService.getDebtReport(query);
  }
}
