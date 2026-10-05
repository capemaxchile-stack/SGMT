import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CopilotToolsService } from './copilot-tools.service';
import { ChatRequestDto } from './dto/chat-request.dto';

export interface CopilotActionCard {
  type: 'CRITICAL_STOCK' | 'MAINTENANCE_RADAR' | 'PENDING_APPROVALS' | 'FLEET_STATUS' | 'FAENA_COSTS' | 'GENERAL';
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'danger' | 'warning' | 'info' | 'success';
  data?: any;
  actionButton?: {
    label: string;
    route: string;
    variant?: 'primary' | 'secondary' | 'danger';
  };
}

export interface CopilotChatResponse {
  answer: string;
  cards?: CopilotActionCard[];
  suggestedQuestions?: string[];
  toolsExecuted?: string[];
  timestamp: string;
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly toolsService: CopilotToolsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper to normalize text: removes accents, lowercase, trims
   */
  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Process a user chat message with agentic tool calling and intelligent reasoning
   */
  async processChat(dto: ChatRequestDto, user: any): Promise<CopilotChatResponse> {
    const raw = dto.message.trim();
    const msg = this.normalize(raw);
    const toolsExecuted: string[] = [];
    const cards: CopilotActionCard[] = [];
    let answer = '';
    const suggestedQuestions: string[] = [];

    // Helper checks
    const hasAny = (keywords: string[]) => keywords.some((k) => msg.includes(k));
    const isAskingQuantity = hasAny(['cuanto', 'cuanta', 'cuantos', 'cuantas', 'total', 'cantidad', 'numero', 'que tenemos']);

    // 1. INTENT: Fleet, Vehicles, Machinery, Equipment
    // Keywords: vehiculo, vehiculos, auto, camion, camioneta, maquina, maquinaria, flota, equipo, retro, excavadora, etc.
    const isFleetIntent = hasAny([
      'vehiculo',
      'vehiculos',
      'auto',
      'autos',
      'camion',
      'camiones',
      'camioneta',
      'camionetas',
      'maquina',
      'maquinas',
      'maquinaria',
      'maquinarias',
      'flota',
      'equipo',
      'equipos',
      'retro',
      'retroexcavadora',
      'retroexcavadoras',
      'excavadora',
      'excavadoras',
      'bulldozer',
      'bulldozers',
      'cargador',
      'cargadores',
      'motoniveladora',
      'motoniveladoras',
      'rodillo',
      'rodillos',
      'tolva',
      'pluma',
      'activo',
      'activos',
      'disponibilidad',
      'operativo',
      'operativos',
      'detenido',
      'detenidos',
    ]);

    // 2. INTENT: Critical Stock, Bodega, Warehouse Inventory
    const isStockIntent = hasAny([
      'stock',
      'bodega',
      'bodegas',
      'inventario',
      'material',
      'materiales',
      'insumo',
      'insumos',
      'repuesto',
      'repuestos',
      'filtro',
      'filtros',
      'aceite',
      'aceites',
      'grasa',
      'grasas',
      'perno',
      'pernos',
      'critico',
      'criticos',
      'minimo',
      'minimos',
      'falta',
      'faltante',
      'reponer',
      'kardex',
    ]);

    // 3. INTENT: Maintenance, Radar, Work Orders, Hours
    const isMaintenanceIntent = hasAny([
      'manten',
      'mantencion',
      'mantenciones',
      'mantenimiento',
      'mantenimientos',
      'radar',
      'service',
      'pauta',
      'pautas',
      'vencid',
      'vencida',
      'vencidas',
      'vencido',
      'vencidos',
      'horometro',
      'horometros',
      'ot',
      'ots',
      'orden de trabajo',
      'ordenes de trabajo',
      'taller',
      'reparar',
      'reparacion',
      'falla',
      'fallas',
      'preventivo',
      'correctivo',
    ]);

    // 4. INTENT: Purchase Orders, Approvals, Suppliers
    const isPurchaseIntent = hasAny([
      'compra',
      'compras',
      'orden',
      'ordenes',
      'oc',
      'ocs',
      'aprob',
      'aprobacion',
      'aprobaciones',
      'autoriz',
      'autorizacion',
      'autorizaciones',
      'proveedor',
      'proveedores',
      'adquisic',
      'cotiz',
      'pendiente',
      'pendientes',
      'super usuario',
      'excepcion',
    ]);

    // 5. INTENT: Faenas, Financials, Budget, Fuel Spend
    const isFinancialsIntent = hasAny([
      'faena',
      'faenas',
      'costo',
      'costos',
      'gasto',
      'gastos',
      'finanz',
      'plata',
      'dinero',
      'presupuesto',
      'presupuestos',
      'combustible',
      'diesel',
      'petroleo',
      'litro',
      'litros',
      'consumo',
      'rendimiento',
      'quemado',
      'cierre',
      'cierres',
      'liquidacion',
    ]);

    // ROUTING WITH PRIORITY
    if (isMaintenanceIntent) {
      toolsExecuted.push('get_maintenance_radar');
      const radar = await this.toolsService.getMaintenanceRadar();

      if (radar.totalAlerts === 0) {
        answer = `### 🛡️ Radar de Mantenimiento Preventivo\n\nLa flota completa se encuentra **al día en sus pautas preventivas**. Ninguna máquina está a menos de 50 horas de su próximo ciclo de servicio.`;
      } else {
        answer = `### 🚨 Radar de Mantenimiento Activo\n\nTenemos **${radar.totalAlerts} maquinarias con alerta preventiva**, de las cuales **${radar.overdueCount} tienen su pauta vencida**:\n\n` +
          radar.alerts
            .slice(0, 5)
            .map(
              (a) =>
                `- **${a.assetNumber}** (${a.brandModel} en ${a.faena}): Pauta **${a.serviceInterval}** en ${a.nextServiceAt} hrs. (${a.isOverdue ? `🔴 **VENCIDA hace ${Math.abs(a.hoursRemaining)}h**` : `🟡 Restan **${a.hoursRemaining}h**`})`,
            )
            .join('\n') +
          `\n\n> Te sugiero abrir el módulo de mantenimiento para emitir las Órdenes de Trabajo pendientes.`;

        cards.push({
          type: 'MAINTENANCE_RADAR',
          title: `Radar de Mantención (${radar.totalAlerts} Alertas)`,
          description: `${radar.overdueCount} maquinarias con ciclo vencido y ${radar.totalAlerts - radar.overdueCount} próximas a vencer.`,
          badge: radar.overdueCount > 0 ? `${radar.overdueCount} Vencidos` : `${radar.totalAlerts} Próximos`,
          badgeVariant: radar.overdueCount > 0 ? 'danger' : 'warning',
          data: radar.alerts,
          actionButton: {
            label: 'Abrir Radar de Mantención',
            route: '/mantenimiento',
            variant: 'primary',
          },
        });
      }

      suggestedQuestions.push(
        '¿Cuántos vehículos y maquinarias tenemos en total?',
        '¿Tenemos stock de filtros y repuestos para estas mantenciones?',
        '¿Hay órdenes de compra pendientes?',
      );
    } else if (isStockIntent) {
      toolsExecuted.push('get_critical_stock');
      const stockData = await this.toolsService.getCriticalStock();

      if (stockData.criticalCount === 0) {
        answer = `### 📦 Estado de Inventario & Bodegas\n\nTodos los materiales e insumos se encuentran **sobre el stock mínimo de seguridad**. No hay alertas de desabastecimiento registradas en bodega.`;
      } else {
        answer = `### ⚠️ Alerta de Stock Crítico\n\nActualmente tenemos **${stockData.criticalCount} ítems por debajo del stock mínimo** de seguridad:\n\n` +
          stockData.items
            .map(
              (i) =>
                `- **${i.code} - ${i.description}**: Stock actual **${i.totalStock} ${i.unitOfMeasure}** (Mínimo: **${i.minimumStock}**, Déficit: **${i.deficit}**)`,
            )
            .join('\n') +
          `\n\n> Te recomiendo emitir una Solicitud u Orden de Compra para reponer estos materiales.`;

        cards.push({
          type: 'CRITICAL_STOCK',
          title: `Stock Crítico (${stockData.criticalCount} Ítems)`,
          description: `Hay insumos esenciales por debajo del umbral mínimo de seguridad.`,
          badge: `${stockData.criticalCount} Bajo Mínimo`,
          badgeVariant: 'danger',
          data: stockData.items,
          actionButton: {
            label: 'Gestionar en Bodega',
            route: '/bodega',
            variant: 'primary',
          },
        });
      }

      suggestedQuestions.push(
        '¿Hay órdenes de compra pendientes para estos insumos?',
        '¿Cuántos vehículos tenemos en operación?',
        '¿Cuáles son los costos operativos de las faenas?',
      );
    } else if (isPurchaseIntent) {
      toolsExecuted.push('get_pending_approvals');
      const approvals = await this.toolsService.getPendingApprovals();

      if (approvals.count === 0) {
        answer = `### 📝 Aprobaciones de Compras\n\nActualmente **no hay Órdenes de Compra pendientes** de aprobación. Todas se encuentran autorizadas o emitidas.`;
      } else {
        const totalPendingAmount = approvals.orders.reduce((sum, o) => sum + o.totalAmount, 0);
        answer = `### 📋 Órdenes de Compra por Autorizar\n\nTenemos **${approvals.count} órdenes de compra pendientes de aprobación**, sumando un total de **$${totalPendingAmount.toLocaleString('es-CL')} CLP**:\n\n` +
          approvals.orders
            .map(
              (o) =>
                `- **${o.orderNumber}** | Proveedor: **${o.supplier}** | Monto: **$${o.totalAmount.toLocaleString('es-CL')} CLP** (${o.itemsCount} ítems)`,
            )
            .join('\n') +
          `\n\n> Podés autorizarlas directamente desde el módulo de Compras o desde el Panel de Administración.`;

        cards.push({
          type: 'PENDING_APPROVALS',
          title: `Órdenes por Aprobar (${approvals.count})`,
          description: `Monto total pendiente: $${totalPendingAmount.toLocaleString('es-CL')} CLP`,
          badge: `${approvals.count} Pendientes`,
          badgeVariant: 'warning',
          data: approvals.orders,
          actionButton: {
            label: 'Ir a Bandeja de Compras',
            route: '/compras',
            variant: 'primary',
          },
        });
      }

      suggestedQuestions.push(
        '¿Cuál es el stock de materiales en bodega?',
        '¿Cuántas maquinarias tenemos operativas?',
        '¿Cuáles son los gastos de combustible?',
      );
    } else if (isFleetIntent) {
      toolsExecuted.push('get_fleet_status');
      const fleet = await this.toolsService.getFleetStatus();

      const typeBreakdown = Object.entries(fleet.summary.byType || {})
        .map(([type, count]) => `${count} ${type.toLowerCase()}(s)`)
        .join(', ');

      const faenaBreakdown = Object.entries(fleet.summary.byFaena || {})
        .map(([faena, count]) => `**${faena}**: ${count} equipo(s)`)
        .join(' | ');

      if (isAskingQuantity) {
        answer = `### 🚜 Total de Vehículos y Maquinarias en Flota\n\n` +
          `Actualmente contamos con un total de **${fleet.summary.total} vehículos y maquinarias** registradas en el sistema:\n\n` +
          `- **🟢 Operativos**: **${fleet.summary.operational} unidades** (${fleet.summary.operationalRate} de disponibilidad)\n` +
          `- **🟡 En Mantenimiento**: **${fleet.summary.underMaintenance} unidades**\n` +
          `- **🔴 Detenidos / Standby**: **${fleet.summary.detained} unidades**\n\n` +
          `**Composición por tipo:** ${typeBreakdown || 'Sin desglose'}.\n\n` +
          `**Distribución por Faena:**\n${faenaBreakdown || 'En patio central'}\n\n` +
          `**Detalle de los principales equipos:**\n` +
          fleet.assets
            .slice(0, 6)
            .map(
              (a) =>
                `- **${a.internalNumber}** (${a.type} ${a.brand} ${a.model} - Patente: \`${a.licensePlate || 'S/P'}\`): ${a.status === 'OPERATIVO' ? '🟢 Operativo' : a.status === 'EN_MANTENCION' ? '🟡 Mantención' : '🔴 Detenido'} en **${a.currentFaena}** (${a.hourmeter}h)`,
            )
            .join('\n');
      } else {
        answer = `### 🚜 Estado General de la Flota SGMT\n\n` +
          `- **Total de Flota**: **${fleet.summary.total} unidades**\n` +
          `- **Disponibilidad Operativa**: **${fleet.summary.operationalRate}** (${fleet.summary.operational} operativos)\n` +
          `- **En Mantención**: ${fleet.summary.underMaintenance} equipos\n` +
          `- **Detenidos**: ${fleet.summary.detained} equipos\n\n` +
          `**Distribución en terreno:**\n` +
          fleet.assets
            .slice(0, 6)
            .map(
              (a) =>
                `- **${a.internalNumber}** (${a.type} ${a.brand} ${a.model}): ${a.status === 'OPERATIVO' ? '🟢 Operativo' : a.status === 'EN_MANTENCION' ? '🟡 Mantención' : '🔴 Detenido'} | Faena: **${a.currentFaena}** | Horómetro: **${a.hourmeter}h**`,
            )
            .join('\n');
      }

      cards.push({
        type: 'FLEET_STATUS',
        title: `Flota Total: ${fleet.summary.total} Unidades (${fleet.summary.operationalRate} Operativo)`,
        description: `${fleet.summary.operational} operativos, ${fleet.summary.underMaintenance} en mantención, ${fleet.summary.detained} detenidos.`,
        badge: `${fleet.summary.total} Equipos`,
        badgeVariant: 'success',
        data: fleet,
        actionButton: {
          label: 'Ver Control de Flota',
          route: '/flota',
          variant: 'primary',
        },
      });

      suggestedQuestions.push(
        '¿Qué equipos están próximos a vencer su mantenimiento?',
        '¿Hay consumo anómalo de combustible?',
        '¿Cuáles son los costos operativos de las faenas?',
      );
    } else if (isFinancialsIntent) {
      toolsExecuted.push('get_faenas_financial_summary');
      const faenasData = await this.toolsService.getFaenasFinancialSummary();

      let totalSpend = 0;
      let totalBudget = 0;
      let totalFuelLiters = 0;

      faenasData.faenas.forEach((f) => {
        totalSpend += f.totalSpent;
        totalBudget += f.totalBudget;
        totalFuelLiters += f.fuel.totalLiters;
      });

      answer = `### 💰 Resumen Financiero & Costos por Faena\n\n` +
        `- **Presupuesto Total Contratado**: **$${totalBudget.toLocaleString('es-CL')} CLP**\n` +
        `- **Costo Operativo Acumulado**: **$${totalSpend.toLocaleString('es-CL')} CLP**\n` +
        `- **Consumo Total Diésel**: **${totalFuelLiters.toLocaleString('es-CL')} Litros**\n\n` +
        `**Detalle por Faena:**\n` +
        faenasData.faenas
          .map(
            (f) =>
              `- **${f.name}** (${f.location}): Gasto **$${f.totalSpent.toLocaleString('es-CL')} CLP** (Combustible: $${f.fuel.totalCost.toLocaleString('es-CL')} | Mantención: $${f.maintenance.totalCost.toLocaleString('es-CL')}) — Ejecución: **${f.burnPercentage}**`,
          )
          .join('\n');

      cards.push({
        type: 'FAENA_COSTS',
        title: `Costos Consolidados de Faenas`,
        description: `Gasto operativo de $${totalSpend.toLocaleString('es-CL')} CLP en ${faenasData.faenasCount} faenas activas.`,
        badge: `$${totalSpend.toLocaleString('es-CL')}`,
        badgeVariant: 'info',
        data: faenasData,
        actionButton: {
          label: 'Ver Reportes Ejecutivos',
          route: '/reportes',
          variant: 'primary',
        },
      });

      suggestedQuestions.push(
        '¿Hay registros anómalos de combustible en la flota?',
        '¿Qué órdenes de compra están pendientes?',
        '¿Cómo está el stock de insumos críticos?',
      );
    } else {
      answer = `Hola **${user?.name || 'Colega'}**, soy tu **Copiloto Agéntico de SGMT** 🚜🤖.\n\nTengo acceso en tiempo real a todas las operaciones para responderte de forma precisa:\n\n` +
        `- 🚜 **Flota & Vehículos**: Total de unidades, disponibilidad operativa, horómetros y faenas.\n` +
        `- 🛡️ **Radar de Mantención**: Maquinarias con pauta vencida o próxima (250h, 500h, 1000h).\n` +
        `- 📦 **Bodega & Stock**: Detección de insumos críticos bajo el mínimo de seguridad.\n` +
        `- 📝 **Compras & Aprobaciones**: Órdenes de compra por autorizar y montos en CLP.\n` +
        `- 💰 **Costos & Faenas**: Rendimiento de diésel L/hr, quemado presupuestario y cierres.\n\n` +
        `¿Qué dato querés consultar?`;

      suggestedQuestions.push(
        '🚜 ¿Cuántos vehículos y maquinarias tenemos?',
        '🚨 ¿Qué equipos tienen mantención vencida?',
        '📦 ¿Cuáles ítems están bajo stock mínimo?',
        '📝 ¿Hay órdenes de compra pendientes de aprobación?',
        '💰 ¿Cuánto se ha gastado en combustible y faenas?',
      );
    }

    return {
      answer,
      cards: cards.length > 0 ? cards : undefined,
      suggestedQuestions,
      toolsExecuted: toolsExecuted.length > 0 ? toolsExecuted : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get smart proactive suggestions based on live system state
   */
  async getQuickSuggestions() {
    const [criticalStock, radar, approvals] = await Promise.all([
      this.toolsService.getCriticalStock(),
      this.toolsService.getMaintenanceRadar(),
      this.toolsService.getPendingApprovals(),
    ]);

    const suggestions: Array<{ text: string; category: string; priority: 'high' | 'medium' | 'low' }> = [];

    if (radar.overdueCount > 0) {
      suggestions.push({
        text: `Hay ${radar.overdueCount} equipos con pauta de mantenimiento vencida. ¿Qué acciones tomar?`,
        category: 'Mantenimiento',
        priority: 'high',
      });
    }

    if (criticalStock.criticalCount > 0) {
      suggestions.push({
        text: `Tenemos ${criticalStock.criticalCount} ítems bajo stock mínimo en bodega. ¿Cuáles son?`,
        category: 'Bodega',
        priority: 'high',
      });
    }

    if (approvals.count > 0) {
      suggestions.push({
        text: `Existen ${approvals.count} órdenes de compra pendientes de aprobación.`,
        category: 'Compras',
        priority: 'medium',
      });
    }

    suggestions.push({
      text: '¿Cuántos vehículos y maquinarias tenemos en total?',
      category: 'Flota',
      priority: 'low',
    });

    suggestions.push({
      text: '¿Cuál es el resumen de costos y combustible de este mes?',
      category: 'Finanzas',
      priority: 'low',
    });

    return suggestions;
  }
}
