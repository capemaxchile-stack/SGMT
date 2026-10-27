import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 50;

    let targetTenantId = tenantId;
    const isSuperUser = req.user?.roles?.includes('SUPER_USUARIO');
    if (!isSuperUser && req.user?.tenantId) {
      targetTenantId = req.user.tenantId;
    }

    return this.auditService.findAll(skipNum, takeNum, {
      entity,
      action,
      tenantId: targetTenantId,
    });
  }
}
