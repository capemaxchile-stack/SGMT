import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDocumentDto } from './dto/create-asset-document.dto';
import { UpdateAssetDocumentDto } from './dto/update-asset-document.dto';
import { CreateOperatorCertificationDto } from './dto/create-operator-certification.dto';
import { UpdateOperatorCertificationDto } from './dto/update-operator-certification.dto';
import { AssetDocumentQueryDto, OperatorCertificationQueryDto } from './dto/document-query.dto';

export type ExpirationStatus = 'VIGENTE' | 'POR_VENCER_30' | 'POR_VENCER_15' | 'CRITICO_5' | 'VENCIDO';

export function computeExpirationStatus(expirationDate: Date | string): {
  status: ExpirationStatus;
  daysRemaining: number;
} {
  const target = new Date(expirationDate);
  const now = new Date();
  
  // Strip hours for pure calendar date comparison
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const diffDays = Math.ceil((targetMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

  let status: ExpirationStatus = 'VIGENTE';
  if (diffDays < 0) {
    status = 'VENCIDO';
  } else if (diffDays <= 5) {
    status = 'CRITICO_5';
  } else if (diffDays <= 15) {
    status = 'POR_VENCER_15';
  } else if (diffDays <= 30) {
    status = 'POR_VENCER_30';
  } else {
    status = 'VIGENTE';
  }

  return { status, daysRemaining: diffDays };
}

@Injectable()
export class CertificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // ASSET DOCUMENTS
  // ---------------------------------------------------------------------------

  async createAssetDocument(dto: CreateAssetDocumentDto, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
    });
    if (!asset) {
      throw new NotFoundException(`Maquinaria/Activo con ID ${dto.assetId} no encontrado`);
    }

    const doc = await this.prisma.assetDocument.create({
      data: {
        assetId: dto.assetId,
        docType: dto.docType,
        documentNumber: dto.documentNumber,
        issuingEntity: dto.issuingEntity,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expirationDate: new Date(dto.expirationDate),
        fileUrl: dto.fileUrl,
        notes: dto.notes,
        isMandatory: dto.isMandatory ?? true,
        createdById: userId,
      },
      include: {
        asset: {
          select: {
            id: true,
            internalNumber: true,
            type: true,
            brand: true,
            model: true,
            licensePlate: true,
            operationalStatus: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const statusInfo = computeExpirationStatus(doc.expirationDate);
    return { ...doc, ...statusInfo };
  }

  async findAllAssetDocuments(query: AssetDocumentQueryDto = {}) {
    const where: any = {};
    if (query.assetId) where.assetId = query.assetId;
    if (query.docType) where.docType = query.docType;

    const docs = await this.prisma.assetDocument.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            internalNumber: true,
            type: true,
            brand: true,
            model: true,
            licensePlate: true,
            operationalStatus: true,
            assignments: {
              where: { endDate: null },
              include: { faena: { select: { id: true, name: true } } },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { expirationDate: 'asc' },
    });

    const enriched = docs.map((d) => {
      const statusInfo = computeExpirationStatus(d.expirationDate);
      return { ...d, ...statusInfo };
    });

    if (query.status) {
      if (query.status === 'VENCIDO') {
        return enriched.filter((d) => d.status === 'VENCIDO');
      }
      if (query.status === 'CRITICO') {
        return enriched.filter((d) => d.status === 'CRITICO_5');
      }
      if (query.status === 'POR_VENCER') {
        return enriched.filter((d) => d.status === 'POR_VENCER_15' || d.status === 'POR_VENCER_30');
      }
      if (query.status === 'VIGENTE') {
        return enriched.filter((d) => d.status === 'VIGENTE');
      }
    }

    return enriched;
  }

  async findOneAssetDocument(id: string) {
    const doc = await this.prisma.assetDocument.findUnique({
      where: { id },
      include: {
        asset: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }
    return { ...doc, ...computeExpirationStatus(doc.expirationDate) };
  }

  async updateAssetDocument(id: string, dto: UpdateAssetDocumentDto) {
    const existing = await this.prisma.assetDocument.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }

    const doc = await this.prisma.assetDocument.update({
      where: { id },
      data: {
        docType: dto.docType,
        documentNumber: dto.documentNumber,
        issuingEntity: dto.issuingEntity,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        fileUrl: dto.fileUrl,
        notes: dto.notes,
        isMandatory: dto.isMandatory,
      },
      include: {
        asset: {
          select: {
            id: true,
            internalNumber: true,
            type: true,
            brand: true,
            model: true,
            licensePlate: true,
          },
        },
      },
    });

    return { ...doc, ...computeExpirationStatus(doc.expirationDate) };
  }

  async deleteAssetDocument(id: string) {
    const existing = await this.prisma.assetDocument.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }
    return this.prisma.assetDocument.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // OPERATOR CERTIFICATIONS
  // ---------------------------------------------------------------------------

  async createOperatorCertification(dto: CreateOperatorCertificationDto, userId: string) {
    if (dto.faenaId) {
      const faena = await this.prisma.faena.findUnique({ where: { id: dto.faenaId } });
      if (!faena) {
        throw new NotFoundException(`Faena con ID ${dto.faenaId} no encontrada`);
      }
    }

    const cert = await this.prisma.operatorCertification.create({
      data: {
        operatorName: dto.operatorName,
        rut: dto.rut.trim(),
        jobTitle: dto.jobTitle,
        faenaId: dto.faenaId,
        docType: dto.docType,
        documentNumber: dto.documentNumber,
        issuingEntity: dto.issuingEntity,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expirationDate: new Date(dto.expirationDate),
        fileUrl: dto.fileUrl,
        notes: dto.notes,
        createdById: userId,
      },
      include: {
        faena: { select: { id: true, name: true, location: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return { ...cert, ...computeExpirationStatus(cert.expirationDate) };
  }

  async findAllOperatorCertifications(query: OperatorCertificationQueryDto = {}) {
    const where: any = {};
    if (query.rut) where.rut = { contains: query.rut, mode: 'insensitive' };
    if (query.faenaId) where.faenaId = query.faenaId;
    if (query.docType) where.docType = query.docType;

    const certs = await this.prisma.operatorCertification.findMany({
      where,
      include: {
        faena: { select: { id: true, name: true, location: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { expirationDate: 'asc' },
    });

    const enriched = certs.map((c) => {
      const statusInfo = computeExpirationStatus(c.expirationDate);
      return { ...c, ...statusInfo };
    });

    if (query.status) {
      if (query.status === 'VENCIDO') {
        return enriched.filter((c) => c.status === 'VENCIDO');
      }
      if (query.status === 'CRITICO') {
        return enriched.filter((c) => c.status === 'CRITICO_5');
      }
      if (query.status === 'POR_VENCER') {
        return enriched.filter((c) => c.status === 'POR_VENCER_15' || c.status === 'POR_VENCER_30');
      }
      if (query.status === 'VIGENTE') {
        return enriched.filter((c) => c.status === 'VIGENTE');
      }
    }

    return enriched;
  }

  async findOneOperatorCertification(id: string) {
    const cert = await this.prisma.operatorCertification.findUnique({
      where: { id },
      include: {
        faena: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!cert) {
      throw new NotFoundException(`Certificación con ID ${id} no encontrada`);
    }
    return { ...cert, ...computeExpirationStatus(cert.expirationDate) };
  }

  async updateOperatorCertification(id: string, dto: UpdateOperatorCertificationDto) {
    const existing = await this.prisma.operatorCertification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Certificación con ID ${id} no encontrada`);
    }

    const cert = await this.prisma.operatorCertification.update({
      where: { id },
      data: {
        operatorName: dto.operatorName,
        rut: dto.rut ? dto.rut.trim() : undefined,
        jobTitle: dto.jobTitle,
        faenaId: dto.faenaId,
        docType: dto.docType,
        documentNumber: dto.documentNumber,
        issuingEntity: dto.issuingEntity,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        fileUrl: dto.fileUrl,
        notes: dto.notes,
      },
      include: {
        faena: { select: { id: true, name: true } },
      },
    });

    return { ...cert, ...computeExpirationStatus(cert.expirationDate) };
  }

  async deleteOperatorCertification(id: string) {
    const existing = await this.prisma.operatorCertification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Certificación con ID ${id} no encontrada`);
    }
    return this.prisma.operatorCertification.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // GLOBAL RADAR DE VENCIMIENTOS
  // ---------------------------------------------------------------------------

  async getExpirationRadar(daysAhead = 30) {
    const assetDocs = await this.findAllAssetDocuments();
    const operatorCerts = await this.findAllOperatorCertifications();

    const expiredAssets = assetDocs.filter((d) => d.status === 'VENCIDO');
    const criticalAssets = assetDocs.filter((d) => d.status === 'CRITICO_5');
    const warningAssets = assetDocs.filter((d) => d.status === 'POR_VENCER_15' || d.status === 'POR_VENCER_30');

    const expiredOperators = operatorCerts.filter((c) => c.status === 'VENCIDO');
    const criticalOperators = operatorCerts.filter((c) => c.status === 'CRITICO_5');
    const warningOperators = operatorCerts.filter((c) => c.status === 'POR_VENCER_15' || c.status === 'POR_VENCER_30');

    // Combine items for unified timeline
    const combinedRadarItems = [
      ...assetDocs.map((d) => ({
        category: 'ASSET' as const,
        id: d.id,
        targetId: d.assetId,
        title: `Equipo ${d.asset.internalNumber} (${d.asset.type}) - ${d.asset.brand} ${d.asset.model}`,
        subtitle: `Patente: ${d.asset.licensePlate || 'S/P'} | Faena: ${d.asset.assignments?.[0]?.faena?.name || 'Bodega Central'}`,
        docType: d.docType,
        documentNumber: d.documentNumber,
        issuingEntity: d.issuingEntity,
        expirationDate: d.expirationDate,
        status: d.status,
        daysRemaining: d.daysRemaining,
        fileUrl: d.fileUrl,
      })),
      ...operatorCerts.map((c) => ({
        category: 'OPERATOR' as const,
        id: c.id,
        targetId: c.rut,
        title: `${c.operatorName} (${c.jobTitle || 'Operador'})`,
        subtitle: `RUT: ${c.rut} | Faena: ${c.faena?.name || 'Sin faena asignada'}`,
        docType: c.docType,
        documentNumber: c.documentNumber,
        issuingEntity: c.issuingEntity,
        expirationDate: c.expirationDate,
        status: c.status,
        daysRemaining: c.daysRemaining,
        fileUrl: c.fileUrl,
      })),
    ].sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      metrics: {
        totalAssetDocs: assetDocs.length,
        expiredAssetsCount: expiredAssets.length,
        criticalAssetsCount: criticalAssets.length,
        warningAssetsCount: warningAssets.length,
        totalOperatorCerts: operatorCerts.length,
        expiredOperatorsCount: expiredOperators.length,
        criticalOperatorsCount: criticalOperators.length,
        warningOperatorsCount: warningOperators.length,
        expiredTotal: expiredAssets.length + expiredOperators.length,
        criticalTotal: criticalAssets.length + criticalOperators.length,
        warningTotal: warningAssets.length + warningOperators.length,
      },
      radarItems: combinedRadarItems,
    };
  }
}
