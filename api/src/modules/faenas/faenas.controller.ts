import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { FaenasService } from './faenas.service';
import { CreateFaenaDto } from './dto/create-faena.dto';
import { UpdateFaenaDto } from './dto/update-faena.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { FaenaStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('faenas')
export class FaenasController {
  constructor(private readonly faenasService: FaenasService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createFaenaDto: CreateFaenaDto) {
    return this.faenasService.create(createFaenaDto);
  }

  @Get()
  findAll(@Query('status') status?: FaenaStatus, @Query('search') search?: string) {
    return this.faenasService.findAll(status, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faenasService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateFaenaDto: UpdateFaenaDto) {
    return this.faenasService.update(id, updateFaenaDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.faenasService.remove(id);
  }

  @Post(':id/contracts')
  @Roles('ADMIN')
  addContract(@Param('id') id: string, @Body() createContractDto: CreateContractDto) {
    return this.faenasService.addContract(id, createContractDto);
  }

  @Post('contracts/:contractId/cost-centers')
  @Roles('ADMIN')
  addCostCenter(@Param('contractId') contractId: string, @Body() createCostCenterDto: CreateCostCenterDto) {
    return this.faenasService.addCostCenter(contractId, createCostCenterDto);
  }
}
