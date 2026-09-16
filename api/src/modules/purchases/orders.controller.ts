import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';
import { OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('purchases/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'BODEGUERO')
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.ordersService.findAll(status, supplierId);
  }

  @Get(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'COMPRADOR')
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Patch(':id/status')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES')
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(id, updateDto, user.id);
  }

  @Post(':id/receive')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'BODEGUERO')
  receiveOrder(
    @Param('id') id: string,
    @Body() receiveDto: ReceiveOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.receiveOrder(id, receiveDto, user.id);
  }
}
