import { Card, CardContent } from '../components/ui/Card';
import {
  Factory,
  Truck,
  Box,
  FileText,
  Wrench,
  Fuel,
  ArrowRight,
  Server,
  RefreshCw,
  Droplet,
  BarChart3,
} from 'lucide-react';
import { useDashboardMetrics } from '../api/dashboard';
import { APP_VERSION, BUILD_DATE } from '../components/layout/Sidebar';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/ui/StatusBadge';

export function DashboardPage() {
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useDashboardMetrics();

  const handleRefresh = () => {
    refetchMetrics();
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
      title: 'Ítems en Bodega',
      value: metrics?.totalStockItemsCount || 0,
      icon: <Box className="text-emerald-500" size={22} />,
      trend: `${metrics?.lowStockItemsCount || 0} bajo stock mínimo`,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      link: '/bodega',
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
      {/* Deployment & Environment Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-blue-600/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-mono font-bold tracking-wider">
              {APP_VERSION} PROD
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              API Online
            </span>
            <span className="text-xs text-blue-200/70">
              Build {BUILD_DATE}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Sistema de Gestión Movimiento de Tierra (SGMT PRO)
          </h1>
          <p className="text-sm text-blue-100/80 mt-1 max-w-2xl">
            Control integral de faenas, maquinaria, mantenimiento preventivo/correctivo, abastecimiento y combustible en terreno.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:block text-right text-xs text-blue-200/80 bg-blue-900/40 px-3.5 py-2 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-1.5 justify-end font-semibold text-white">
              <Server size={13} className="text-blue-400" />
              <span>Homelab LXC 106</span>
            </div>
            <div className="text-[11px] text-blue-200/60 mt-0.5">PostgreSQL 16 + Docker</div>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl text-xs font-semibold text-white transition-colors border border-white/20"
            title="Refrescar métricas en vivo"
          >
            <RefreshCw size={14} className={loadingMetrics ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
          <span>Movimiento de Bodega</span>
        </Link>

        <Link
          to="/compras"
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

      {/* 4 Activity Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              Movimientos Recientes en Bodega
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
                      ? (mov.lines[0].item?.description || 'Material') +
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
