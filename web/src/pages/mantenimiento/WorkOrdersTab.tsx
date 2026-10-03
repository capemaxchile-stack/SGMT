import { useState } from 'react';
import {
  useWorkOrders,
  useCreateWorkOrder,
  useConsumeWorkOrderItem,
  useCompleteWorkOrder,
  useWorkOrder,
  useMaintenancePlans,
} from '../../api/maintenance';
import { useFlota } from '../../api/flota';
import { useFaenas } from '../../api/faenas';
import { useItems, useWarehouses } from '../../api/bodega';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AssetIcon } from '../../components/ui/AssetIcon';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Package,
  Eye,
  AlertTriangle,
  Clock,
  User,
  DollarSign,
  Layers,
  AlertCircle,
} from 'lucide-react';
import {
  WorkOrder,
  WorkOrderStatus,
  WorkOrderType,
  WorkOrderPriority,
  Asset,
} from '../../types/models';

export function WorkOrdersTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);

  // Queries
  const { data: workOrders = [], isLoading } = useWorkOrders({
    search: search || undefined,
    status: statusFilter !== 'ALL' ? (statusFilter as WorkOrderStatus) : undefined,
    priority: priorityFilter !== 'ALL' ? (priorityFilter as WorkOrderPriority) : undefined,
    type: typeFilter !== 'ALL' ? (typeFilter as WorkOrderType) : undefined,
  });

  const { data: detailedOrder } = useWorkOrder(selectedWorkOrderId || '');
  const { data: assets = [] } = useFlota();
  const { data: faenas = [] } = useFaenas();
  const { data: plans = [] } = useMaintenancePlans();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();

  // Mutations
  const createMutation = useCreateWorkOrder();
  const consumeMutation = useConsumeWorkOrderItem();
  const completeMutation = useCompleteWorkOrder();

  const [createError, setCreateError] = useState<string | null>(null);
  const [consumeError, setConsumeError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Form states for Create OT
  const [createForm, setCreateForm] = useState({
    assetId: '',
    faenaId: '',
    maintenancePlanId: '',
    type: 'PREVENTIVO' as WorkOrderType,
    priority: 'MEDIA' as WorkOrderPriority,
    description: '',
    failureReport: '',
    technicianName: '',
    currentHourmeter: 0,
    currentKilometrage: 0,
    notes: '',
  });

  // Form states for Consume Item
  const [consumeForm, setConsumeForm] = useState({
    itemId: '',
    warehouseId: '',
    quantity: 1,
  });

  // Form states for Complete OT
  const [completeForm, setCompleteForm] = useState({
    notes: '',
    technicianName: '',
    finalHourmeter: 0,
    finalKilometrage: 0,
  });

  // Metrics
  const totalCount = workOrders.length;
  const openCount = workOrders.filter((o) => o.status === 'ABIERTA').length;
  const inProgressCount = workOrders.filter((o) => o.status === 'EN_PROGRESO').length;
  const criticalCount = workOrders.filter((o) => o.priority === 'CRITICA' && o.status !== 'COMPLETADA').length;
  const totalMaintenanceCost = workOrders.reduce((acc, o) => acc + Number(o.totalCost || 0), 0);

  const handleAssetSelect = (assetId: string) => {
    const selectedAsset = assets.find((a: Asset) => a.id === assetId);
    setCreateForm((prev) => ({
      ...prev,
      assetId,
      currentHourmeter: Number(selectedAsset?.currentHourmeter || 0),
      currentKilometrage: Number(selectedAsset?.currentKilometrage || 0),
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.assetId || !createForm.description) return;

    try {
      await createMutation.mutateAsync({
        assetId: createForm.assetId,
        faenaId: createForm.faenaId.trim() ? createForm.faenaId : undefined,
        maintenancePlanId: createForm.maintenancePlanId.trim() ? createForm.maintenancePlanId : undefined,
        type: createForm.type,
        priority: createForm.priority,
        description: createForm.description.trim(),
        failureReport: createForm.failureReport.trim() || undefined,
        currentHourmeter: createForm.currentHourmeter ? Number(createForm.currentHourmeter) : undefined,
        currentKilometrage: createForm.currentKilometrage ? Number(createForm.currentKilometrage) : undefined,
        technicianName: createForm.technicianName.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
      });

      setIsCreateOpen(false);
      setCreateForm({
        assetId: '',
        faenaId: '',
        maintenancePlanId: '',
        type: 'PREVENTIVO',
        priority: 'MEDIA',
        description: '',
        failureReport: '',
        technicianName: '',
        currentHourmeter: 0,
        currentKilometrage: 0,
        notes: '',
      });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setCreateError(Array.isArray(msg) ? msg.join('. ') : (msg || err.message || 'Error al crear la orden de trabajo'));
    }
  };

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsumeError(null);
    if (!selectedWorkOrderId || !consumeForm.itemId || !consumeForm.warehouseId || consumeForm.quantity <= 0) return;

    try {
      await consumeMutation.mutateAsync({
        workOrderId: selectedWorkOrderId,
        data: {
          itemId: consumeForm.itemId,
          warehouseId: consumeForm.warehouseId,
          quantity: Number(consumeForm.quantity),
        },
      });

      setConsumeForm({ itemId: '', warehouseId: '', quantity: 1 });
      setIsConsumeOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setConsumeError(Array.isArray(msg) ? msg.join('. ') : (msg || err.message || 'Error al consumir repuesto de bodega'));
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleteError(null);
    if (!selectedWorkOrderId) return;

    try {
      await completeMutation.mutateAsync({
        id: selectedWorkOrderId,
        data: {
          notes: completeForm.notes.trim() || undefined,
          technicianName: completeForm.technicianName.trim() || undefined,
          finalHourmeter: completeForm.finalHourmeter ? Number(completeForm.finalHourmeter) : undefined,
          finalKilometrage: completeForm.finalKilometrage ? Number(completeForm.finalKilometrage) : undefined,
        },
      });

      setIsCompleteOpen(false);
      setIsDetailOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setCompleteError(Array.isArray(msg) ? msg.join('. ') : (msg || err.message || 'Error al finalizar la orden de trabajo'));
    }
  };

  const openDetailModal = (order: WorkOrder) => {
    setSelectedWorkOrderId(order.id);
    setIsDetailOpen(true);
  };

  const openCompleteModal = (order: WorkOrder) => {
    setSelectedWorkOrderId(order.id);
    setCompleteForm({
      notes: '',
      technicianName: order.technicianName || '',
      finalHourmeter: Number(order.asset?.currentHourmeter || 0),
      finalKilometrage: Number(order.asset?.currentKilometrage || 0),
    });
    setIsCompleteOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Wrench size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total OTs Registradas</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Abiertas</p>
              <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">{openCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">En Progreso / Taller</p>
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{inProgressCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Críticas Pendientes</p>
              <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400">{criticalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gasto Repuestos</p>
              <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ${totalMaintenanceCost.toLocaleString('es-CL')}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por N° OT, equipo, descripción, mecánico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ABIERTA">Abierta</option>
            <option value="EN_PROGRESO">En Progreso</option>
            <option value="ESPERA_REPUESTOS">Espera Repuestos</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todas las Prioridades</option>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos los Tipos</option>
            <option value="PREVENTIVO">Preventivo</option>
            <option value="CORRECTIVO">Correctivo</option>
            <option value="EMERGENCIA">Emergencia</option>
            <option value="PREDICTIVO">Predictivo</option>
          </select>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="w-full md:w-auto shrink-0">
          <Plus size={18} className="mr-1.5" />
          Nueva Orden de Trabajo
        </Button>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando órdenes de trabajo...</div>
        ) : workOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="mx-auto text-slate-400 mb-3" size={40} />
            <p className="text-slate-600 dark:text-slate-300 font-medium">No se encontraron órdenes de trabajo</p>
            <p className="text-slate-400 text-sm mt-1">Generá una nueva OT para iniciar el seguimiento técnico</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">N° OT</th>
                  <th className="px-4 py-3">Equipo</th>
                  <th className="px-4 py-3">Tipo / Prioridad</th>
                  <th className="px-4 py-3">Faena</th>
                  <th className="px-4 py-3">Técnico / Responsable</th>
                  <th className="px-4 py-3 text-right">Repuestos ($)</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {workOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                      {order.otNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AssetIcon type={order.asset?.type || 'OTRO'} size="sm" />
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {order.asset?.internalNumber} - {order.asset?.brand} {order.asset?.model}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {order.currentHourmeter ? `${Number(order.currentHourmeter)} hrs` : ''}{' '}
                            {order.currentKilometrage ? `| ${Number(order.currentKilometrage)} km` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {order.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            order.priority === 'CRITICA'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              : order.priority === 'ALTA'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          }`}
                        >
                          {order.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {order.faena?.name || 'Central / Taller'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" />
                        <span>{order.technicianName || 'Por Asignar'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      ${Number(order.totalCost || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailModal(order)}
                          title="Ver detalle y cargar repuestos"
                        >
                          <Eye size={16} className="text-slate-600 dark:text-slate-300" />
                        </Button>

                        {order.status !== 'COMPLETADA' && order.status !== 'CANCELADA' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCompleteModal(order)}
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            title="Finalizar Orden de Trabajo"
                          >
                            <CheckCircle2 size={16} className="mr-1" />
                            Finalizar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear Nueva OT */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        title="Nueva Orden de Trabajo (OT)"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Equipo de Flota *
            </label>
            <select
              value={createForm.assetId}
              onChange={(e) => handleAssetSelect(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="">Seleccionar Equipo...</option>
              {assets.map((asset: Asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.internalNumber} - {asset.brand} {asset.model} ({asset.type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Mantención *
              </label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as WorkOrderType })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="PREVENTIVO">Preventivo Programado</option>
                <option value="CORRECTIVO">Correctivo / Reparación</option>
                <option value="EMERGENCIA">Emergencia en Terreno</option>
                <option value="PREDICTIVO">Predictivo / Diagnóstico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prioridad *
              </label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as WorkOrderPriority })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta (Detiene Máquina)</option>
                <option value="CRITICA">Crítica Inmediata</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pauta Preventiva Asociada (Opcional)
            </label>
            <select
              value={createForm.maintenancePlanId}
              onChange={(e) => setCreateForm({ ...createForm, maintenancePlanId: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="">Sin pauta específica (Correctivo general)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.assetType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Faena / Ubicación
            </label>
            <select
              value={createForm.faenaId}
              onChange={(e) => setCreateForm({ ...createForm, faenaId: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="">Taller Central / Predeterminada</option>
              {faenas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Horómetro Actual"
              type="number"
              value={createForm.currentHourmeter}
              onChange={(e) => setCreateForm({ ...createForm, currentHourmeter: Number(e.target.value) })}
            />
            <Input
              label="Kilometraje Actual"
              type="number"
              value={createForm.currentKilometrage}
              onChange={(e) => setCreateForm({ ...createForm, currentKilometrage: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Mecánico o Taller Responsable"
            placeholder="Ej: Juan Pérez / Taller Hidráulico Norte"
            value={createForm.technicianName}
            onChange={(e) => setCreateForm({ ...createForm, technicianName: e.target.value })}
          />

          <Input
            label="Descripción del Trabajo *"
            placeholder="Ej: Servicio 500 horas, cambio de filtro y reparación de manguera"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Síntoma o Reporte de Falla (Opcional)
            </label>
            <textarea
              rows={2}
              value={createForm.failureReport}
              onChange={(e) => setCreateForm({ ...createForm, failureReport: e.target.value })}
              placeholder="Describí la anomalía detectada por el operador..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Crear Orden de Trabajo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detalle y Carga de Repuestos */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Detalle de OT: ${detailedOrder?.otNumber || ''}`}
        size="lg"
      >
        {detailedOrder && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Equipo</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailedOrder.asset?.internalNumber} ({detailedOrder.asset?.brand})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Tipo / Prioridad</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailedOrder.type} / {detailedOrder.priority}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Horómetro</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Number(detailedOrder.currentHourmeter)} hrs
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Estado</span>
                <StatusBadge status={detailedOrder.status} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Descripción</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                {detailedOrder.description}
              </p>
            </div>

            {detailedOrder.failureReport && (
              <div>
                <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">Reporte de Falla</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                  {detailedOrder.failureReport}
                </p>
              </div>
            )}

            {/* Consumed Items Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="text-blue-500" size={18} />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Repuestos e Insumos Consumidos de Bodega
                  </h4>
                </div>
                {detailedOrder.status !== 'COMPLETADA' && detailedOrder.status !== 'CANCELADA' && (
                  <Button size="sm" onClick={() => setIsConsumeOpen(true)}>
                    <Plus size={14} className="mr-1" />
                    Cargar Repuesto
                  </Button>
                )}
              </div>

              {detailedOrder.items && detailedOrder.items.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Ítem / Código</th>
                        <th className="p-2">Bodega Origen</th>
                        <th className="p-2 text-right">Cantidad</th>
                        <th className="p-2 text-right">Costo Unit.</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detailedOrder.items.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                            {it.item?.description} ({it.item?.code})
                          </td>
                          <td className="p-2 text-slate-500">{it.warehouse?.name}</td>
                          <td className="p-2 text-right font-bold text-slate-800 dark:text-slate-200">
                            {Number(it.quantity)} {it.item?.unitOfMeasure}
                          </td>
                          <td className="p-2 text-right text-slate-600 dark:text-slate-400">
                            ${Number(it.unitCost).toLocaleString('es-CL')}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ${Number(it.totalCost).toLocaleString('es-CL')}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold">
                        <td colSpan={4} className="p-2 text-right text-slate-700 dark:text-slate-300">
                          Total Insumos OT:
                        </td>
                        <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">
                          ${Number(detailedOrder.totalCost).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg text-center">
                  Aún no se han rebajado repuestos de bodega para esta OT.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-400">
                Creado por: {detailedOrder.createdBy?.name || 'Sistema'}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Cerrar
                </Button>
                {detailedOrder.status !== 'COMPLETADA' && detailedOrder.status !== 'CANCELADA' && (
                  <Button
                    onClick={() => {
                      setIsDetailOpen(false);
                      openCompleteModal(detailedOrder);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 size={16} className="mr-1.5" />
                    Finalizar OT
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Cargar Repuesto de Bodega */}
      <Modal
        isOpen={isConsumeOpen}
        onClose={() => {
          setIsConsumeOpen(false);
          setConsumeError(null);
        }}
        title="Consumir Repuesto de Bodega"
      >
        <form onSubmit={handleConsumeSubmit} className="space-y-4">
          {consumeError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{consumeError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bodega Origen *
            </label>
            <select
              value={consumeForm.warehouseId}
              onChange={(e) => setConsumeForm({ ...consumeForm, warehouseId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="">Seleccionar Bodega...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Repuesto / Insumo *
            </label>
            <select
              value={consumeForm.itemId}
              onChange={(e) => setConsumeForm({ ...consumeForm, itemId: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="">Seleccionar Ítem...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} - {i.description} ({i.category})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Cantidad a Consumir *"
            type="number"
            min="0.01"
            step="0.01"
            value={consumeForm.quantity}
            onChange={(e) => setConsumeForm({ ...consumeForm, quantity: Number(e.target.value) })}
            required
          />

          <p className="text-xs text-slate-500 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50">
            Al confirmar, se generará un movimiento de <strong>SALIDA automática</strong> en Kardex y se rebajará el stock del almacén seleccionado.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsConsumeOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={consumeMutation.isPending}>
              Registrar Consumo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Finalizar OT */}
      <Modal
        isOpen={isCompleteOpen}
        onClose={() => {
          setIsCompleteOpen(false);
          setCompleteError(null);
        }}
        title="Finalizar Orden de Trabajo"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          {completeError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{completeError}</span>
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Al finalizar la OT, el equipo retornará automáticamente a estado <strong>OPERATIVO</strong> y se guardará la fecha de cierre técnico.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Horómetro Final de Cierre"
              type="number"
              value={completeForm.finalHourmeter}
              onChange={(e) => setCompleteForm({ ...completeForm, finalHourmeter: Number(e.target.value) })}
            />
            <Input
              label="Kilometraje Final"
              type="number"
              value={completeForm.finalKilometrage}
              onChange={(e) => setCompleteForm({ ...completeForm, finalKilometrage: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Mecánico / Responsable de Entrega"
            value={completeForm.technicianName}
            onChange={(e) => setCompleteForm({ ...completeForm, technicianName: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones Finales / Pruebas de Operación
            </label>
            <textarea
              rows={3}
              value={completeForm.notes}
              onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              placeholder="Detallar pruebas hidráulicas, conformidad del operador, etc."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCompleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" isLoading={completeMutation.isPending}>
              Confirmar Cierre y Habilitar Equipo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
