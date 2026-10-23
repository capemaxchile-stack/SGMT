import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { usePurchaseRequests, usePurchaseOrders, useQuotations } from '../../api/compras';
import { PurchaseRequest, PurchaseOrder, Quotation } from '../../types/compras';

type WorkflowFilter = 'ALL' | 'FAENA' | 'COMPRAS' | 'GERENCIA' | 'BODEGA';

interface WorkflowActionItem {
  id: string;
  type: 'VISADO_FAENA' | 'RFQ_COTIZAR' | 'CARGAR_OFERTA' | 'AUTORIZAR_OC' | 'RECEPCION_BODEGA';
  category: WorkflowFilter;
  code: string;
  title: string;
  secondary: string;
  urgency?: string;
  slaStatus: 'on_track' | 'warning' | 'breached';
  slaLabel: string;
  actionText: string;
  actionLink: string;
  targetRole: string;
  accentColor: string;
}

export function WorkflowActionInbox() {
  const navigate = useNavigate();
  const { data: requests = [], isLoading: loadingRequests } = usePurchaseRequests();
  const { data: orders = [], isLoading: loadingOrders } = usePurchaseOrders();
  const { data: quotations = [], isLoading: loadingQuotes } = useQuotations();

  const [activeFilter, setActiveFilter] = useState<WorkflowFilter>('ALL');

  const now = Date.now();

  const getSla = (
    timestamp: string | undefined,
    slaLimitHours: number
  ): {
    slaStatus: 'on_track' | 'warning' | 'breached';
    slaLabel: string;
  } => {
    if (!timestamp) return { slaStatus: 'on_track', slaLabel: 'En Plazo' };
    const created = new Date(timestamp).getTime();
    const hoursElapsed = Math.max(0, (now - created) / (1000 * 60 * 60));

    if (hoursElapsed > slaLimitHours) {
      const overdue = Math.round(hoursElapsed - slaLimitHours);
      return {
        slaStatus: 'breached',
        slaLabel: overdue > 0 ? `+${overdue}h Excedido` : 'SLA Vencido',
      };
    } else if (hoursElapsed >= slaLimitHours * 0.75) {
      const remaining = Math.max(1, Math.round(slaLimitHours - hoursElapsed));
      return {
        slaStatus: 'warning',
        slaLabel: `${remaining}h restantes`,
      };
    } else {
      return {
        slaStatus: 'on_track',
        slaLabel: `${Math.round(hoursElapsed)}h / ${slaLimitHours}h`,
      };
    }
  };

  const actionItems: WorkflowActionItem[] = [];

  // 1. Solicitudes por Visar (Jefe Faena)
  const pendingRequests = requests.filter(
    (r: PurchaseRequest) => r.status === 'PENDIENTE' || r.status === 'BORRADOR'
  );
  for (const req of pendingRequests) {
    const hasStoppedAsset = req.lines?.some((l) => l.urgency === 'DETIENE_EQUIPO');
    const hasHighUrgency = req.lines?.some((l) => l.urgency === 'ALTA');
    const slaLimit = hasStoppedAsset ? 4 : hasHighUrgency ? 12 : 24;
    const sla = getSla(req.createdAt, slaLimit);

    actionItems.push({
      id: `visado-${req.id}`,
      type: 'VISADO_FAENA',
      category: 'FAENA',
      code: req.requestNumber,
      title: `Aprobación de Solicitud de Pedido`,
      secondary: `Faena: ${req.faena?.name || 'Terreno'} • ${req.lines?.length || 0} repuestos requeridos`,
      urgency: req.lines?.[0]?.urgency,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
      actionText: 'Revisar y Aprobar',
      actionLink: '/compras?tab=requests',
      targetRole: 'Jefe de Faena',
      accentColor: 'blue',
    });
  }

  // 2. Solicitudes Aprobadas esperando Licitación / Cotización (Compras)
  const approvedNoQuotes = requests.filter(
    (r: PurchaseRequest) => r.status === 'APROBADA' && (!r.quotations || r.quotations.length === 0)
  );
  for (const req of approvedNoQuotes) {
    const sla = getSla(req.approvedAt || req.updatedAt || req.createdAt, 48);
    actionItems.push({
      id: `rfq-${req.id}`,
      type: 'RFQ_COTIZAR',
      category: 'COMPRAS',
      code: req.requestNumber,
      title: `Emitir Solicitudes de Cotización (RFQ)`,
      secondary: `Faena: ${req.faena?.name || 'Terreno'} • ${req.lines?.length || 0} repuestos listos para proveedores`,
      urgency: req.lines?.[0]?.urgency,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
      actionText: 'Cotizar a Proveedores',
      actionLink: '/compras?tab=requests',
      targetRole: 'Comprador Adquisiciones',
      accentColor: 'indigo',
    });
  }

  // 3. Cotizaciones esperando Ofertas de Proveedor (Compras)
  const pendingQuotations = quotations.filter((q: Quotation) => q.status === 'SOLICITADA');
  for (const quote of pendingQuotations) {
    const sla = getSla(quote.requestedDate, 48);
    actionItems.push({
      id: `offer-${quote.id}`,
      type: 'CARGAR_OFERTA',
      category: 'COMPRAS',
      code: quote.quotationNumber,
      title: `Esperando Oferta de Proveedor`,
      secondary: `Proveedor: ${quote.supplier?.businessName || 'Proveedor'} • Solicitud: ${
        quote.purchaseRequest?.requestNumber || 'Terreno'
      }`,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
      actionText: 'Cargar Precios',
      actionLink: `/compras?tab=quotations&requestId=${quote.purchaseRequestId || ''}`,
      targetRole: 'Comprador Adquisiciones',
      accentColor: 'amber',
    });
  }

  // 4. Órdenes de Compra por Autorizar (Gerencia)
  const pendingOrders = orders.filter((o: PurchaseOrder) => o.status === 'PENDIENTE_APROBACION');
  for (const order of pendingOrders) {
    const sla = getSla(order.createdAt, 24);
    actionItems.push({
      id: `order-auth-${order.id}`,
      type: 'AUTORIZAR_OC',
      category: 'GERENCIA',
      code: order.orderNumber,
      title: `Autorización Financiera de OC`,
      secondary: `Monto: $${Number(order.totalAmount).toLocaleString('es-CL')} CLP • Proveedor: ${
        order.supplier?.businessName || 'Proveedor'
      }`,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
      actionText: 'Autorizar OC',
      actionLink: '/compras?tab=orders',
      targetRole: 'Gerente Operaciones',
      accentColor: 'purple',
    });
  }

  // 5. Órdenes en Tránsito por Recepcionar (Bodega)
  const transitOrders = orders.filter(
    (o: PurchaseOrder) => o.status === 'EMITIDA' || o.status === 'RECEPCION_PARCIAL'
  );
  for (const order of transitOrders) {
    const sla = getSla(order.createdAt, 72);
    actionItems.push({
      id: `reception-${order.id}`,
      type: 'RECEPCION_BODEGA',
      category: 'BODEGA',
      code: order.orderNumber,
      title: `Recepción Física en Bodega / Garita`,
      secondary: `Proveedor: ${order.supplier?.businessName} • Destino: ${
        order.receptionDestination || 'BODEGA'
      }`,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
      actionText: 'Recepcionar',
      actionLink: '/compras?tab=pending',
      targetRole: 'Bodeguero Central',
      accentColor: 'emerald',
    });
  }

  // Sort items: breached first, then warning, then on_track
  const slaWeight: Record<string, number> = {
    breached: 3,
    warning: 2,
    on_track: 1,
  };
  actionItems.sort((a, b) => slaWeight[b.slaStatus] - slaWeight[a.slaStatus]);

  const totalBreached = actionItems.filter((i) => i.slaStatus === 'breached').length;
  const totalWarning = actionItems.filter((i) => i.slaStatus === 'warning').length;

  const filteredItems = actionItems.filter((item) => {
    if (activeFilter === 'ALL') return true;
    return item.category === activeFilter;
  });

  const isLoading = loadingRequests || loadingOrders || loadingQuotes;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 shrink-0">
            <Flame size={20} className={totalBreached > 0 ? 'animate-bounce' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Bandeja de Acciones Inmediatas & Control de Flujos
              </h2>
              {actionItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold font-mono">
                  {actionItems.length} pendientes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300/80 mt-0.5">
              Empuja y guía la ejecución de solicitudes, cotizaciones, órdenes y recepciones para evitar retrasos de SLA.
            </p>
          </div>
        </div>

        {/* SLA Status Summary Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {totalBreached > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 font-bold animate-pulse">
              <AlertOctagon size={13} />
              {totalBreached} SLA Excedido
            </span>
          ) : null}
          {totalWarning > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-semibold">
              <AlertTriangle size={13} />
              {totalWarning} en Riesgo SLA
            </span>
          ) : null}
          {totalBreached === 0 && totalWarning === 0 && actionItems.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-semibold">
              <CheckCircle2 size={13} />
              Flujos en Plazo
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex gap-1.5 p-3 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Todas ({actionItems.length})
        </button>
        <button
          onClick={() => setActiveFilter('FAENA')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeFilter === 'FAENA'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
          }`}
        >
          Aprobación Jefatura ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveFilter('COMPRAS')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeFilter === 'COMPRAS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
          }`}
        >
          Cotizaciones RFQ ({approvedNoQuotes.length + pendingQuotations.length})
        </button>
        <button
          onClick={() => setActiveFilter('GERENCIA')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeFilter === 'GERENCIA'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
          }`}
        >
          Autorización OC ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveFilter('BODEGA')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeFilter === 'BODEGA'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
          }`}
        >
          Recepción Bodega ({transitOrders.length})
        </button>
      </div>

      {/* Action Items List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Analizando flujos de operaciones y tiempos SLA en vivo...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              ¡Bandeja al día!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              No hay autorizaciones, licitaciones ni acciones pendientes que requieran tu gestión en esta categoría.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* SLA Indicator Line */}
                <div
                  className={`w-1.5 self-stretch rounded-full shrink-0 ${
                    item.slaStatus === 'breached'
                      ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      : item.slaStatus === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {item.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.title}
                    </span>

                    {/* SLA Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.slaStatus === 'breached'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          : item.slaStatus === 'warning'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      <Clock size={10} />
                      {item.slaLabel}
                    </span>

                    {item.urgency === 'DETIENE_EQUIPO' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
                        DETIENE EQUIPO
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {item.secondary}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Responsable:</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                      {item.targetRole}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => navigate(item.actionLink)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs group-hover:scale-[1.02] ${
                    item.slaStatus === 'breached'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700'
                  }`}
                >
                  <span>{item.actionText}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
