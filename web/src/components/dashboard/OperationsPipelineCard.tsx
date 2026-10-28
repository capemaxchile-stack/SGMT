import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  DollarSign,
  PackageCheck,
  User,
  Layers,
} from 'lucide-react';
import { usePurchaseRequests, usePurchaseOrders } from '../../api/compras';
import { PurchaseRequest, PurchaseOrder } from '../../types/compras';

interface StageItem {
  id: string;
  code: string;
  secondary: string;
  tertiary?: string;
  urgency?: string;
  hoursElapsed: number;
  slaLimitHours: number;
  slaStatus: 'on_track' | 'warning' | 'breached';
  slaLabel: string;
}

interface StageColumn {
  id: string;
  title: string;
  stepNumber: number;
  responsibleRole: string;
  responsibleEmail: string;
  maxSla: string;
  slaHours: number;
  icon: any;
  colorTheme: {
    badge: string;
    iconBg: string;
    border: string;
    accent: string;
  };
  link: string;
  items: StageItem[];
}

export function OperationsPipelineCard() {
  const { data: requests = [], isLoading: loadingRequests } = usePurchaseRequests();
  const { data: orders = [], isLoading: loadingOrders } = usePurchaseOrders();

  const now = new Date().getTime();

  const getSlaInfo = (timestamp: string | undefined, slaLimitHours: number): {
    hoursElapsed: number;
    slaStatus: 'on_track' | 'warning' | 'breached';
    slaLabel: string;
  } => {
    if (!timestamp) {
      return { hoursElapsed: 0, slaStatus: 'on_track', slaLabel: 'En Plazo' };
    }
    const created = new Date(timestamp).getTime();
    const hoursElapsed = Math.max(0, (now - created) / (1000 * 60 * 60));

    if (hoursElapsed > slaLimitHours) {
      const overdue = Math.round(hoursElapsed - slaLimitHours);
      return {
        hoursElapsed,
        slaStatus: 'breached',
        slaLabel: overdue > 0 ? `+${overdue}h Excedido` : 'SLA Vencido',
      };
    } else if (hoursElapsed >= slaLimitHours * 0.75) {
      const remaining = Math.round(slaLimitHours - hoursElapsed);
      return {
        hoursElapsed,
        slaStatus: 'warning',
        slaLabel: `${remaining}h restantes`,
      };
    } else {
      return {
        hoursElapsed,
        slaStatus: 'on_track',
        slaLabel: `${Math.round(hoursElapsed)}h / ${slaLimitHours}h`,
      };
    }
  };

  // 1. Stage: Terreno -> Visado de Faena
  const stage1Requests = requests.filter(
    (r: PurchaseRequest) => r.status === 'BORRADOR' || r.status === 'PENDIENTE'
  );
  const stage1Items: StageItem[] = stage1Requests.map((r) => {
    const sla = getSlaInfo(r.createdAt, 24);
    return {
      id: r.id,
      code: r.requestNumber,
      secondary: r.faena?.name || 'Faena Terreno',
      tertiary: `${r.lines?.length || 0} repuesto(s)`,
      urgency: r.lines?.[0]?.urgency,
      hoursElapsed: sla.hoursElapsed,
      slaLimitHours: 24,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
    };
  });

  // 2. Stage: Visado -> Cotización y Gestión Adquisiciones
  const stage2Requests = requests.filter((r: PurchaseRequest) => r.status === 'APROBADA');
  const stage2Items: StageItem[] = stage2Requests.map((r) => {
    const sla = getSlaInfo(r.approvedAt || r.updatedAt || r.createdAt, 48);
    return {
      id: r.id,
      code: r.requestNumber,
      secondary: r.faena?.name || 'Faena Terreno',
      tertiary: `${r.lines?.length || 0} ítem(s) listos para cotizar`,
      urgency: r.lines?.[0]?.urgency,
      hoursElapsed: sla.hoursElapsed,
      slaLimitHours: 48,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
    };
  });

  // 3. Stage: Órdenes de Compra -> Aprobación Financiera
  const stage3Orders = orders.filter(
    (o: PurchaseOrder) => o.status === 'PENDIENTE_APROBACION'
  );
  const stage3Items: StageItem[] = stage3Orders.map((o) => {
    const sla = getSlaInfo(o.createdAt, 24);
    return {
      id: o.id,
      code: o.orderNumber,
      secondary: o.supplier?.businessName || 'Proveedor por validar',
      tertiary: `$${Number(o.totalAmount || 0).toLocaleString('es-CL')}`,
      hoursElapsed: sla.hoursElapsed,
      slaLimitHours: 24,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
    };
  });

  // 4. Stage: Órdenes Emitidas -> En Tránsito y Recepción Bodega
  const stage4Orders = orders.filter(
    (o: PurchaseOrder) =>
      o.status === 'APROBADA' || o.status === 'EMITIDA' || o.status === 'RECEPCION_PARCIAL'
  );
  const stage4Items: StageItem[] = stage4Orders.map((o) => {
    const sla = getSlaInfo(o.createdAt, 72);
    return {
      id: o.id,
      code: o.orderNumber,
      secondary: o.supplier?.businessName || 'Proveedor',
      tertiary: `$${Number(o.totalAmount || 0).toLocaleString('es-CL')}`,
      hoursElapsed: sla.hoursElapsed,
      slaLimitHours: 72,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
    };
  });

  const stages: StageColumn[] = [
    {
      id: 'faena-visado',
      title: 'Aprobación Jefatura',
      stepNumber: 1,
      responsibleRole: 'Jefe de Faena',
      responsibleEmail: 'jefefaena@katei.cl',
      maxSla: '24h',
      slaHours: 24,
      icon: ShieldCheck,
      colorTheme: {
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-900/60',
        accent: 'text-blue-600 dark:text-blue-400',
      },
      link: '/compras?tab=requests',
      items: stage1Items,
    },
    {
      id: 'compras-cotizacion',
      title: 'Cotización & OC',
      stepNumber: 2,
      responsibleRole: 'Comprador Adquisiciones',
      responsibleEmail: 'comprador@katei.cl',
      maxSla: '48h',
      slaHours: 48,
      icon: ShoppingCart,
      colorTheme: {
        badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-900/60',
        accent: 'text-indigo-600 dark:text-indigo-400',
      },
      link: '/compras?tab=quotations',
      items: stage2Items,
    },
    {
      id: 'gerencia-aprobacion',
      title: 'Aprobación Finanzas',
      stepNumber: 3,
      responsibleRole: 'Gerente Operaciones',
      responsibleEmail: 'gerente@katei.cl',
      maxSla: '24h',
      slaHours: 24,
      icon: DollarSign,
      colorTheme: {
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-900',
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-900/60',
        accent: 'text-purple-600 dark:text-purple-400',
      },
      link: '/compras?tab=orders',
      items: stage3Items,
    },
    {
      id: 'bodega-recepcion',
      title: 'Recepción en Bodega',
      stepNumber: 4,
      responsibleRole: 'Bodeguero Central',
      responsibleEmail: 'bodega@katei.cl',
      maxSla: '72h',
      slaHours: 72,
      icon: PackageCheck,
      colorTheme: {
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-900/60',
        accent: 'text-emerald-600 dark:text-emerald-400',
      },
      link: '/compras?tab=pending',
      items: stage4Items,
    },
  ];

  const totalInFlight =
    stage1Items.length + stage2Items.length + stage3Items.length + stage4Items.length;

  const totalBreached =
    stage1Items.filter((i) => i.slaStatus === 'breached').length +
    stage2Items.filter((i) => i.slaStatus === 'breached').length +
    stage3Items.filter((i) => i.slaStatus === 'breached').length +
    stage4Items.filter((i) => i.slaStatus === 'breached').length;

  const totalWarning =
    stage1Items.filter((i) => i.slaStatus === 'warning').length +
    stage2Items.filter((i) => i.slaStatus === 'warning').length +
    stage3Items.filter((i) => i.slaStatus === 'warning').length +
    stage4Items.filter((i) => i.slaStatus === 'warning').length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 rounded-lg">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Pipeline de Operaciones & Control de SLAs
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {totalInFlight} en curso
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trazabilidad extremo a extremo del flujo de compras con monitoreo de tiempos de respuesta por rol.
              </p>
            </div>
          </div>
        </div>

        {/* Global SLA status summary pills */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 size={13} />
            <span>{totalInFlight - totalBreached - totalWarning} En Plazo</span>
          </div>
          {totalWarning > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <AlertTriangle size={13} />
              <span>{totalWarning} Riesgo SLA</span>
            </div>
          )}
          {totalBreached > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-pulse">
              <AlertOctagon size={13} />
              <span>{totalBreached} SLA Vencido</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Pipeline Stages Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              className={`rounded-xl border ${stage.colorTheme.border} bg-slate-50/50 dark:bg-slate-950/40 p-3.5 flex flex-col justify-between space-y-3`}
            >
              {/* Stage Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black flex items-center justify-center">
                      {stage.stepNumber}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {stage.title}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${stage.colorTheme.badge}`}
                  >
                    SLA: {stage.maxSla}
                  </span>
                </div>

                {/* Responsible Actor */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 mb-3">
                  <User size={12} className={stage.colorTheme.accent} />
                  <span className="font-semibold truncate">{stage.responsibleRole}</span>
                </div>

                {/* Items in Stage */}
                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {loadingRequests || loadingOrders ? (
                    <div className="text-[11px] text-slate-400 py-4 text-center">
                      Cargando operaciones...
                    </div>
                  ) : stage.items.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                      <Icon size={24} className="mx-auto mb-1 stroke-1 opacity-50" />
                      <p className="text-[11px]">Bandeja al día, sin pendientes</p>
                    </div>
                  ) : (
                    stage.items.map((item) => (
                      <Link
                        key={item.id}
                        to={stage.link}
                        className="block p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-600 transition-all shadow-2xs group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-primary-700 dark:text-primary-300 group-hover:underline">
                            {item.code}
                          </span>
                          {/* SLA Pill */}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.slaStatus === 'breached'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                : item.slaStatus === 'warning'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                            }`}
                          >
                            <Clock size={10} />
                            {item.slaLabel}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1 truncate">
                          {item.secondary}
                        </p>
                        {item.tertiary && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.tertiary}
                          </p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {stage.items.length} {stage.items.length === 1 ? 'registro' : 'registros'}
                </span>
                <Link
                  to={stage.link}
                  className={`text-[11px] font-bold ${stage.colorTheme.accent} hover:underline inline-flex items-center gap-1`}
                >
                  Gestionar <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
