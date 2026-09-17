import { Card, CardContent } from '../components/ui/Card';
import { Factory, Truck, Box, FileText, ArrowRight } from 'lucide-react';
import { useDashboardMetrics } from '../api/dashboard';
import { useMovements } from '../api/movements';
import { usePurchaseOrders } from '../api/compras';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { data: metrics, isLoading: loadingMetrics } = useDashboardMetrics();
  const { data: movements, isLoading: loadingMovements } = useMovements();
  const { data: orders, isLoading: loadingOrders } = usePurchaseOrders();

  const recentMovements = movements?.slice(0, 5) || [];
  const recentOrders = orders?.slice(0, 5) || [];

  const stats = [
    { title: 'Faenas Activas', value: metrics?.activeFaenasCount || 0, icon: <Factory className="text-blue-500" size={24} />, trend: 'Operando' },
    { title: 'Equipos en Flota', value: metrics?.totalAssetsCount || 0, icon: <Truck className="text-amber-500" size={24} />, trend: `${metrics?.operationalPercentage || 0}% operativos` },
    { title: 'Items en Bodega', value: metrics?.totalStockItemsCount || 0, icon: <Box className="text-emerald-500" size={24} />, trend: `${metrics?.lowStockItemsCount || 0} bajo stock mínimo` },
    { title: 'OC Pendientes', value: metrics?.pendingOrdersCount || 0, icon: <FileText className="text-purple-500" size={24} />, trend: 'Requieren aprobación' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-slate-500">Resumen de operaciones del sistema SGMT</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">
                    {loadingMetrics ? '...' : stat.value}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">{stat.icon}</div>
              </div>
              <div className="mt-4 text-sm text-slate-600">
                {loadingMetrics ? 'Cargando...' : stat.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-96 flex flex-col bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Movimientos Recientes en Bodega</h3>
            <Link to="/bodega" className="text-sm text-blue-600 hover:underline flex items-center gap-1">Ver todos <ArrowRight size={14} /></Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {loadingMovements ? (
              <p className="text-slate-500 text-sm">Cargando movimientos...</p>
            ) : recentMovements.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay movimientos recientes.</p>
            ) : (
              <ul className="space-y-3">
                {recentMovements.map(mov => {
                  const lineDesc = mov.lines && mov.lines.length > 0 
                    ? (mov.lines[0].item?.description || 'Material') + (mov.lines.length > 1 ? ` (+${mov.lines.length - 1})` : '')
                    : 'Sin detalle';
                  const totalQty = mov.lines?.reduce((acc, l) => acc + Number(l.quantity), 0) || 0;
                  return (
                    <li key={mov.id} className="flex justify-between items-center text-sm pb-3 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-medium text-slate-800">
                          {mov.type === 'INGRESO' ? 'Entrada' : mov.type === 'SALIDA' ? 'Salida' : 'Ajuste'} - {lineDesc}
                        </p>
                        <p className="text-xs text-slate-500">Bodega: {mov.warehouse?.name || mov.warehouseId}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${mov.type === 'INGRESO' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {mov.type === 'INGRESO' ? '+' : '-'}{totalQty}
                        </p>
                        <p className="text-xs text-slate-400">{new Date(mov.createdAt).toLocaleDateString()}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <Card className="h-96 flex flex-col bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Órdenes de Compra Recientes</h3>
            <Link to="/compras" className="text-sm text-blue-600 hover:underline flex items-center gap-1">Ver todas <ArrowRight size={14} /></Link>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {loadingOrders ? (
              <p className="text-slate-500 text-sm">Cargando órdenes...</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay órdenes recientes.</p>
            ) : (
              <ul className="space-y-3">
                {recentOrders.map(order => (
                  <li key={order.id} className="flex justify-between items-center text-sm pb-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-bold text-slate-800">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{order.supplier?.businessName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">${Number(order.totalAmount).toLocaleString('es-CL')}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        order.status === 'APROBADA' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'PENDIENTE_APROBACION' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
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
