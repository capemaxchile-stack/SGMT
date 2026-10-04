import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { FilterReportsDto } from './dto/filter-reports.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('executive')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'GERENTE_ADMIN_FINANZAS', 'CONTADOR', 'JEFE_FAENA')
  getExecutiveSummary(@Query() filters: FilterReportsDto) {
    return this.reportsService.getExecutiveSummary(filters);
  }

  @Get('faena-closing/:faenaId')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'GERENTE_ADMIN_FINANZAS', 'CONTADOR', 'JEFE_FAENA')
  getFaenaClosing(
    @Param('faenaId') faenaId: string,
    @Query() filters: FilterReportsDto,
  ) {
    return this.reportsService.getFaenaClosing(faenaId, filters);
  }
}
