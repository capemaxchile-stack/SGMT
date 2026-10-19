import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('purchases/quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'BODEGUERO')
  findAll(
    @Query('purchaseRequestId') purchaseRequestId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: QuotationStatus,
  ) {
    return this.quotationsService.findAll(purchaseRequestId, supplierId, status);
  }

  @Get('insights/:itemId')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'BODEGUERO', 'SOLICITANTE_TERRENO')
  getItemInsights(@Param('itemId') itemId: string) {
    return this.quotationsService.getItemProcurementInsights(itemId);
  }

  @Get(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES', 'COMPRADOR', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'COMPRADOR')
  create(@Body() createDto: CreateQuotationDto) {
    return this.quotationsService.create(createDto);
  }

  @Put(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'COMPRADOR')
  update(@Param('id') id: string, @Body() updateDto: UpdateQuotationDto) {
    return this.quotationsService.update(id, updateDto);
  }

  @Patch(':id/select')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'COMPRADOR', 'GERENTE_OPERACIONES')
  selectQuotation(@Param('id') id: string) {
    return this.quotationsService.selectQuotation(id);
  }

  @Delete(':id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'COMPRADOR')
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}
