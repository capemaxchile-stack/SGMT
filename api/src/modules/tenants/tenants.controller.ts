import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateBackendAdminDto } from './dto/create-backend-admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('SUPER_USUARIO', 'ADMIN_SISTEMA')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('current')
  async getCurrent(@Request() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return {
        isSingleTenant: true,
        planTier: 'ENTERPRISE',
        enabledModules: [
          'DASHBOARD',
          'FAENAS',
          'FLOTA',
          'CERTIFICACIONES',
          'MANTENIMIENTO',
          'COMBUSTIBLE',
          'BODEGA',
          'COMPRAS',
          'REPORTES',
          'TERRENO',
          'COPILOT',
          'DOCUMENTACION',
          'ADMINISTRACION',
        ],
      };
    }
    return this.tenantsService.findOne(tenantId);
  }

  @Get('backend-admins')
  @Roles('SUPER_USUARIO')
  getBackendAdmins() {
    return this.tenantsService.getBackendAdmins();
  }

  @Post('backend-admins')
  @Roles('SUPER_USUARIO')
  createBackendAdmin(@Body() dto: CreateBackendAdminDto) {
    return this.tenantsService.createBackendAdmin(dto);
  }

  @Post(':id/impersonate')
  @Roles('SUPER_USUARIO')
  impersonate(@Param('id') id: string, @Request() req: any) {
    return this.tenantsService.impersonate(id, req.user);
  }

  @Get(':id')
  @Roles('SUPER_USUARIO', 'ADMIN_SISTEMA', 'GERENTE_ADMIN_FINANZAS')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    if (!user.roles?.includes('SUPER_USUARIO') && user.tenantId && user.tenantId !== id) {
      throw new ForbiddenException('No tienes permiso para consultar información de otra empresa.');
    }
    return this.tenantsService.findOne(id);
  }

  @Get(':id/usage')
  @Roles('SUPER_USUARIO', 'ADMIN_SISTEMA', 'GERENTE_ADMIN_FINANZAS')
  async getUsage(
    @Param('id') id: string,
    @Query('period') period: string,
    @Request() req: any,
  ) {
    const user = req.user;
    if (!user.roles?.includes('SUPER_USUARIO') && user.tenantId && user.tenantId !== id) {
      throw new ForbiddenException('No tienes permiso para consultar métricas de otra empresa.');
    }
    return this.tenantsService.getUsage(id, period);
  }

  @Post()
  @Roles('SUPER_USUARIO')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_USUARIO')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Get(':id/export')
  @Roles('SUPER_USUARIO')
  exportTenant(@Param('id') id: string) {
    return this.tenantsService.exportTenantData(id);
  }
}
