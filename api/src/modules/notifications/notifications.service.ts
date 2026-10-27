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
  slaStatus?: 'on_track' | 'warning' | 'breached';
  slaLabel?: string;
  actionText?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(customTenantId?: string): Promise<{
    notifications: SystemNotification[];
    totalCount: number;
    criticalCount: number;
    highCount: number;
  }> {
    const notifications: SystemNotification[] = [];
    const now = Date.now();

    const tenantFilter = customTenantId ? { tenantId: customTenantId } : {};

    // 1. Pending Purchase Requests (Visado Faena) with SLA
    const pendingRequests = await this.prisma.purchaseRequest.findMany({
      where: {
        status: 'PENDIENTE',
        ...tenantFilter,
      },
      include: {
        faena: true,
        requester: { select: { name: true, email: true } },
        lines: { select: { urgency: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const req of pendingRequests) {
      const hasStoppedAsset = req.lines.some((l) => l.urgency === 'DETIENE_EQUIPO');
      const hasHighUrgency = req.lines.some((l) => l.urgency === 'ALTA');
      const slaLimitHours = hasStoppedAsset ? 4 : hasHighUrgency ? 12 : 24;
      const hoursElapsed = Math.max(0, (now - req.createdAt.getTime()) / (1000 * 60 * 60));

      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'HIGH';
      let slaStatus: 'on_track' | 'warning' | 'breached' = 'on_track';
      let slaLabel = `${Math.round(hoursElapsed)}h / ${slaLimitHours}h`;
      let title = `Solicitud ${req.requestNumber} por Aprobar`;

      if (hoursElapsed > slaLimitHours) {
        const overdue = Math.round(hoursElapsed - slaLimitHours);
        priority = 'CRITICAL';
        slaStatus = 'breached';
        slaLabel = `+${overdue}h Excedido`;
        title = `⚠️ [SLA VENCIDO] Solicitud ${req.requestNumber} pendiente de V°B°`;
      } else if (hoursElapsed >= slaLimitHours * 0.75) {
        const remaining = Math.max(1, Math.round(slaLimitHours - hoursElapsed));
        priority = 'HIGH';
        slaStatus = 'warning';
        slaLabel = `${remaining}h restantes`;
        title = `⏰ [SLA EN RIESGO] Solicitud ${req.requestNumber} por Aprobar`;
      }

      notifications.push({
        id: `pr-pending-${req.id}`,
        category: 'COMPRAS',
        title,
        description: `Faena: ${req.faena?.name || 'Terreno'} • ${req.lines.length} repuestos requeridos • Solicitado por ${req.requester?.name || 'Terreno'}`,
        link: '/compras?tab=requests',
        priority,
        timestamp: req.createdAt.toISOString(),
        entityId: req.id,
        slaStatus,
        slaLabel,
        actionText: 'Revisar Solicitud',
      });
    }

    // 2. Approved Requests Awaiting Quotations (Compras RFQ) with SLA
    const approvedWithoutQuotes = await this.prisma.purchaseRequest.findMany({
      where: {
        status: 'APROBADA',
        quotations: { none: {} },
        ...tenantFilter,
      },
      include: {
        faena: true,
        lines: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    for (const req of approvedWithoutQuotes) {
      const refDate = req.approvedAt || req.updatedAt || req.createdAt;
      const hoursElapsed = Math.max(0, (now - refDate.getTime()) / (1000 * 60 * 60));
      const slaLimitHours = 48; // 48h SLA for purchasing team to issue RFQ

      let priority: 'CRITICAL' | 'HIGH' = 'HIGH';
      let slaStatus: 'on_track' | 'warning' | 'breached' = 'on_track';
      let slaLabel = `${Math.round(hoursElapsed)}h / ${slaLimitHours}h`;
      let title = `Solicitud ${req.requestNumber} lista para Cotizar (RFQ)`;

      if (hoursElapsed > slaLimitHours) {
        const overdue = Math.round(hoursElapsed - slaLimitHours);
        priority = 'CRITICAL';
        slaStatus = 'breached';
        slaLabel = `+${overdue}h Excedido`;
        title = `⚠️ [SLA VENCIDO] Solicitud ${req.requestNumber} sin cotizaciones`;
      } else if (hoursElapsed >= slaLimitHours * 0.75) {
        priority = 'HIGH';
        slaStatus = 'warning';
        slaLabel = `${Math.max(1, Math.round(slaLimitHours - hoursElapsed))}h restantes`;
      }

      notifications.push({
        id: `pr-quote-${req.id}`,
        category: 'COMPRAS',
        title,
        description: `Faena: ${req.faena?.name || 'Terreno'} • ${req.lines.length} repuestos aprobados sin licitar a proveedores`,
        link: '/compras?tab=requests',
        priority,
        timestamp: refDate.toISOString(),
        entityId: req.id,
        slaStatus,
        slaLabel,
        actionText: 'Cotizar (RFQ)',
      });
    }

    // 3. Pending Purchase Orders (Aprobación Financiera) with SLA
    const pendingOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        status: 'PENDIENTE_APROBACION',
        ...tenantFilter,
      },
      include: {
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    for (const po of pendingOrders) {
      const hoursElapsed = Math.max(0, (now - po.createdAt.getTime()) / (1000 * 60 * 60));
      const slaLimitHours = 24; // 24h SLA for financial approval

      let priority: 'CRITICAL' | 'HIGH' = 'HIGH';
      let slaStatus: 'on_track' | 'warning' | 'breached' = 'on_track';
      let slaLabel = `${Math.round(hoursElapsed)}h / ${slaLimitHours}h`;
      let title = `Orden de Compra ${po.orderNumber} por Aprobar`;

      if (hoursElapsed > slaLimitHours) {
        const overdue = Math.round(hoursElapsed - slaLimitHours);
        priority = 'CRITICAL';
        slaStatus = 'breached';
        slaLabel = `+${overdue}h Excedido`;
        title = `⚠️ [SLA VENCIDO] OC ${po.orderNumber} por Autorizar`;
      } else if (hoursElapsed >= slaLimitHours * 0.75) {
        priority = 'HIGH';
        slaStatus = 'warning';
        slaLabel = `${Math.max(1, Math.round(slaLimitHours - hoursElapsed))}h restantes`;
      }

      notifications.push({
        id: `po-${po.id}`,
        category: 'COMPRAS',
        title,
        description: `Monto: $${Number(po.totalAmount).toLocaleString('es-CL')} - Proveedor: ${po.supplier?.businessName || 'N/A'}`,
        link: '/compras?tab=orders',
        priority,
        timestamp: po.createdAt.toISOString(),
        entityId: po.id,
        slaStatus,
        slaLabel,
        actionText: 'Autorizar OC',
      });
    }

    // 2. Critical & Low Stock Items
    const stocks = await this.prisma.stock.findMany({
      where: customTenantId ? { warehouse: { tenantId: customTenantId } } : {},
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
        ...tenantFilter,
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
      where: {
        isActive: true,
        ...tenantFilter,
      },
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
        ...tenantFilter,
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
