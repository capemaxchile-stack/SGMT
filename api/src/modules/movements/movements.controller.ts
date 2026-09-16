import { Controller, Get, Post, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get('movements')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'BODEGUERO')
  findAll(@Query() filterDto: FilterMovementsDto) {
    return this.movementsService.findAll(filterDto);
  }

  @Get('movements/:id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.movementsService.findOne(id);
  }

  @Post('movements')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'BODEGUERO')
  create(
    @Body() createMovementDto: CreateMovementDto,
    @CurrentUser() user: any,
  ) {
    return this.movementsService.create(createMovementDto, user.id);
  }

  @Get('inventory/stock')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'BODEGUERO', 'COMPRADOR')
  getStock() {
    return this.movementsService.getStock();
  }

  @Get('inventory/kardex/:itemId')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'BODEGUERO')
  getKardex(@Param('itemId') itemId: string) {
    return this.movementsService.getKardex(itemId);
  }
}
