import { useState } from 'react';
import { useMaintenanceAlerts, useCreateWorkOrder } from '../../api/maintenance';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { AssetIcon } from '../../components/ui/AssetIcon';
import {
  AlertTriangle,
  Clock,
  Wrench,
  ShieldAlert,
  Search,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { MaintenanceAlert, WorkOrderType, WorkOrderPriority } from '../../types/models';

export function AlertsRadarTab() {
  const { data: alerts = [], isLoading } = useMaintenanceAlerts();
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Quick OT modal state
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<MaintenanceAlert | null>(null);
  const [otForm, setOtForm] = useState({
    description: '',
    technicianName: '',
    priority: 'ALTA' as WorkOrderPriority,
  });

  const createOtMutation = useCreateWorkOrder();

  const filteredAlerts = alerts.filter((al) => {
    if (levelFilter !== 'ALL' && al.alertLevel !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        al.internalNumber.toLowerCase().includes(q) ||
        al.brand.toLowerCase().includes(q) ||
        al.model.toLowerCase().includes(q) ||
        al.planName.toLowerCase().includes(q) ||
        al.faena.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const overdueCount = alerts.filter((a) => a.alertLevel === 'VENCIDO').length;
  const upcomingCount = alerts.filter((a) => a.alertLevel === 'PROXIMO').length;

  const handleOpenQuickOt = (alert: MaintenanceAlert) => {
    setSelectedAlert(alert);
    setOtForm({
      description: `Mantenimiento preventivo programado por alerta de radar: ${alert.planName} (${alert.currentValue} / ${alert.interval} ${alert.metricType.toLowerCase()})`,
      technicianName: '',
      priority: alert.alertLevel === 'VENCIDO' ? 'CRITICA' : 'ALTA',
    });
    setIsOtModalOpen(true);
  };

  const handleCreateOtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;

    await createOtMutation.mutateAsync({
      assetId: selectedAlert.assetId,
      maintenancePlanId: selectedAlert.planId,
      type: 'PREVENTIVO' as WorkOrderType,
      priority: otForm.priority,
      description: otForm.description,
      currentHourmeter: selectedAlert.metricType === 'HORAS' ? selectedAlert.currentValue : undefined,
      currentKilometrage: selectedAlert.metricType === 'KILOMETROS' ? selectedAlert.currentValue : undefined,
      technicianName: otForm.technicianName || undefined,
    });

    setIsOtModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <ShieldAlert size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Servicios Vencidos</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">{overdueCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Próximos a Vencer (&lt;50 hrs)</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{upcomingCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Equipos Monitoreados</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">{alerts.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar equipo, faena o pauta en alerta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200"
        >
          <option value="ALL">Todas las Alertas</option>
          <option value="VENCIDO">Sólo Vencidos (Urgente)</option>
          <option value="PROXIMO">Sólo Próximos</option>
        </select>
      </div>

      {/* Alerts Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Analizando radar de horómetros y kilometrajes...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={44} />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Flota al Día en Mantenimientos
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Ninguna maquinaria presenta servicios vencidos ni próximos a su umbral crítico.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map((al, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between space-y-4 bg-white dark:bg-slate-900 ${
                al.alertLevel === 'VENCIDO'
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <AssetIcon type={al.type} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {al.internalNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {al.brand} {al.model}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ubicación actual: <strong className="text-slate-700 dark:text-slate-300">{al.faena}</strong>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    al.alertLevel === 'VENCIDO'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  }`}
                >
                  <AlertTriangle size={13} />
                  {al.alertLevel === 'VENCIDO' ? 'MANTENCIÓN VENCIDA' : 'PRÓXIMO A VENCER'}
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="truncate pr-2">{al.planName}</span>
                  <span className="shrink-0">
                    {al.currentValue} / {al.interval} {al.metricType === 'HORAS' ? 'Hrs' : 'Km'} ({al.percentUsed}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      al.alertLevel === 'VENCIDO'
                        ? 'bg-rose-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, al.percentUsed)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>
                    {al.alertLevel === 'VENCIDO'
                      ? `Excedido por ${Math.abs(al.remainingValue)} ${al.metricType.toLowerCase()}`
                      : `Restan ${al.remainingValue} ${al.metricType.toLowerCase()} de operación`}
                  </span>
                  <span>Estado equipo: <strong>{al.operationalStatus}</strong></span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleOpenQuickOt(al)}
                  className={
                    al.alertLevel === 'VENCIDO'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }
                >
                  <Wrench size={14} className="mr-1.5" />
                  Generar OT Preventiva
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Generar OT Rápida desde Alerta */}
      <Modal
        isOpen={isOtModalOpen}
        onClose={() => setIsOtModalOpen(false)}
        title={`Generar OT para ${selectedAlert?.internalNumber || ''}`}
      >
        <form onSubmit={handleCreateOtSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
            <p><strong>Equipo:</strong> {selectedAlert?.internalNumber} ({selectedAlert?.brand} {selectedAlert?.model})</p>
            <p><strong>Pauta:</strong> {selectedAlert?.planName}</p>
            <p><strong>Lectura Actual:</strong> {selectedAlert?.currentValue} {selectedAlert?.metricType.toLowerCase()}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Prioridad *
            </label>
            <select
              value={otForm.priority}
              onChange={(e) => setOtForm({ ...otForm, priority: e.target.value as WorkOrderPriority })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="CRITICA">Crítica Inmediata</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>

          <Input
            label="Mecánico o Taller Asignado"
            placeholder="Ej: Taller Terreno Faena / Juan Pérez"
            value={otForm.technicianName}
            onChange={(e) => setOtForm({ ...otForm, technicianName: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Instrucciones del Trabajo *
            </label>
            <textarea
              rows={3}
              value={otForm.description}
              onChange={(e) => setOtForm({ ...otForm, description: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOtModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createOtMutation.isPending}>
              Crear y Asignar OT
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
