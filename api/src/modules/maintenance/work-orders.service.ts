import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { ConsumeItemDto } from './dto/consume-item.dto';
import { CompleteWorkOrderDto } from './dto/complete-work-order.dto';
import { WorkOrderStatus, WorkOrderType, WorkOrderPriority, AssetOperationalStatus, MovementType } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    status?: WorkOrderStatus;
    type?: WorkOrderType;
    priority?: WorkOrderPriority;
    assetId?: string;
    faenaId?: string;
    search?: string;
  }) {
    const where: Prisma.WorkOrderWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (query.assetId) where.assetId = query.assetId;
    if (query.faenaId) where.faenaId = query.faenaId;

    if (query.search) {
      where.OR = [
        { otNumber: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { technicianName: { contains: query.search, mode: 'insensitive' } },
        { asset: { internalNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            internalNumber: true,
            brand: true,
            model: true,
            type: true,
            operationalStatus: true,
            currentHourmeter: true,
            currentKilometrage: true,
          },
        },
        faena: {
          select: {
            id: true,
            name: true,
          },
        },
        maintenancePlan: {
          select: {
            id: true,
            name: true,
            intervalHours: true,
            intervalKm: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        asset: true,
        faena: true,
        maintenancePlan: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            item: true,
            warehouse: true,
            movement: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Orden de trabajo con ID ${id} no encontrada`);
    }

    return workOrder;
  }

  async create(dto: CreateWorkOrderDto, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
      include: {
        assignments: {
          where: { endDate: null },
          take: 1,
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Equipo con ID ${dto.assetId} no encontrado`);
    }

    // Auto-detect faena if not provided
    const faenaId = dto.faenaId || asset.assignments[0]?.faenaId || null;

    // Generate consecutive OT number: OT-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.prisma.workOrder.count({
      where: {
        otNumber: {
          startsWith: `OT-${currentYear}-`,
        },
      },
    });
    const otNumber = `OT-${currentYear}-${String(countThisYear + 1).padStart(4, '0')}`;

    const hourmeter = dto.currentHourmeter ?? Number(asset.currentHourmeter);
    const kilometrage = dto.currentKilometrage ?? Number(asset.currentKilometrage);

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          otNumber,
          assetId: dto.assetId,
          faenaId,
          maintenancePlanId: dto.maintenancePlanId || null,
          type: dto.type,
          priority: dto.priority || WorkOrderPriority.MEDIA,
          status: WorkOrderStatus.ABIERTA,
          description: dto.description,
          failureReport: dto.failureReport || null,
          currentHourmeter: hourmeter,
          currentKilometrage: kilometrage,
          technicianName: dto.technicianName || null,
          notes: dto.notes || null,
          createdById: userId,
        },
        include: {
          asset: true,
          faena: true,
          maintenancePlan: true,
        },
      });

      // If priority is ALTA/CRITICA or type is PREVENTIVO/CORRECTIVO, set asset in maintenance
      if (
        dto.priority === WorkOrderPriority.ALTA ||
        dto.priority === WorkOrderPriority.CRITICA ||
        dto.type === WorkOrderType.CORRECTIVO ||
        dto.type === WorkOrderType.EMERGENCIA
      ) {
        await tx.asset.update({
          where: { id: dto.assetId },
          data: { operationalStatus: AssetOperationalStatus.EN_MANTENCION },
        });
      }

      return workOrder;
    });
  }

  async update(id: string, dto: UpdateWorkOrderDto) {
    const workOrder = await this.findOne(id);

    if (workOrder.status === WorkOrderStatus.COMPLETADA && dto.status && dto.status !== WorkOrderStatus.COMPLETADA) {
      throw new BadRequestException('No se puede modificar el estado de una OT ya completada');
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...dto,
      },
      include: {
        asset: true,
        faena: true,
        maintenancePlan: true,
      },
    });
  }

  async consumeItem(id: string, dto: ConsumeItemDto, userId: string) {
    const workOrder = await this.findOne(id);

    if (workOrder.status === WorkOrderStatus.COMPLETADA || workOrder.status === WorkOrderStatus.CANCELADA) {
      throw new BadRequestException(`No se pueden cargar repuestos a una OT en estado ${workOrder.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Check stock in target warehouse
      const stock = await tx.stock.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
          },
        },
        include: { item: true, warehouse: true },
      });

      const availableQty = stock ? Number(stock.quantity) : 0;
      if (availableQty < dto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente en bodega para ${stock?.item.description || 'el insumo'}. Disponible: ${availableQty}, Solicitado: ${dto.quantity}`,
        );
      }

      const unitCost = stock ? Number(stock.averageCost) : 0;
      const totalLineCost = dto.quantity * unitCost;

      // 2. Generate consecutive movement number
      const currentYear = new Date().getFullYear();
      const count = await tx.warehouseMovement.count();
      const movementNumber = `MOV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      // 3. Create automated SALIDA movement
      const movement = await tx.warehouseMovement.create({
        data: {
          type: MovementType.SALIDA,
          movementNumber,
          warehouseId: dto.warehouseId,
          faenaId: workOrder.faenaId,
          assetId: workOrder.assetId,
          userId,
          notes: `Consumo automático por Orden de Trabajo ${workOrder.otNumber}: ${workOrder.description}`,
          lines: {
            create: [
              {
                itemId: dto.itemId,
                quantity: new Prisma.Decimal(dto.quantity),
                unitCost: new Prisma.Decimal(unitCost),
              },
            ],
          },
        },
      });

      // 4. Deduct stock
      await tx.stock.update({
        where: {
          itemId_warehouseId: {
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
          },
        },
        data: {
          quantity: { decrement: new Prisma.Decimal(dto.quantity) },
        },
      });

      // 5. Create WorkOrderItem
      const workOrderItem = await tx.workOrderItem.create({
        data: {
          workOrderId: id,
          itemId: dto.itemId,
          quantity: new Prisma.Decimal(dto.quantity),
          unitCost: new Prisma.Decimal(unitCost),
          totalCost: new Prisma.Decimal(totalLineCost),
          warehouseId: dto.warehouseId,
          movementId: movement.id,
        },
        include: {
          item: true,
          warehouse: true,
        },
      });

      // 6. Update totalCost and status of WorkOrder if ABIERTA -> EN_PROGRESO
      const newTotalCost = Number(workOrder.totalCost) + totalLineCost;
      const newStatus = workOrder.status === WorkOrderStatus.ABIERTA ? WorkOrderStatus.EN_PROGRESO : workOrder.status;

      await tx.workOrder.update({
        where: { id },
        data: {
          totalCost: new Prisma.Decimal(newTotalCost),
          status: newStatus,
        },
      });

      return workOrderItem;
    });
  }

  async complete(id: string, dto: CompleteWorkOrderDto) {
    const workOrder = await this.findOne(id);

    if (workOrder.status === WorkOrderStatus.COMPLETADA) {
      throw new BadRequestException('Esta orden de trabajo ya se encuentra completada');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update WorkOrder
      const completedOrder = await tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.COMPLETADA,
          completedDate: new Date(),
          notes: dto.notes ? `${workOrder.notes || ''}\n${dto.notes}`.trim() : workOrder.notes,
          technicianName: dto.technicianName || workOrder.technicianName,
        },
        include: {
          asset: true,
          faena: true,
          items: { include: { item: true } },
        },
      });

      // 2. Update asset meters if provided and higher
      const assetUpdateData: Prisma.AssetUpdateInput = {};
      if (dto.finalHourmeter && dto.finalHourmeter > Number(workOrder.asset.currentHourmeter)) {
        assetUpdateData.currentHourmeter = new Prisma.Decimal(dto.finalHourmeter);
      }
      if (dto.finalKilometrage && dto.finalKilometrage > Number(workOrder.asset.currentKilometrage)) {
        assetUpdateData.currentKilometrage = new Prisma.Decimal(dto.finalKilometrage);
      }

      // Check if there are other active critical OTs on this asset before setting OPERATIVO
      const activeOtsCount = await tx.workOrder.count({
        where: {
          assetId: workOrder.assetId,
          id: { not: id },
          status: { in: [WorkOrderStatus.ABIERTA, WorkOrderStatus.EN_PROGRESO, WorkOrderStatus.ESPERA_REPUESTOS] },
          priority: { in: [WorkOrderPriority.ALTA, WorkOrderPriority.CRITICA] },
        },
      });

      if (activeOtsCount === 0) {
        assetUpdateData.operationalStatus = AssetOperationalStatus.OPERATIVO;
      }

      if (Object.keys(assetUpdateData).length > 0) {
        await tx.asset.update({
          where: { id: workOrder.assetId },
          data: assetUpdateData,
        });
      }

      return completedOrder;
    });
  }

  async getAlerts() {
    // 1. Get all active assets
    const assets = await this.prisma.asset.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        operationalStatus: { not: AssetOperationalStatus.DADO_DE_BAJA },
      },
      include: {
        assignments: {
          where: { endDate: null },
          include: { faena: true },
          take: 1,
        },
        workOrders: {
          where: { status: WorkOrderStatus.COMPLETADA },
          orderBy: { completedDate: 'desc' },
          take: 1,
        },
      },
    });

    // 2. Get all active maintenance plans
    const plans = await this.prisma.maintenancePlan.findMany({
      where: { isActive: true, deletedAt: null },
    });

    const alerts = [];

    for (const asset of assets) {
      const assetPlans = plans.filter((p) => p.assetType === asset.type);
      const currentHours = Number(asset.currentHourmeter);
      const currentKm = Number(asset.currentKilometrage);
      const lastService = asset.workOrders[0] || null;

      for (const plan of assetPlans) {
        if (plan.intervalHours && plan.intervalHours > 0) {
          const lastHours = lastService ? Number(lastService.currentHourmeter) : 0;
          const hoursSinceLast = Math.max(0, currentHours - lastHours);
          const remainingHours = plan.intervalHours - (currentHours % plan.intervalHours);
          const percentUsed = Math.min(100, Math.round(((plan.intervalHours - remainingHours) / plan.intervalHours) * 100));

          let alertLevel: 'NORMAL' | 'PROXIMO' | 'VENCIDO' = 'NORMAL';
          if (remainingHours <= 0 || (currentHours > 0 && currentHours % plan.intervalHours === 0)) {
            alertLevel = 'VENCIDO';
          } else if (remainingHours <= 50 || percentUsed >= 85) {
            alertLevel = 'PROXIMO';
          }

          if (alertLevel !== 'NORMAL') {
            alerts.push({
              assetId: asset.id,
              internalNumber: asset.internalNumber,
              brand: asset.brand,
              model: asset.model,
              type: asset.type,
              operationalStatus: asset.operationalStatus,
              faena: asset.assignments[0]?.faena.name || 'Sin Asignar',
              planId: plan.id,
              planName: plan.name,
              metricType: 'HORAS',
              interval: plan.intervalHours,
              currentValue: currentHours,
              remainingValue: remainingHours,
              percentUsed,
              alertLevel,
            });
          }
        }

        if (plan.intervalKm && plan.intervalKm > 0) {
          const remainingKm = plan.intervalKm - (currentKm % plan.intervalKm);
          const percentUsed = Math.min(100, Math.round(((plan.intervalKm - remainingKm) / plan.intervalKm) * 100));

          let alertLevel: 'NORMAL' | 'PROXIMO' | 'VENCIDO' = 'NORMAL';
          if (remainingKm <= 0) {
            alertLevel = 'VENCIDO';
          } else if (remainingKm <= 1000 || percentUsed >= 85) {
            alertLevel = 'PROXIMO';
          }

          if (alertLevel !== 'NORMAL') {
            alerts.push({
              assetId: asset.id,
              internalNumber: asset.internalNumber,
              brand: asset.brand,
              model: asset.model,
              type: asset.type,
              operationalStatus: asset.operationalStatus,
              faena: asset.assignments[0]?.faena.name || 'Sin Asignar',
              planId: plan.id,
              planName: plan.name,
              metricType: 'KILOMETROS',
              interval: plan.intervalKm,
              currentValue: currentKm,
              remainingValue: remainingKm,
              percentUsed,
              alertLevel,
            });
          }
        }
      }
    }

    return alerts.sort((a, b) => (a.alertLevel === 'VENCIDO' ? -1 : 1));
  }
}
