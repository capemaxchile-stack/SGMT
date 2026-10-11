import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateRequestFromSuggestionDto } from './dto/purchase-suggestion.dto';
import { MovementType, RequestStatus, RequestUrgency, Prisma } from '@prisma/client';

export interface PurchaseSuggestion {
  itemId: string;
  itemCode: string;
  itemDescription: string;
  category: string;
  unitOfMeasure: string;
  currentStock: number;
  minimumStock: number;
  totalOutbound60Days: number;
  dailyBurnRate: number;
  runwayDays: number | null;
  suggestedQuantity: number;
  urgency: RequestUrgency;
  reasons: string[];
  recommendedSupplier: {
    id: string;
    businessName: string;
    rut: string;
    isExclusive: boolean;
    lastPrice: number;
    leadTimeDays: number;
  } | null;
  estimatedTotalCost: number;
}

@Injectable()
export class PurchaseSuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(faenaId?: string): Promise<{
    suggestions: PurchaseSuggestion[];
    summary: {
      totalCriticalItems: number;
      totalHighTurnoverItems: number;
      estimatedReplenishmentCost: number;
    };
  }> {
    // 1. Fetch active items with stocks and catalog entries
    const items = await this.prisma.item.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        stocks: {
          include: { warehouse: true },
        },
        supplierCatalogs: {
          include: { supplier: true },
          orderBy: [{ isExclusive: 'desc' }, { lastPrice: 'asc' }],
        },
      },
    });

    // 2. Fetch dispatches (SALIDA) from past 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const movementWhere: Prisma.WarehouseMovementWhereInput = {
      type: MovementType.SALIDA,
      createdAt: { gte: sixtyDaysAgo },
    };
    if (faenaId) {
      movementWhere.faenaId = faenaId;
    }

    const dispatches = await this.prisma.warehouseMovementLine.findMany({
      where: {
        movement: movementWhere,
      },
      select: {
        itemId: true,
        quantity: true,
      },
    });

    const dispatchTotalsByItem = new Map<string, number>();
    for (const d of dispatches) {
      const current = dispatchTotalsByItem.get(d.itemId) || 0;
      dispatchTotalsByItem.set(d.itemId, current + Number(d.quantity));
    }

    // 3. Analyze each item
    const suggestions: PurchaseSuggestion[] = [];
    let totalCriticalCount = 0;
    let totalHighTurnoverCount = 0;
    let totalEstCost = 0;

    for (const item of items) {
      const totalStock = item.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
      const minStock = Number(item.minimumStock);
      const out60 = dispatchTotalsByItem.get(item.id) || 0;
      const dailyBurn = Number((out60 / 60).toFixed(2));
      const runwayDays = dailyBurn > 0 ? Math.floor(totalStock / dailyBurn) : null;

      const reasons: string[] = [];
      let urgency: RequestUrgency = RequestUrgency.NORMAL;
      let shouldSuggest = false;

      // Rule A: Stock below or equal to minimum
      if (totalStock <= minStock) {
        shouldSuggest = true;
        totalCriticalCount++;
        if (totalStock === 0) {
          urgency = RequestUrgency.DETIENE_EQUIPO;
          reasons.push(`Quiebre total de stock (0 ${item.unitOfMeasure} disponibles, mínimo requerido: ${minStock})`);
        } else {
          urgency = RequestUrgency.ALTA;
          reasons.push(`Stock bajo el mínimo de seguridad (${totalStock} ${item.unitOfMeasure} vs mínimo ${minStock})`);
        }
      }

      // Rule B: High turnover runway depletion (< 15 days of autonomy)
      if (dailyBurn > 0 && runwayDays !== null && runwayDays <= 15) {
        shouldSuggest = true;
        totalHighTurnoverCount++;
        reasons.push(`Alta rotación: consumo promedio de ${dailyBurn} ${item.unitOfMeasure}/día (autonomía proyectada: ${runwayDays} días)`);
        if (runwayDays <= 5 && urgency !== RequestUrgency.DETIENE_EQUIPO) {
          urgency = RequestUrgency.ALTA;
        }
      }

      if (shouldSuggest) {
        // Smart replenishment formula:
        // Coverage for 30 days of consumption + replenish minimum safety stock
        const safetyTarget = minStock * 1.5;
        const consumptionTarget = dailyBurn * 30;
        const targetStock = Math.max(safetyTarget, consumptionTarget, 5);
        let suggestedQty = Math.max(Math.ceil(targetStock - totalStock), 1);

        // Select best supplier
        const preferredCatalog = item.supplierCatalogs[0];
        const supplierInfo = preferredCatalog
          ? {
              id: preferredCatalog.supplier.id,
              businessName: preferredCatalog.supplier.businessName,
              rut: preferredCatalog.supplier.rut,
              isExclusive: preferredCatalog.isExclusive,
              lastPrice: Number(preferredCatalog.lastPrice),
              leadTimeDays: preferredCatalog.leadTimeDays,
            }
          : null;

        const unitCost = supplierInfo ? supplierInfo.lastPrice : 0;
        const lineTotalCost = suggestedQty * unitCost;
        totalEstCost += lineTotalCost;

        suggestions.push({
          itemId: item.id,
          itemCode: item.code,
          itemDescription: item.description,
          category: item.category,
          unitOfMeasure: item.unitOfMeasure,
          currentStock: totalStock,
          minimumStock: minStock,
          totalOutbound60Days: out60,
          dailyBurnRate: dailyBurn,
          runwayDays,
          suggestedQuantity: suggestedQty,
          urgency,
          reasons,
          recommendedSupplier: supplierInfo,
          estimatedTotalCost: lineTotalCost,
        });
      }
    }

    // Sort: DETIENE_EQUIPO -> ALTA -> NORMAL -> BAJA
    const urgencyOrder: Record<RequestUrgency, number> = {
      DETIENE_EQUIPO: 1,
      ALTA: 2,
      NORMAL: 3,
      BAJA: 4,
    };

    suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return {
      suggestions,
      summary: {
        totalCriticalItems: totalCriticalCount,
        totalHighTurnoverItems: totalHighTurnoverCount,
        estimatedReplenishmentCost: totalEstCost,
      },
    };
  }

  async generateRequestFromSuggestion(userId: string, dto: GenerateRequestFromSuggestionDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be selected for the request');
    }

    const faena = await this.prisma.faena.findUnique({
      where: { id: dto.faenaId },
    });
    if (!faena) {
      throw new NotFoundException(`Faena with id ${dto.faenaId} not found`);
    }

    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const latest = await this.prisma.purchaseRequest.findFirst({
      where: { requestNumber: { startsWith: `SOL-${dateStr}-` } },
      orderBy: { requestNumber: 'desc' },
      select: { requestNumber: true },
    });

    let nextSeq = 1;
    if (latest && latest.requestNumber) {
      const parts = latest.requestNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextSeq = lastNum + 1;
    }
    const seqStr = nextSeq >= 10000 ? nextSeq.toString() : nextSeq.toString().padStart(4, '0');
    const requestNumber = `SOL-${dateStr}-${seqStr}`;

    return this.prisma.purchaseRequest.create({
      data: {
        requestNumber,
        faenaId: dto.faenaId,
        requesterId: userId,
        status: RequestStatus.PENDIENTE,
        justification: dto.justification || 'Generado automáticamente por Asistente IA de Reposición Predictiva',
        lines: {
          create: dto.items.map((it) => ({
            itemId: it.itemId,
            quantity: new Prisma.Decimal(it.quantity),
            targetAssetId: it.targetAssetId || null,
            urgency: it.urgency || RequestUrgency.NORMAL,
            notes: it.notes || 'Sugerencia de abastecimiento por quiebre/rotación de bodega',
          })),
        },
      },
      include: {
        lines: { include: { item: true, targetAsset: true } },
        faena: true,
      },
    });
  }
}
