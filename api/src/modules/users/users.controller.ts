import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto, SetSuperKeyDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_ADMIN_FINANZAS', 'GERENTE_OPERACIONES')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('active')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_ADMIN_FINANZAS', 'GERENTE_OPERACIONES', 'COMPRADOR', 'BODEGUERO', 'JEFE_FAENA')
  findAllActive() {
    return this.usersService.findAllActive();
  }

  @Get('roles')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_ADMIN_FINANZAS', 'GERENTE_OPERACIONES')
  findRoles() {
    return this.usersService.findRoles();
  }

  @Get(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/password')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }

  @Patch(':id/super-key')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  setSuperKey(@Param('id') id: string, @Body() dto: SetSuperKeyDto) {
    return this.usersService.setSuperKey(id, dto);
  }
}
