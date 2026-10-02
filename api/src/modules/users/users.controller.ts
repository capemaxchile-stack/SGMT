import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_ADMIN_FINANZAS', 'GERENTE_OPERACIONES')
  findAll() {
    return this.usersService.findAllActive();
  }

  @Get('roles')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_ADMIN_FINANZAS', 'GERENTE_OPERACIONES')
  findRoles() {
    return this.usersService.findRoles();
  }
}
