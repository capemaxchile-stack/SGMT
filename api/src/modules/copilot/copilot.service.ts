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
   * Process a user chat message with agentic tool calling
   */
  async processChat(dto: ChatRequestDto, user: any): Promise<CopilotChatResponse> {
    const rawMsg = dto.message.trim().toLowerCase();
    const toolsExecuted: string[] = [];
    const cards: CopilotActionCard[] = [];
    let answer = '';
    const suggestedQuestions: string[] = [];

    // 1. Intent: Critical Stock / Bodega / Repuestos / Insumos
    if (
      rawMsg.includes('stock') ||
      rawMsg.includes('bodega') ||
      rawMsg.includes('critico') ||
      rawMsg.includes('crítico') ||
      rawMsg.includes('repuesto') ||
      rawMsg.includes('insumo') ||
      rawMsg.includes('filtro') ||
      rawMsg.includes('inventario')
    ) {
      toolsExecuted.push('get_critical_stock');
      const stockData = await this.toolsService.getCriticalStock();

      if (stockData.criticalCount === 0) {
        answer = `### 📦 Estado de Inventario & Bodegas\n\nTodos los materiales e insumos se encuentran **sobre el stock mínimo de seguridad**. No hay alertas de desabastecimiento en ninguna bodega.`;
      } else {
        answer = `### ⚠️ Alerta de Stock Crítico\n\nSe detectaron **${stockData.criticalCount} ítems** por debajo o en el límite de su stock mínimo de seguridad.\n\n` +
          stockData.items
            .map(
              (i) =>
                `- **${i.code} - ${i.description}**: Stock actual **${i.totalStock} ${i.unitOfMeasure}** (Mínimo requerido: **${i.minimumStock}**, Déficit: **${i.deficit}**)`,
            )
            .join('\n') +
          `\n\n> Te sugiero generar solicitudes de compra para reabastecer las bodegas afectadas.`;

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
        '¿Hay órdenes de compra pendientes para estos repuestos?',
        '¿Cuáles son los costos de faena este mes?',
        '¿Qué equipos están próximos a mantenimiento?',
      );
    }

    // 2. Intent: Maintenance / Radar / Horómetro / OT / Mantención
    else if (
      rawMsg.includes('manten') ||
      rawMsg.includes('radar') ||
      rawMsg.includes('horomet') ||
      rawMsg.includes('horómet') ||
      rawMsg.includes('service') ||
      rawMsg.includes('vencid') ||
      rawMsg.includes('ot')
    ) {
      toolsExecuted.push('get_maintenance_radar');
      const radar = await this.toolsService.getMaintenanceRadar();

      if (radar.totalAlerts === 0) {
        answer = `### 🛡️ Radar de Mantenimiento Preventivo\n\nLa flota completa se encuentra **al día en sus pautas preventivas**. Ninguna máquina está a menos de 50 horas de su próximo servicio.`;
      } else {
        answer = `### 🚨 Radar de Mantenimiento Activo\n\nHay **${radar.totalAlerts} equipos** que requieren atención preventiva inmediata (**${radar.overdueCount} con pauta vencida**):\n\n` +
          radar.alerts
            .slice(0, 5)
            .map(
              (a) =>
                `- **${a.assetNumber}** (${a.brandModel}, ${a.faena}): Pauta **${a.serviceInterval}** en ${a.nextServiceAt} hrs. (${a.isOverdue ? `🔴 **VENCIDA hace ${Math.abs(a.hoursRemaining)}h**` : `🟡 Restan **${a.hoursRemaining}h**`})`,
            )
            .join('\n') +
          `\n\n> Te recomiendo revisar el radar y emitir las Órdenes de Trabajo correspondientes.`;

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
        '¿Qué equipos están operativos y cuáles detenidos?',
        '¿Tenemos stock de filtros y aceites para estas mantenciones?',
        '¿Hay consumo anómalo de combustible en algún equipo?',
      );
    }

    // 3. Intent: Approvals / Purchase Orders / Autorizaciones / Compras
    else if (
      rawMsg.includes('compra') ||
      rawMsg.includes('orden') ||
      rawMsg.includes('oc') ||
      rawMsg.includes('aprob') ||
      rawMsg.includes('autoriz') ||
      rawMsg.includes('pendiente')
    ) {
      toolsExecuted.push('get_pending_approvals');
      const approvals = await this.toolsService.getPendingApprovals();

      if (approvals.count === 0) {
        answer = `### 📝 Aprobaciones de Compras\n\nNo hay **Órdenes de Compra pendientes de aprobación**. Todas las adquisiciones se encuentran autorizadas o emitidas a proveedores.`;
      } else {
        const totalPendingAmount = approvals.orders.reduce((sum, o) => sum + o.totalAmount, 0);
        answer = `### 📋 Órdenes de Compra por Autorizar\n\nExisten **${approvals.count} órdenes de compra pendientes** de aprobación por un monto total de **$${totalPendingAmount.toLocaleString('es-CL')} CLP**:\n\n` +
          approvals.orders
            .map(
              (o) =>
                `- **${o.orderNumber}** | Proveedor: **${o.supplier}** | Monto: **$${o.totalAmount.toLocaleString('es-CL')} CLP** (${o.itemsCount} ítems)`,
            )
            .join('\n') +
          `\n\n> Podés revisarlas y aprobarlas (o aplicar la excepción de Súper Usuario si excede el límite) en el módulo de Compras o Panel de Administración.`;

        cards.push({
          type: 'PENDING_APPROVALS',
          title: `Órdenes por Aprobar (${approvals.count})`,
          description: `Monto total acumulado: $${totalPendingAmount.toLocaleString('es-CL')} CLP`,
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
        '¿Cuál es el stock crítico actual en bodega?',
        '¿Cuáles son los costos operativos de las faenas?',
        '¿Cómo está la disponibilidad de la flota?',
      );
    }

    // 4. Intent: Fleet / Flota / Maquinarias / Equipos
    else if (
      rawMsg.includes('flota') ||
      rawMsg.includes('maquinaria') ||
      rawMsg.includes('equipo') ||
      rawMsg.includes('operativ') ||
      rawMsg.includes('camion') ||
      rawMsg.includes('camión') ||
      rawMsg.includes('excavadora') ||
      rawMsg.includes('bulldozer')
    ) {
      toolsExecuted.push('get_fleet_status');
      const fleet = await this.toolsService.getFleetStatus();

      answer = `### 🚜 Estado General de la Flota SGMT\n\n` +
        `- **Total de Equipos**: ${fleet.summary.total} unidades\n` +
        `- **Disponibilidad Operativa**: **${fleet.summary.operationalRate}** (${fleet.summary.operational} operativos)\n` +
        `- **En Mantención**: ${fleet.summary.underMaintenance} unidades\n` +
        `- **Detenidos / Standby**: ${fleet.summary.detained} unidades\n\n` +
        `**Distribución en terreno:**\n` +
        fleet.assets
          .slice(0, 6)
          .map(
            (a) =>
              `- **${a.internalNumber}** (${a.type} ${a.brand} ${a.model}): ${a.status === 'OPERATIVO' ? '🟢 Operativo' : a.status === 'EN_MANTENCION' ? '🟡 Mantención' : '🔴 Detenido'} | Faena: **${a.currentFaena}** | Horómetro: **${a.hourmeter}h**`,
          )
          .join('\n');

      cards.push({
        type: 'FLEET_STATUS',
        title: `Disponibilidad de Flota: ${fleet.summary.operationalRate}`,
        description: `${fleet.summary.operational} de ${fleet.summary.total} equipos operativos en faenas activas.`,
        badge: `${fleet.summary.operationalRate} Operativo`,
        badgeVariant: 'success',
        data: fleet,
        actionButton: {
          label: 'Ver Control de Flota',
          route: '/flota',
          variant: 'primary',
        },
      });

      suggestedQuestions.push(
        '¿Qué equipos están próximos a vencer su mantención?',
        '¿Hay anomalías de consumo de combustible?',
        '¿Cuál es el costo consolidado de las faenas?',
      );
    }

    // 5. Intent: Faenas / Costos / Finanzas / Combustible / Rendimiento
    else if (
      rawMsg.includes('faena') ||
      rawMsg.includes('costo') ||
      rawMsg.includes('gasto') ||
      rawMsg.includes('combustible') ||
      rawMsg.includes('diesel') ||
      rawMsg.includes('litro') ||
      rawMsg.includes('presupuesto')
    ) {
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

      answer = `### 💰 Resumen Operativo & Costos por Faena\n\n` +
        `- **Presupuesto Total Contratado**: $${totalBudget.toLocaleString('es-CL')} CLP\n` +
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
        description: `Gasto operativo acumulado de $${totalSpend.toLocaleString('es-CL')} CLP en ${faenasData.faenasCount} faenas activas.`,
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
    }

    // 6. Default Fallback / General Assistant Overview
    else {
      answer = `Hola **${user?.name || 'Colega'}**, soy tu **Copiloto Agéntico de SGMT** 🚜🤖.\n\nTengo acceso en tiempo real a todas las operaciones del sistema para asistirte en:\n\n` +
        `- 🚜 **Control de Flota**: Disponibilidad de maquinaria, horómetros y faenas asignadas.\n` +
        `- 🛡️ **Radar de Mantenimiento**: Alertas preventivas (250h, 500h, 1000h) y OTs críticas.\n` +
        `- 📦 **Bodega & Stock Crítico**: Detección inmediata de insumos bajo stock de seguridad.\n` +
        `- 📝 **Compras & Aprobaciones**: Órdenes de compra pendientes de autorización y montos.\n` +
        `- 💰 **Costos & Combustible**: Rendimiento L/hr, quemado presupuestario y cierres de faena.\n\n` +
        `¿Qué querés consultar en este momento?`;

      suggestedQuestions.push(
        '🚨 ¿Qué equipos tienen mantención vencida o próxima?',
        '📦 ¿Cuáles ítems están bajo stock mínimo?',
        '📝 ¿Hay órdenes de compra pendientes de aprobación?',
        '🚜 ¿Cuál es la disponibilidad actual de la flota?',
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
      text: '¿Cuál es el resumen de costos y combustible de este mes?',
      category: 'Finanzas',
      priority: 'low',
    });

    suggestions.push({
      text: '¿Cuál es el porcentaje de disponibilidad operativa de la flota?',
      category: 'Flota',
      priority: 'low',
    });

    return suggestions;
  }
}
