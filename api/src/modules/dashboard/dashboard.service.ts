import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FaenaStatus, AssetOperationalStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const activeFaenasCount = await this.prisma.faena.count({
      where: {
        status: {
          in: [FaenaStatus.ACTIVA, FaenaStatus.EN_FORMACION],
        },
      },
    });

    const totalAssetsCount = await this.prisma.asset.count();
    
    const operationalAssetsCount = await this.prisma.asset.count({
      where: {
        operationalStatus: AssetOperationalStatus.OPERATIVO,
      },
    });

    const operationalPercentage = totalAssetsCount > 0 
      ? (operationalAssetsCount / totalAssetsCount) * 100 
      : 0;

    const totalStockItemsCount = await this.prisma.item.count();

    const itemsWithStocks = await this.prisma.item.findMany({
      include: {
        stocks: {
          select: {
            quantity: true
          }
        }
      }
    });

    let lowStockItemsCount = 0;
    for (const item of itemsWithStocks) {
      const totalStock = item.stocks.reduce((acc, stock) => acc + Number(stock.quantity), 0);
      if (totalStock < item.minimumStock) {
        lowStockItemsCount++;
      }
    }

    const pendingOrdersCount = await this.prisma.purchaseOrder.count({
      where: {
        status: OrderStatus.PENDIENTE_APROBACION,
      },
    });

    const recentMovements = await this.prisma.warehouseMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        lines: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        warehouse: true,
      },
    });

    const recentOrders = await this.prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
      },
    });

    return {
      activeFaenasCount,
      totalAssetsCount,
      operationalAssetsCount,
      operationalPercentage,
      totalStockItemsCount,
      lowStockItemsCount,
      pendingOrdersCount,
      recentMovements,
      recentOrders,
    };
  }
}
