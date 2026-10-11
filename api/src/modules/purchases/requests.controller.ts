import { Controller, Get, Post, Body, Param, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('purchases/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'JEFE_FAENA', 'SOLICITANTE_TERRENO', 'BODEGUERO')
  findAll() {
    return this.requestsService.findAll();
  }

  @Get(':id/timeline')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'JEFE_FAENA', 'SOLICITANTE_TERRENO', 'BODEGUERO')
  getTimeline(@Param('id') id: string) {
    return this.requestsService.getTimeline(id);
  }

  @Get(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'JEFE_FAENA', 'SOLICITANTE_TERRENO', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'SOLICITANTE_TERRENO', 'BODEGUERO', 'COMPRADOR')
  create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.create(createRequestDto, user.id);
  }

  @Patch(':id/status')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'JEFE_FAENA')
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateRequestStatusDto,
  ) {
    return this.requestsService.updateStatus(id, updateDto);
  }
}
