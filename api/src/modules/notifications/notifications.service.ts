import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SystemNotification {
  id: string;
  category: 'COMPRAS' | 'STOCK' | 'MANTENIMIENTO' | 'FLOTA';
  title: string;
  description: string;
  link: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  timestamp: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(): Promise<{
    notifications: SystemNotification[];
    totalCount: number;
    criticalCount: number;
    highCount: number;
  }> {
    const notifications: SystemNotification[] = [];

    // 1. Pending Purchase Orders
    const pendingOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        status: 'PENDIENTE_APROBACION',
      },
      include: {
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const po of pendingOrders) {
      notifications.push({
        id: `po-${po.id}`,
        category: 'COMPRAS',
        title: `Orden de Compra ${po.orderNumber} por Aprobar`,
        description: `Monto: $${Number(po.totalAmount).toLocaleString('es-CL')} - Proveedor: ${po.supplier?.businessName || 'N/A'}`,
        link: '/compras',
        priority: 'HIGH',
        timestamp: po.createdAt.toISOString(),
        entityId: po.id,
      });
    }

    // 2. Critical & Low Stock Items
    const stocks = await this.prisma.stock.findMany({
      include: {
        item: true,
        warehouse: true,
      },
    });

    for (const stock of stocks) {
      const currentQty = Number(stock.quantity);
      const minQty = Number(stock.item.minimumStock);
      if (minQty > 0 && currentQty <= minQty) {
        const isDepleted = currentQty <= 0;
        notifications.push({
          id: `stock-${stock.id}`,
          category: 'STOCK',
          title: isDepleted
            ? `Stock Agotado: ${stock.item.description}`
            : `Stock Crítico: ${stock.item.description}`,
          description: `Disponible: ${currentQty} ${stock.item.unitOfMeasure} en ${stock.warehouse.name} (Mínimo exigido: ${minQty})`,
          link: '/bodega',
          priority: isDepleted ? 'CRITICAL' : 'HIGH',
          timestamp: stock.updatedAt.toISOString(),
          entityId: stock.itemId,
        });
      }
    }

    // 3. Maintenance Radar Alerts (Overdue or Due Soon)
    const assets = await this.prisma.asset.findMany({
      where: {
        operationalStatus: { in: ['OPERATIVO', 'EN_MANTENCION'] },
        deletedAt: null,
      },
      include: {
        workOrders: {
          where: { status: 'COMPLETADA' },
          orderBy: { completedDate: 'desc' },
          take: 1,
        },
      },
    });

    const plans = await this.prisma.maintenancePlan.findMany({
      where: { isActive: true },
    });

    for (const asset of assets) {
      const matchingPlans = plans.filter((p) => p.assetType === asset.type);
      const lastServiceHour = asset.workOrders[0] ? Number(asset.workOrders[0].currentHourmeter || 0) : 0;
      const currentHours = Number(asset.currentHourmeter || 0);
      const hoursSinceLast = currentHours - lastServiceHour;

      for (const plan of matchingPlans) {
        if (plan.intervalHours && plan.intervalHours > 0) {
          const remainingHours = plan.intervalHours - (hoursSinceLast % plan.intervalHours);
          const isOverdue = remainingHours <= 0 || hoursSinceLast >= plan.intervalHours;

          if (isOverdue) {
            notifications.push({
              id: `radar-overdue-${asset.id}-${plan.id}`,
              category: 'MANTENIMIENTO',
              title: `Mantenimiento Vencido: ${asset.internalNumber}`,
              description: `${asset.brand} ${asset.model} superó el intervalo de ${plan.name} (${currentHours} hrs actuales).`,
              link: '/mantenimiento',
              priority: 'CRITICAL',
              timestamp: new Date().toISOString(),
              entityId: asset.id,
            });
          } else if (remainingHours <= 30) {
            notifications.push({
              id: `radar-soon-${asset.id}-${plan.id}`,
              category: 'MANTENIMIENTO',
              title: `Próximo Servicio: ${asset.internalNumber}`,
              description: `Faltan ${remainingHours.toFixed(1)} hrs para ${plan.name} (${asset.internalNumber}).`,
              link: '/mantenimiento',
              priority: 'MEDIUM',
              timestamp: new Date().toISOString(),
              entityId: asset.id,
            });
          }
        }
      }
    }

    // 4. Critical Work Orders
    const criticalWOs = await this.prisma.workOrder.findMany({
      where: {
        priority: 'CRITICA',
        status: { in: ['ABIERTA', 'EN_PROGRESO'] },
      },
      include: {
        asset: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const wo of criticalWOs) {
      notifications.push({
        id: `wo-crit-${wo.id}`,
        category: 'MANTENIMIENTO',
        title: `OT Crítica en Taller: ${wo.otNumber}`,
        description: `Equipo ${wo.asset.internalNumber} (${wo.asset.brand}) detenido: ${wo.description}`,
        link: '/mantenimiento',
        priority: 'CRITICAL',
        timestamp: wo.createdAt.toISOString(),
        entityId: wo.id,
      });
    }

    // Sort notifications: CRITICAL > HIGH > MEDIUM > INFO, then newest
    const priorityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      INFO: 1,
    };

    notifications.sort((a, b) => {
      const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const criticalCount = notifications.filter((n) => n.priority === 'CRITICAL').length;
    const highCount = notifications.filter((n) => n.priority === 'HIGH').length;

    return {
      notifications,
      totalCount: notifications.length,
      criticalCount,
      highCount,
    };
  }
}
