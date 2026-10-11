import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProcurementAuditService } from './procurement-audit.service';

@Controller('purchases/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcurementAuditController {
  constructor(private readonly auditService: ProcurementAuditService) {}

  @Get('fraud-radar')
  @Roles('JEFE_FAENA', 'GERENTE_OPERACIONES', 'GERENTE_ADMIN_FINANZAS', 'CONTADOR', 'SUPER_USUARIO', 'ADMIN_SISTEMA')
  async getFraudRadar(@Query('faenaId') faenaId?: string) {
    return this.auditService.getFraudRadar(faenaId);
  }
}
