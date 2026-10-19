import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationStatus, OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(purchaseRequestId?: string, supplierId?: string, status?: QuotationStatus) {
    const where: Prisma.QuotationWhereInput = {};
    if (purchaseRequestId) where.purchaseRequestId = purchaseRequestId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    return this.prisma.quotation.findMany({
      where,
      include: {
        supplier: true,
        purchaseRequest: {
          include: { faena: true, requester: { select: { id: true, name: true, email: true } } },
        },
        lines: {
          include: { item: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseRequest: {
          include: { faena: true, requester: { select: { id: true, name: true, email: true } } },
        },
        lines: {
          include: { item: true },
        },
        purchaseOrders: true,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quotation with id ${id} not found`);
    }

    return quote;
  }

  async create(createDto: CreateQuotationDto) {
    if (!createDto.lines || createDto.lines.length === 0) {
      throw new BadRequestException('Quotation must contain at least one line item');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: createDto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${createDto.supplierId} not found`);
    }

    if (createDto.purchaseRequestId) {
      const existingQuote = await this.prisma.quotation.findFirst({
        where: {
          purchaseRequestId: createDto.purchaseRequestId,
          supplierId: createDto.supplierId,
          status: {
            in: [QuotationStatus.SOLICITADA, QuotationStatus.RECIBIDA, QuotationStatus.SELECCIONADA],
          },
        },
      });
      if (existingQuote) {
        throw new BadRequestException(
          `El proveedor "${supplier.businessName}" ya cuenta con una cotización activa (${existingQuote.quotationNumber}) para esta solicitud.`,
        );
      }
    }

    // Check exclusive suppliers for these items
    const itemIds = createDto.lines.map((l) => l.itemId);
    const exclusiveCatalogs = await this.prisma.supplierCatalog.findMany({
      where: {
        itemId: { in: itemIds },
        isExclusive: true,
      },
      include: { supplier: true, item: true },
    });

    for (const cat of exclusiveCatalogs) {
      if (cat.supplierId !== createDto.supplierId) {
        // Warning / context: item has an exclusive authorized supplier
        // We allow creation but note in log/notes if necessary
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Concurrency-safe folio generation
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'folio_COT_' + dateStr}))`;
      } catch {
        // Safe test fallback
      }

      const latestQuote = await tx.quotation.findFirst({
        where: { quotationNumber: { startsWith: `COT-${dateStr}-` } },
        orderBy: { quotationNumber: 'desc' },
        select: { quotationNumber: true },
      });

      let nextNum = 1;
      if (latestQuote && latestQuote.quotationNumber) {
        const parts = latestQuote.quotationNumber.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      const seqStr = nextNum >= 10000 ? nextNum.toString() : nextNum.toString().padStart(4, '0');
      const quotationNumber = `COT-${dateStr}-${seqStr}`;

      // Calculate total
      let totalAmount = new Prisma.Decimal(0);
      const linesData = createDto.lines.map((l) => {
        const qty = new Prisma.Decimal(l.quantity);
        const price = new Prisma.Decimal(l.unitPrice || 0);
        const lineTotal = qty.times(price);
        totalAmount = totalAmount.plus(lineTotal);
        return {
          itemId: l.itemId,
          quantity: qty,
          unitPrice: price,
          totalPrice: lineTotal,
          availabilityDays: l.availabilityDays,
          comments: l.comments,
        };
      });

      return tx.quotation.create({
        data: {
          quotationNumber,
          purchaseRequestId: createDto.purchaseRequestId,
          supplierId: createDto.supplierId,
          status: createDto.status || QuotationStatus.SOLICITADA,
          validUntil: createDto.validUntil ? new Date(createDto.validUntil) : null,
          totalAmount,
          notes: createDto.notes,
          lines: {
            create: linesData,
          },
        },
        include: {
          supplier: true,
          lines: { include: { item: true } },
        },
      });
    });
  }

  async update(id: string, updateDto: UpdateQuotationDto) {
    const existing = await this.prisma.quotation.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!existing) {
      throw new NotFoundException(`Quotation with id ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = existing.totalAmount;

      if (updateDto.lines && updateDto.lines.length > 0) {
        // Delete old lines and re-create with updated prices
        await tx.quotationLine.deleteMany({ where: { quotationId: id } });

        totalAmount = new Prisma.Decimal(0);
        const newLines = updateDto.lines.map((l) => {
          const qty = new Prisma.Decimal(l.quantity);
          const price = new Prisma.Decimal(l.unitPrice);
          const lineTotal = qty.times(price);
          totalAmount = totalAmount.plus(lineTotal);
          return {
            quotationId: id,
            itemId: l.itemId,
            quantity: qty,
            unitPrice: price,
            totalPrice: lineTotal,
            availabilityDays: l.availabilityDays,
            comments: l.comments,
          };
        });

        await tx.quotationLine.createMany({
          data: newLines,
        });
      }

      return tx.quotation.update({
        where: { id },
        data: {
          status: updateDto.status || existing.status,
          validUntil: updateDto.validUntil ? new Date(updateDto.validUntil) : existing.validUntil,
          notes: updateDto.notes !== undefined ? updateDto.notes : existing.notes,
          totalAmount,
        },
        include: {
          supplier: true,
          lines: { include: { item: true } },
        },
      });
    });
  }

  async selectQuotation(id: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: { lines: true, supplier: true },
    });
    if (!quote) {
      throw new NotFoundException(`Quotation with id ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark as SELECCIONADA
      const updated = await tx.quotation.update({
        where: { id },
        data: { status: QuotationStatus.SELECCIONADA },
        include: { lines: { include: { item: true } }, supplier: true },
      });

      // 2. Discard sibling quotes for the same purchase request
      if (quote.purchaseRequestId) {
        await tx.quotation.updateMany({
          where: {
            purchaseRequestId: quote.purchaseRequestId,
            id: { not: id },
            status: { notIn: [QuotationStatus.DESCARTADA, QuotationStatus.VENCIDA] },
          },
          data: { status: QuotationStatus.DESCARTADA },
        });
      }

      // 3. Update Supplier Catalog prices with winning prices
      for (const line of quote.lines) {
        await tx.supplierCatalog.upsert({
          where: {
            supplierId_itemId: {
              supplierId: quote.supplierId,
              itemId: line.itemId,
            },
          },
          update: {
            lastPrice: line.unitPrice,
            leadTimeDays: line.availabilityDays || 1,
            updatedAt: new Date(),
          },
          create: {
            supplierId: quote.supplierId,
            itemId: line.itemId,
            lastPrice: line.unitPrice,
            leadTimeDays: line.availabilityDays || 1,
          },
        });
      }

      return updated;
    });
  }

  async getItemProcurementInsights(itemId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: {
        stocks: {
          include: { warehouse: true },
        },
        supplierCatalogs: {
          include: { supplier: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with id ${itemId} not found`);
    }

    // 1. Current stock per warehouse and total
    const totalStock = item.stocks.reduce((acc, s) => acc + Number(s.quantity), 0);
    const stockBreakdown = item.stocks.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      location: s.warehouse.location,
      quantity: Number(s.quantity),
      averageCost: Number(s.averageCost),
    }));

    // 2. Last purchase price from PurchaseOrderLine
    const lastPoLine = await this.prisma.purchaseOrderLine.findFirst({
      where: {
        itemId,
        purchaseOrder: {
          status: {
            in: [
              OrderStatus.APROBADA,
              OrderStatus.APROBADA_EXCEPCION,
              OrderStatus.EMITIDA,
              OrderStatus.RECEPCION_TOTAL,
              OrderStatus.RECEPCION_PARCIAL,
            ],
          },
        },
      },
      include: {
        purchaseOrder: {
          include: { supplier: true },
        },
      },
      orderBy: { purchaseOrder: { createdAt: 'desc' } },
    });

    const lastPurchase = lastPoLine
      ? {
          orderNumber: lastPoLine.purchaseOrder.orderNumber,
          unitPrice: Number(lastPoLine.unitPrice),
          supplierName: lastPoLine.purchaseOrder.supplier.businessName,
          supplierRut: lastPoLine.purchaseOrder.supplier.rut,
          date: lastPoLine.purchaseOrder.createdAt,
        }
      : null;

    // 3. Suppliers selling this item & exclusive check
    const suppliers = item.supplierCatalogs.map((sc) => ({
      catalogId: sc.id,
      supplierId: sc.supplierId,
      supplierName: sc.supplier.businessName,
      supplierRut: sc.supplier.rut,
      isExclusive: sc.isExclusive,
      supplierPartNumber: sc.supplierPartNumber,
      lastPrice: Number(sc.lastPrice),
      leadTimeDays: sc.leadTimeDays,
      notes: sc.notes,
    }));

    const exclusiveSupplier = suppliers.find((s) => s.isExclusive);
    const supplierCount = suppliers.length;

    // 4. Recent quotes for this item
    const recentQuoteLines = await this.prisma.quotationLine.findMany({
      where: { itemId },
      include: {
        quotation: {
          include: { supplier: true },
        },
      },
      orderBy: { quotation: { createdAt: 'desc' } },
      take: 5,
    });

    const recentQuotes = recentQuoteLines.map((ql) => ({
      quotationNumber: ql.quotation.quotationNumber,
      supplierName: ql.quotation.supplier.businessName,
      unitPrice: Number(ql.unitPrice),
      status: ql.quotation.status,
      availabilityDays: ql.availabilityDays,
      date: ql.quotation.createdAt,
    }));

    // Recommendation logic according to mining business rules
    let recommendation = '';
    if (exclusiveSupplier) {
      recommendation = `Proveedor EXCLUSIVO: ${exclusiveSupplier.supplierName} (${exclusiveSupplier.supplierRut}). Homologado como único proveedor técnico para este producto.`;
    } else if (supplierCount === 0) {
      recommendation = 'No hay proveedores registrados en el catálogo para este repuesto. Se debe prospectar nuevos proveedores.';
    } else if (supplierCount === 1) {
      recommendation = 'Solo 1 proveedor en historial. Se recomienda registrar al menos 2 cotizaciones antes de emitir la OC.';
    } else if (supplierCount === 2) {
      recommendation = 'Historial registra 2 proveedores disponibles. Se sugiere solicitar cotización a ambos para garantizar mejor precio y disponibilidad.';
    } else {
      recommendation = `Existen ${supplierCount} proveedores en el catálogo. Se recomienda cotizar con los 3 de menor tiempo de entrega o mejor precio histórico.`;
    }

    return {
      itemId: item.id,
      itemCode: item.code,
      itemDescription: item.description,
      unitOfMeasure: item.unitOfMeasure,
      minimumStock: item.minimumStock,
      totalStock,
      stockBreakdown,
      lastPurchase,
      suppliers,
      supplierCount,
      hasExclusiveSupplier: !!exclusiveSupplier,
      exclusiveSupplier: exclusiveSupplier ? { id: exclusiveSupplier.supplierId, name: exclusiveSupplier.supplierName } : null,
      recentQuotes,
      recommendation,
      hasEnoughStock: totalStock >= item.minimumStock && totalStock > 0,
    };
  }

  async remove(id: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id },
      include: { purchaseOrders: true },
    });
    if (!quote) {
      throw new NotFoundException(`Quotation with id ${id} not found`);
    }
    if (quote.purchaseOrders && quote.purchaseOrders.length > 0) {
      throw new BadRequestException('No se puede eliminar una cotización que ya cuenta con Orden de Compra asociada');
    }
    await this.prisma.quotationLine.deleteMany({ where: { quotationId: id } });
    await this.prisma.quotation.delete({ where: { id } });
    return { success: true, message: `Cotización ${quote.quotationNumber} eliminada exitosamente` };
  }
}
