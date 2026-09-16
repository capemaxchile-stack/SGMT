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
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR')
  findAll() {
    return this.requestsService.findAll();
  }

  @Post()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES')
  create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.create(createRequestDto, user.id);
  }

  @Patch(':id/status')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR')
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateRequestStatusDto,
  ) {
    return this.requestsService.updateStatus(id, updateDto);
  }
}
