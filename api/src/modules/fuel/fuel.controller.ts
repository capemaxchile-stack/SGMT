import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FuelService } from './fuel.service';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { FilterFuelLogsDto } from './dto/filter-fuel-logs.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('fuel')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Get()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO')
  findAll(@Query() filters: FilterFuelLogsDto) {
    return this.fuelService.findAll(filters);
  }

  @Get('stats')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO')
  getStats() {
    return this.fuelService.getStats();
  }

  @Get(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.fuelService.findOne(id);
  }

  @Post()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO')
  create(@Body() dto: CreateFuelLogDto, @CurrentUser() user: any) {
    return this.fuelService.create(dto, user.id);
  }
}
