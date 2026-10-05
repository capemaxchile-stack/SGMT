import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CertificationsService } from './certifications.service';
import { CreateAssetDocumentDto } from './dto/create-asset-document.dto';
import { UpdateAssetDocumentDto } from './dto/update-asset-document.dto';
import { CreateOperatorCertificationDto } from './dto/create-operator-certification.dto';
import { UpdateOperatorCertificationDto } from './dto/update-operator-certification.dto';
import {
  AssetDocumentQueryDto,
  OperatorCertificationQueryDto,
  RadarQueryDto,
} from './dto/document-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('certifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificationsController {
  constructor(private readonly certificationsService: CertificationsService) {}

  // ---------------------------------------------------------------------------
  // RADAR DE VENCIMIENTOS
  // ---------------------------------------------------------------------------

  @Get('radar')
  getRadar(@Query() query: RadarQueryDto) {
    return this.certificationsService.getExpirationRadar(query.daysAhead);
  }

  // ---------------------------------------------------------------------------
  // ASSET DOCUMENTS
  // ---------------------------------------------------------------------------

  @Get('assets')
  findAllAssetDocs(@Query() query: AssetDocumentQueryDto) {
    return this.certificationsService.findAllAssetDocuments(query);
  }

  @Get('assets/:id')
  findOneAssetDoc(@Param('id') id: string) {
    return this.certificationsService.findOneAssetDocument(id);
  }

  @Post('assets')
  @Roles(
    'ADMIN_SISTEMA',
    'SUPER_USUARIO',
    'GERENTE_OPERACIONES',
    'JEFE_FAENA',
    'SUPERVISOR_BODEGA',
  )
  @UseInterceptors(AuditInterceptor)
  createAssetDoc(
    @Body() dto: CreateAssetDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.certificationsService.createAssetDocument(dto, userId);
  }

  @Patch('assets/:id')
  @Roles(
    'ADMIN_SISTEMA',
    'SUPER_USUARIO',
    'GERENTE_OPERACIONES',
    'JEFE_FAENA',
    'SUPERVISOR_BODEGA',
  )
  @UseInterceptors(AuditInterceptor)
  updateAssetDoc(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDocumentDto,
  ) {
    return this.certificationsService.updateAssetDocument(id, dto);
  }

  @Delete('assets/:id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES')
  @UseInterceptors(AuditInterceptor)
  deleteAssetDoc(@Param('id') id: string) {
    return this.certificationsService.deleteAssetDocument(id);
  }

  // ---------------------------------------------------------------------------
  // OPERATOR CERTIFICATIONS
  // ---------------------------------------------------------------------------

  @Get('operators')
  findAllOperatorCerts(@Query() query: OperatorCertificationQueryDto) {
    return this.certificationsService.findAllOperatorCertifications(query);
  }

  @Get('operators/:id')
  findOneOperatorCert(@Param('id') id: string) {
    return this.certificationsService.findOneOperatorCertification(id);
  }

  @Post('operators')
  @Roles(
    'ADMIN_SISTEMA',
    'SUPER_USUARIO',
    'GERENTE_OPERACIONES',
    'JEFE_FAENA',
    'SUPERVISOR_BODEGA',
  )
  @UseInterceptors(AuditInterceptor)
  createOperatorCert(
    @Body() dto: CreateOperatorCertificationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.certificationsService.createOperatorCertification(dto, userId);
  }

  @Patch('operators/:id')
  @Roles(
    'ADMIN_SISTEMA',
    'SUPER_USUARIO',
    'GERENTE_OPERACIONES',
    'JEFE_FAENA',
    'SUPERVISOR_BODEGA',
  )
  @UseInterceptors(AuditInterceptor)
  updateOperatorCert(
    @Param('id') id: string,
    @Body() dto: UpdateOperatorCertificationDto,
  ) {
    return this.certificationsService.updateOperatorCertification(id, dto);
  }

  @Delete('operators/:id')
  @Roles('ADMIN_SISTEMA', 'SUPER_USUARIO', 'GERENTE_OPERACIONES')
  @UseInterceptors(AuditInterceptor)
  deleteOperatorCert(@Param('id') id: string) {
    return this.certificationsService.deleteOperatorCertification(id);
  }
}
