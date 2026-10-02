import { Card, CardContent } from '../components/ui/Card';
import { Factory, Truck, Box, FileText, ArrowRight, Server, Activity, RefreshCw } from 'lucide-react';
import { useDashboardMetrics } from '../api/dashboard';
import { useMovements } from '../api/movements';
import { usePurchaseOrders } from '../api/compras';
import { APP_VERSION, BUILD_DATE } from '../components/layout/Sidebar';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useDashboardMetrics();
  const { data: movements, isLoading: loadingMovements, refetch: refetchMovements } = useMovements();
  const { data: orders, isLoading: loadingOrders, refetch: refetchOrders } = usePurchaseOrders();

  const handleRefresh = () => {
    refetchMetrics();
    refetchMovements();
    refetchOrders();
  };

  const recentMovements = movements?.slice(0, 5) || [];
  const recentOrders = orders?.slice(0, 5) || [];

  const stats = [
    {
      title: 'Faenas Activas',
      value: metrics?.activeFaenasCount || 0,
      icon: <Factory className="text-blue-500" size={24} />,
      trend: 'En operación y faena',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    },
    {
      title: 'Flota & Maquinarias',
      value: metrics?.totalAssetsCount || 0,
      icon: <Truck className="text-amber-500" size={24} />,
      trend: `${metrics?.operationalPercentage || 0}% operativos`,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    },
    {
      title: 'Ítems en Bodega',
      value: metrics?.totalStockItemsCount || 0,
      icon: <Box className="text-emerald-500" size={24} />,
      trend: `${metrics?.lowStockItemsCount || 0} bajo stock mínimo`,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    },
    {
      title: 'OC Pendientes',
      value: metrics?.pendingOrdersCount || 0,
      icon: <FileText className="text-purple-500" size={24} />,
      trend: 'Requieren aprobación',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
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
            Sistema de Gestión Movimiento de Tierra (SGMT)
          </h1>
          <p className="text-sm text-blue-100/80 mt-1 max-w-2xl">
            Control de faenas mineras, flota de maquinaria, inventarios centralizados y flujo de autorizaciones contables.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">
                    {loadingMetrics ? '...' : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${stat.bg}`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Activity size={12} className="text-slate-400" />
                {loadingMetrics ? 'Cargando datos...' : stat.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movements */}
        <Card className="h-[400px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
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
            {loadingMovements ? (
              <p className="text-slate-500 text-xs">Cargando movimientos...</p>
            ) : recentMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Box size={32} className="stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>No hay movimientos registrados</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentMovements.map((mov) => {
                  const lineDesc = mov.lines && mov.lines.length > 0 
                    ? (mov.lines[0].item?.description || 'Material') + (mov.lines.length > 1 ? ` (+${mov.lines.length - 1})` : '')
                    : 'Sin detalle';
                  const totalQty = mov.lines?.reduce((acc, l) => acc + Number(l.quantity), 0) || 0;
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
                      <div className="text-right">
                        <p className={`font-bold ${mov.type === 'INGRESO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {mov.type === 'INGRESO' ? '+' : '-'}{totalQty}
                        </p>
                        <p className="text-[10px] text-slate-400">{new Date(mov.createdAt).toLocaleDateString('es-CL')}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Purchase Orders */}
        <Card className="h-[400px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
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
            {loadingOrders ? (
              <p className="text-slate-500 text-xs">Cargando órdenes...</p>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <FileText size={32} className="stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>No hay órdenes de compra registradas</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentOrders.map((order) => (
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
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        ${Number(order.totalAmount).toLocaleString('es-CL')}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                        order.status === 'APROBADA' || order.status === 'RECEPCION_TOTAL'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : order.status === 'PENDIENTE_APROBACION'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                      }`}>
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
