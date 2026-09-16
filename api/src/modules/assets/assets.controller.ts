import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { AssetType, AssetOperationalStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES')
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  findAll(
    @Query('type') type?: AssetType,
    @Query('operationalStatus') operationalStatus?: AssetOperationalStatus,
    @Query('faenaId') faenaId?: string,
  ) {
    return this.assetsService.findAll(type, operationalStatus, faenaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA')
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Patch(':id/meter')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA', 'BODEGUERO', 'SOLICITANTE_TERRENO')
  updateMeter(@Param('id') id: string, @Body() updateMeterDto: UpdateMeterDto) {
    return this.assetsService.updateMeter(id, updateMeterDto);
  }

  @Post(':id/assign')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'JEFE_FAENA')
  assign(@Param('id') id: string, @Body() assignAssetDto: AssignAssetDto) {
    return this.assetsService.assign(id, assignAssetDto);
  }

  @Delete(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
