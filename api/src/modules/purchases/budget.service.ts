import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertBudgetDto, FilterBudgetDto } from './dto/budget.dto';
import { OrderStatus, QuotationStatus, Prisma } from '@prisma/client';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertBudget(dto: UpsertBudgetDto) {
    const faena = await this.prisma.faena.findUnique({
      where: { id: dto.faenaId },
    });
    if (!faena) {
      throw new NotFoundException(`Faena with id ${dto.faenaId} not found`);
    }

    if (dto.costCenterId) {
      const cc = await this.prisma.costCenter.findUnique({
        where: { id: dto.costCenterId },
      });
      if (!cc) {
        throw new NotFoundException(`Cost center with id ${dto.costCenterId} not found`);
      }
    }

    const monthValue = dto.month !== undefined ? dto.month : null;
    const costCenterValue = dto.costCenterId || null;

    // Look for existing budget record by unique compound constraint
    const existing = await this.prisma.budget.findFirst({
      where: {
        faenaId: dto.faenaId,
        costCenterId: costCenterValue,
        year: dto.year,
        month: monthValue,
      },
    });

    if (existing) {
      return this.prisma.budget.update({
        where: { id: existing.id },
        data: {
          amount: new Prisma.Decimal(dto.amount),
          notes: dto.notes,
        },
        include: { faena: true, costCenter: true },
      });
    }

    return this.prisma.budget.create({
      data: {
        faenaId: dto.faenaId,
        costCenterId: costCenterValue,
        year: dto.year,
        month: monthValue,
        amount: new Prisma.Decimal(dto.amount),
        notes: dto.notes,
      },
      include: { faena: true, costCenter: true },
    });
  }

  async findAll(filters: FilterBudgetDto) {
    const where: Prisma.BudgetWhereInput = {};
    if (filters.faenaId) where.faenaId = filters.faenaId;
    if (filters.costCenterId) where.costCenterId = filters.costCenterId;
    if (filters.year) where.year = filters.year;
    if (filters.month !== undefined) where.month = filters.month;

    return this.prisma.budget.findMany({
      where,
      include: {
        faena: { select: { id: true, name: true } },
        costCenter: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getBudgetSummary(faenaId: string, year?: number, month?: number) {
    const targetYear = year || new Date().getFullYear();
    const faena = await this.prisma.faena.findUnique({
      where: { id: faenaId },
      include: {
        contracts: {
          include: { costCenters: true },
        },
      },
    });

    if (!faena) {
      throw new NotFoundException(`Faena with id ${faenaId} not found`);
    }

    // 1. Fetch budgets for this faena
    const budgetWhere: Prisma.BudgetWhereInput = {
      faenaId,
      year: targetYear,
    };
    if (month !== undefined) {
      budgetWhere.month = month;
    }

    const budgets = await this.prisma.budget.findMany({
      where: budgetWhere,
      include: { costCenter: true },
    });

    const budgetTotal = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

    // Date range for transactions
    const startDate = month !== undefined ? new Date(targetYear, month - 1, 1) : new Date(targetYear, 0, 1);
    const endDate = month !== undefined
      ? new Date(targetYear, month, 0, 23, 59, 59, 999)
      : new Date(targetYear, 11, 31, 23, 59, 59, 999);

    // 2. Potential commitments from open Quotations requested for this faena
    const quotations = await this.prisma.quotation.findMany({
      where: {
        purchaseRequest: { faenaId },
        status: { in: [QuotationStatus.SOLICITADA, QuotationStatus.RECIBIDA] },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        supplier: { select: { businessName: true } },
        purchaseRequest: { select: { requestNumber: true } },
      },
    });

    const committedQuotations = quotations.reduce((sum, q) => sum + Number(q.totalAmount || 0), 0);

    // 3. Purchase Orders for this faena
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        OR: [{ faenaId }, { purchaseRequest: { faenaId } }],
        status: {
          in: [
            OrderStatus.APROBADA,
            OrderStatus.APROBADA_EXCEPCION,
            OrderStatus.EMITIDA,
            OrderStatus.RECEPCION_PARCIAL,
            OrderStatus.RECEPCION_TOTAL,
          ],
        },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        supplier: { select: { id: true, businessName: true } },
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let committedOrders = 0; // Approved, Issued or Partially Received
    let executedOrders = 0;  // Fully Received (invoiced/spent)

    for (const po of purchaseOrders) {
      const amount = Number(po.totalAmount);
      if (po.status === OrderStatus.RECEPCION_TOTAL) {
        executedOrders += amount;
      } else {
        committedOrders += amount;
      }
    }

    const totalCommittedAndExecuted = committedQuotations + committedOrders + executedOrders;
    const availableBudget = budgetTotal - totalCommittedAndExecuted;
    const percentageUsed = budgetTotal > 0 ? Number(((totalCommittedAndExecuted / budgetTotal) * 100).toFixed(1)) : 0;

    let alertLevel: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (availableBudget < 0) {
      alertLevel = 'CRITICAL';
    } else if (percentageUsed >= 85) {
      alertLevel = 'WARNING';
    }

    // Cost Centers breakdown
    const costCenters = faena.contracts.flatMap((c) => c.costCenters);
    const costCentersSummary = costCenters.map((cc) => {
      const ccBudgets = budgets.filter((b) => b.costCenterId === cc.id);
      const ccTotal = ccBudgets.reduce((sum, b) => sum + Number(b.amount), 0);
      return {
        id: cc.id,
        code: cc.code,
        name: cc.name,
        allocatedBudget: ccTotal,
      };
    });

    return {
      faena: {
        id: faena.id,
        name: faena.name,
        location: faena.location,
      },
      period: {
        year: targetYear,
        month: month || null,
        startDate,
        endDate,
      },
      metrics: {
        budgetTotal,
        committedQuotations,
        committedOrders,
        executedOrders,
        totalCommittedAndExecuted,
        availableBudget,
        percentageUsed,
        alertLevel,
        isOverBudget: availableBudget < 0,
      },
      costCenters: costCentersSummary,
      recentOrders: purchaseOrders.slice(0, 10).map((po) => ({
        id: po.id,
        orderNumber: po.orderNumber,
        supplierName: po.supplier.businessName,
        totalAmount: Number(po.totalAmount),
        status: po.status,
        createdAt: po.createdAt,
      })),
      openQuotations: quotations.slice(0, 10).map((q) => ({
        id: q.id,
        quotationNumber: q.quotationNumber,
        supplierName: q.supplier.businessName,
        requestNumber: q.purchaseRequest?.requestNumber,
        totalAmount: Number(q.totalAmount),
        status: q.status,
        createdAt: q.createdAt,
      })),
    };
  }
}
