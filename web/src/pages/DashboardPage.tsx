import { Card, CardContent } from '../components/ui/Card';
import {
  Factory,
  Truck,
  Box,
  FileText,
  Wrench,
  Fuel,
  ArrowRight,
  RefreshCw,
  Droplet,
  BarChart3,
  BadgePercent,
} from 'lucide-react';
import { useDashboardMetrics } from '../api/dashboard';
import { useQuotations } from '../api/compras';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/ui/StatusBadge';
import { OperationsPipelineCard } from '../components/dashboard/OperationsPipelineCard';
import { WorkflowActionInbox } from '../components/dashboard/WorkflowActionInbox';

export function DashboardPage() {
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useDashboardMetrics();
  const { data: quotations = [], isLoading: loadingQuotations, refetch: refetchQuotations } = useQuotations();

  const pendingQuotations = quotations.filter(
    (q) => q.status === 'SOLICITADA' || q.status === 'RECIBIDA'
  );

  const handleRefresh = () => {
    refetchMetrics();
    refetchQuotations();
  };

  const stats = [
    {
      title: 'Faenas Activas',
      value: metrics?.activeFaenasCount || 0,
      icon: <Factory className="text-blue-500" size={22} />,
      trend: 'En operación y faena',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      link: '/faenas',
    },
    {
      title: 'Flota & Maquinarias',
      value: metrics?.totalAssetsCount || 0,
      icon: <Truck className="text-amber-500" size={22} />,
      trend: `${metrics?.operationalPercentage || 0}% operativos`,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      link: '/flota',
    },
    {
      title: 'Mantenimiento & Taller',
      value: metrics?.openWorkOrdersCount || 0,
      icon: <Wrench className="text-indigo-500" size={22} />,
      trend: metrics?.criticalWorkOrdersCount ? `${metrics.criticalWorkOrdersCount} OTs críticas urgentes` : 'OTs en curso',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
      link: '/mantenimiento',
      isUrgent: Boolean(metrics?.criticalWorkOrdersCount && metrics.criticalWorkOrdersCount > 0),
    },
    {
      title: 'Combustible (Diésel)',
      value: `${Number(metrics?.totalFuelLiters || 0).toLocaleString('es-CL')} L`,
      icon: <Fuel className="text-amber-600" size={22} />,
      trend: `$${Number(metrics?.totalFuelSpend || 0).toLocaleString('es-CL')} acumulados`,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      link: '/combustible',
    },
    {
      title: 'Repuestos en Bodega',
      value: metrics?.totalStockItemsCount || 0,
      icon: <Box className="text-emerald-500" size={22} />,
      trend: `${metrics?.lowStockItemsCount || 0} bajo stock mínimo`,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      link: '/bodega',
    },
    {
      title: 'Cotizaciones Activas',
      value: pendingQuotations.length,
      icon: <BadgePercent className="text-cyan-500" size={22} />,
      trend: 'RFQs y ofertas en evaluación',
      bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900',
      link: '/compras?tab=quotations',
    },
    {
      title: 'OC Pendientes',
      value: metrics?.pendingOrdersCount || 0,
      icon: <FileText className="text-purple-500" size={22} />,
      trend: 'Requieren aprobación',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
      link: '/compras',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
            Dashboard Operacional
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Métricas clave de faenas, maquinaria, mantenimiento, abastecimiento y combustible en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
            title="Refrescar métricas en vivo"
          >
            <RefreshCw size={14} className={loadingMetrics || loadingQuotations ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {stats.map((stat, i) => (
          <Link key={i} to={stat.link} className="block group">
            <Card className="h-full bg-white dark:bg-slate-900 dark:border-slate-800 transition-all group-hover:border-blue-500 group-hover:shadow-md">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {stat.title}
                  </span>
                  <div className={`p-2 rounded-lg border ${stat.bg}`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {loadingMetrics ? '...' : stat.value}
                  </p>
                  <p className={`text-[11px] mt-1 font-medium truncate ${
                    stat.isUrgent
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {stat.trend}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Link
          to="/compras?tab=requests"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <div className="p-2 bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded-lg">
            <BadgePercent size={16} />
          </div>
          <span>Emitir Cotización (RFQ)</span>
        </Link>

        <Link
          to="/compras?tab=quotations"
          className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <FileText size={16} />
            </div>
            <span className="truncate">Estado de Cotizaciones</span>
          </div>
          {pendingQuotations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] font-black shrink-0">
              {pendingQuotations.length}
            </span>
          )}
        </Link>

        <Link
          to="/mantenimiento"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Wrench size={16} />
          </div>
          <span>Nueva Orden de Trabajo</span>
        </Link>

        <Link
          to="/combustible"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg">
            <Droplet size={16} />
          </div>
          <span>Cargar Diésel / Aljibe</span>
        </Link>

        <Link
          to="/bodega"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Box size={16} />
          </div>
          <span>Inventario / Stock</span>
        </Link>

        <Link
          to="/compras?tab=orders"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg">
            <FileText size={16} />
          </div>
          <span>Emitir Orden de Compra</span>
        </Link>

        <Link
          to="/reportes"
          className="col-span-2 sm:col-span-1 flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
            <BarChart3 size={16} />
          </div>
          <span>Reportes & Cierres</span>
        </Link>
      </div>

      {/* Workflow Action Inbox: Pending Approvals, Quotes & SLA Tracking */}
      <WorkflowActionInbox />

      {/* Operations Lifecycle & SLA Monitoring Pipeline */}
      <OperationsPipelineCard />

      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cotizaciones Pendientes & En Evaluación */}
        <Card className="h-[380px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm lg:col-span-2">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <BadgePercent size={16} className="text-cyan-500" />
              Cotizaciones Pendientes & En Evaluación
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                {pendingQuotations.length}
              </span>
            </h3>
            <Link
              to="/compras?tab=quotations"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver estado de cotizaciones <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {pendingQuotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <BadgePercent size={32} className="stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>No hay cotizaciones pendientes de evaluación en este momento</span>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingQuotations.map((quote) => (
                  <li
                    key={quote.id}
                    className="flex justify-between items-center text-xs p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="font-mono text-primary-600 dark:text-primary-400">
                          {quote.quotationNumber}
                        </span>
                        <span className="truncate">— {quote.supplier?.businessName || 'Proveedor'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        Solicitud: {quote.purchaseRequest?.requestNumber || 'General'} •{' '}
                        {quote.lines?.length || 0} repuesto(s)
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          quote.status === 'RECIBIDA'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {quote.status === 'RECIBIDA' ? 'Oferta Recibida' : 'Solicitada'}
                      </span>
                      <Link
                        to={`/compras?tab=quotations&requestId=${quote.purchaseRequestId || ''}`}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Gestionar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* 1. Mantenimiento Reciente */}
        <Card className="h-[380px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <Wrench size={16} className="text-indigo-500" />
              Órdenes de Trabajo en Taller
            </h3>
            <Link
              to="/mantenimiento"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {!metrics?.recentWorkOrders || metrics.recentWorkOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Wrench size={32} className="stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>No hay órdenes de trabajo recientes</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {metrics.recentWorkOrders.map((ot: any) => (
                  <li
                    key={ot.id}
                    className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {ot.otNumber} — {ot.asset?.internalNumber} ({ot.asset?.brand})
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {ot.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <StatusBadge status={ot.status} />
                      <div className="text-[10px] text-slate-400 mt-1 font-bold">
                        {ot.type}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* 2. Combustible Reciente */}
        <Card className="h-[380px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <Fuel size={16} className="text-amber-500" />
              Últimos Despachos de Combustible
            </h3>
            <Link
              to="/combustible"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {!metrics?.recentFuelLogs || metrics.recentFuelLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Fuel size={32} className="stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>No hay despachos de combustible registrados</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {metrics.recentFuelLogs.map((log: any) => (
                  <li
                    key={log.id}
                    className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.dispatchNumber} — {log.asset?.internalNumber} ({log.asset?.brand})
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Faena: {log.faena?.name || 'Central'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-black text-amber-600 dark:text-amber-400">
                        {Number(log.liters)} L
                      </span>
                      {Number(log.litersPerHour) > 0 && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          {Number(log.litersPerHour)} L/h
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* 3. Movements Bodega */}
        <Card className="h-[380px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <Box size={16} className="text-emerald-500" />
              Movimientos Recientes de Inventario / Stock
            </h3>
            <Link
              to="/bodega"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {!metrics?.recentMovements || metrics.recentMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Box size={32} className="stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>No hay movimientos registrados</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {metrics.recentMovements.map((mov: any) => {
                  const lineDesc =
                    mov.lines && mov.lines.length > 0
                      ? (mov.lines[0].item?.description || 'Repuesto') +
                        (mov.lines.length > 1 ? ` (+${mov.lines.length - 1})` : '')
                      : 'Sin detalle';
                  const totalQty = mov.lines?.reduce((acc: number, l: any) => acc + Number(l.quantity), 0) || 0;
                  return (
                    <li
                      key={mov.id}
                      className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {mov.type === 'INGRESO' ? 'Entrada' : mov.type === 'SALIDA' ? 'Salida' : 'Ajuste'} — {lineDesc}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Bodega: {mov.warehouse?.name || mov.warehouseId}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p
                          className={`font-bold ${
                            mov.type === 'INGRESO'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {mov.type === 'INGRESO' ? '+' : '-'}
                          {totalQty}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(mov.createdAt).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* 4. Purchase Orders */}
        <Card className="h-[380px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <FileText size={16} className="text-purple-500" />
              Órdenes de Compra Recientes
            </h3>
            <Link
              to="/compras"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {!metrics?.recentOrders || metrics.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <FileText size={32} className="stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>No hay órdenes de compra registradas</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {metrics.recentOrders.map((order: any) => (
                  <li
                    key={order.id}
                    className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{order.orderNumber}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {order.supplier?.businessName || 'Proveedor'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        ${Number(order.totalAmount).toLocaleString('es-CL')}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                          order.status === 'APROBADA' || order.status === 'RECEPCION_TOTAL'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : order.status === 'PENDIENTE_APROBACION'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
