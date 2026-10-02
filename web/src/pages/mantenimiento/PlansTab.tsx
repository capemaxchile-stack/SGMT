import { useState } from 'react';
import {
  useMaintenancePlans,
  useCreateMaintenancePlan,
  useUpdateMaintenancePlan,
  useDeleteMaintenancePlan,
} from '../../api/maintenance';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Gauge,
  CheckCircle,
  Truck,
} from 'lucide-react';
import { AssetType, MaintenancePlan } from '../../types/models';

export function PlansTab() {
  const { data: plans = [], isLoading } = useMaintenancePlans();
  const [selectedAssetType, setSelectedAssetType] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);

  // Mutations
  const createMutation = useCreateMaintenancePlan();
  const updateMutation = useUpdateMaintenancePlan();
  const deleteMutation = useDeleteMaintenancePlan();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    assetType: 'EXCAVADORA' as AssetType,
    intervalHours: 250,
    intervalKm: 0,
    description: '',
    checklistText: '',
  });

  const filteredPlans = plans.filter((p) => {
    if (selectedAssetType === 'ALL') return true;
    return p.assetType === selectedAssetType;
  });

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      assetType: 'EXCAVADORA',
      intervalHours: 250,
      intervalKm: 0,
      description: '',
      checklistText: 'Cambio de aceite de motor y filtro\nRevisión de nivel hidráulico\nEngrase general de articulaciones',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: MaintenancePlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      assetType: plan.assetType,
      intervalHours: plan.intervalHours || 0,
      intervalKm: plan.intervalKm || 0,
      description: plan.description || '',
      checklistText: Array.isArray(plan.checklist) ? plan.checklist.join('\n') : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checklist = formData.checklistText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingPlan) {
      await updateMutation.mutateAsync({
        id: editingPlan.id,
        data: {
          name: formData.name,
          assetType: formData.assetType,
          intervalHours: formData.intervalHours > 0 ? Number(formData.intervalHours) : undefined,
          intervalKm: formData.intervalKm > 0 ? Number(formData.intervalKm) : undefined,
          description: formData.description,
          checklist,
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: formData.name,
        assetType: formData.assetType,
        intervalHours: formData.intervalHours > 0 ? Number(formData.intervalHours) : undefined,
        intervalKm: formData.intervalKm > 0 ? Number(formData.intervalKm) : undefined,
        description: formData.description,
        checklist,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas desactivar esta pauta de mantenimiento?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
            <BookOpen size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Pautas y Protocolos de Servicio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Checklists e intervalos programados de mantención preventiva por tipo de maquinaria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedAssetType}
            onChange={(e) => setSelectedAssetType(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Todos los Tipos de Maquinaria</option>
            <option value="EXCAVADORA">Excavadora</option>
            <option value="RETROEXCAVADORA">Retroexcavadora</option>
            <option value="BULLDOZER">Bulldozer</option>
            <option value="CAMION_TOLVA">Camión Tolva</option>
            <option value="CAMIONETA">Camioneta</option>
            <option value="RODILLO">Rodillo</option>
            <option value="MOTONIVELADORA">Motoniveladora</option>
            <option value="CARGADOR_FRONTAL">Cargador Frontal</option>
          </select>

          <Button onClick={openCreateModal} className="shrink-0">
            <Plus size={16} className="mr-1.5" />
            Nueva Pauta
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Cargando pautas de mantenimiento...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <BookOpen className="mx-auto text-slate-400 mb-3" size={40} />
          <p className="text-slate-600 dark:text-slate-300 font-medium">No hay pautas registradas</p>
          <p className="text-slate-400 text-sm mt-1">Creá una pauta para estandarizar las mantenciones de flota</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Truck size={12} />
                    {plan.assetType}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 mt-2">
                  {plan.name}
                </CardTitle>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {plan.intervalHours && (
                    <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <Clock size={13} />
                      Cada {plan.intervalHours} Horas
                    </span>
                  )}
                  {plan.intervalKm && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Gauge size={13} />
                      Cada {plan.intervalKm.toLocaleString('es-CL')} Km
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                {plan.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {plan.description}
                  </p>
                )}

                <div>
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Tareas del Checklist
                  </h5>
                  {Array.isArray(plan.checklist) && plan.checklist.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {plan.checklist.slice(0, 5).map((task, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="truncate">{task}</span>
                        </li>
                      ))}
                      {plan.checklist.length > 5 && (
                        <li className="text-[11px] text-slate-400 pl-5">
                          + {plan.checklist.length - 5} tareas adicionales...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">Sin tareas configuradas</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>OTs generadas con esta pauta:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {plan._count?.workOrders || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Crear / Editar Pauta */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Editar Pauta de Mantenimiento' : 'Nueva Pauta de Mantenimiento'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre de la Pauta *"
            placeholder="Ej: Pauta Preventiva 250 Horas (Excavadoras)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Maquinaria *
              </label>
              <select
                value={formData.assetType}
                onChange={(e) => setFormData({ ...formData, assetType: e.target.value as AssetType })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="EXCAVADORA">Excavadora</option>
                <option value="RETROEXCAVADORA">Retroexcavadora</option>
                <option value="BULLDOZER">Bulldozer</option>
                <option value="CAMION_TOLVA">Camión Tolva</option>
                <option value="CAMIONETA">Camioneta</option>
                <option value="RODILLO">Rodillo</option>
                <option value="MOTONIVELADORA">Motoniveladora</option>
                <option value="CARGADOR_FRONTAL">Cargador Frontal</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <Input
              label="Intervalo Horas (Horómetro)"
              type="number"
              placeholder="Ej: 250"
              value={formData.intervalHours}
              onChange={(e) => setFormData({ ...formData, intervalHours: Number(e.target.value) })}
            />

            <Input
              label="Intervalo Kilómetros"
              type="number"
              placeholder="Ej: 10000"
              value={formData.intervalKm}
              onChange={(e) => setFormData({ ...formData, intervalKm: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descripción General
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Resumen del alcance del servicio..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Checklist de Tareas e Inspecciones (Una por línea)
            </label>
            <textarea
              rows={6}
              value={formData.checklistText}
              onChange={(e) => setFormData({ ...formData, checklistText: e.target.value })}
              placeholder="Cambio de aceite de motor y filtro&#10;Cambio de filtro de combustible&#10;Engrase de balde y pluma..."
              className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingPlan ? 'Guardar Cambios' : 'Crear Pauta'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
