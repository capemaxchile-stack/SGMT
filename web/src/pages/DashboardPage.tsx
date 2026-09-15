import { Card, CardContent } from '../components/ui/Card';
import { Factory, Truck, Box, FileText } from 'lucide-react';

export function DashboardPage() {
  const stats = [
    { title: 'Faenas Activas', value: '4', icon: <Factory className="text-blue-500" size={24} />, trend: '+1 este mes' },
    { title: 'Equipos en Flota', value: '142', icon: <Truck className="text-amber-500" size={24} />, trend: '98% operativos' },
    { title: 'Items en Bodega', value: '3,842', icon: <Box className="text-emerald-500" size={24} />, trend: '12 bajo stock' },
    { title: 'OC Pendientes', value: '18', icon: <FileText className="text-purple-500" size={24} />, trend: 'Requieren aprobación' },
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
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">{stat.icon}</div>
              </div>
              <div className="mt-4 text-sm text-slate-600">
                {stat.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-96 flex items-center justify-center bg-slate-50 border-dashed border-2">
          <p className="text-slate-400">Gráfico de Productividad (Próximamente)</p>
        </Card>
        <Card className="h-96 flex items-center justify-center bg-slate-50 border-dashed border-2">
          <p className="text-slate-400">Actividad Reciente (Próximamente)</p>
        </Card>
      </div>
    </div>
  );
}
