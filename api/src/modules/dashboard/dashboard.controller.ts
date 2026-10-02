import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Roles(
    'ADMIN_SISTEMA',
    'SUPER_USUARIO',
    'GERENTE_OPERACIONES',
    'GERENTE_ADMIN_FINANZAS',
    'JEFE_FAENA',
    'SUPERVISOR_BODEGA',
    'BODEGUERO',
    'COMPRADOR',
    'CONTADOR',
    'SOLICITANTE_TERRENO',
  )
  async getMetrics() {
    return this.dashboardService.getMetrics();
  }
}
