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
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { ConsumeItemDto } from './dto/consume-item.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { WorkOrderStatus, WorkOrderType, WorkOrderPriority } from '@prisma/client';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get('work-orders')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO')
  findAll(
    @Query('status') status?: WorkOrderStatus,
    @Query('type') type?: WorkOrderType,
    @Query('priority') priority?: WorkOrderPriority,
    @Query('assetId') assetId?: string,
    @Query('faenaId') faenaId?: string,
    @Query('search') search?: string,
  ) {
    return this.workOrdersService.findAll({ status, type, priority, assetId, faenaId, search });
  }

  @Get('alerts')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA')
  getAlerts() {
    return this.workOrdersService.getAlerts();
  }

  @Get('work-orders/:id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Post('work-orders')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA')
  create(@Body() dto: CreateWorkOrderDto, @CurrentUser() user: any) {
    return this.workOrdersService.create(dto, user.id);
  }

  @Patch('work-orders/:id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA')
  update(@Param('id') id: string, @Body() dto: UpdateWorkOrderDto) {
    return this.workOrdersService.update(id, dto);
  }

  @Post('work-orders/:id/items')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO')
  consumeItem(
    @Param('id') id: string,
    @Body() dto: ConsumeItemDto,
    @CurrentUser() user: any,
  ) {
    return this.workOrdersService.consumeItem(id, dto, user.id);
  }

  @Post('work-orders/:id/complete')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteWorkOrderDto,
  ) {
    return this.workOrdersService.complete(id, dto);
  }
}
