import { useState } from 'react';
import {
  usePurchaseRequests,
  useCreatePurchaseRequest,
  useUpdatePurchaseRequestStatus,
  useRequestTimeline,
} from '../../../api/compras';
import { useFaenas } from '../../../api/faenas';
import { useItems } from '../../../api/bodega';
import { useAssets } from '../../../api/flota';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DataTable } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { ProcurementTimelineModal } from '../../../components/procurement/ProcurementTimelineModal';
import { PurchaseRequest, RequestUrgency } from '../../../types/compras';
import { Plus, Search, AlertCircle, CheckCircle, XCircle, History, Trash2, Send, Package, Truck } from 'lucide-react';

interface RequestLineForm {
  itemId: string;
  quantity: number;
  targetAssetId?: string;
  urgency: RequestUrgency;
  notes?: string;
}

export function PurchaseRequestsTab() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mutatingRequestId, setMutatingRequestId] = useState<string | null>(null);

  // Timeline Modal State
  const [selectedRequestIdForTimeline, setSelectedRequestIdForTimeline] = useState<string | null>(null);
  const { data: timelineData, isLoading: isTimelineLoading } = useRequestTimeline(selectedRequestIdForTimeline);

  // Form State
  const [requestNumber, setRequestNumber] = useState('');
  const [faenaId, setFaenaId] = useState('');
  const [justification, setJustification] = useState('');
  const [lines, setLines] = useState<RequestLineForm[]>([
    { itemId: '', quantity: 1, urgency: 'NORMAL', notes: '' },
  ]);

  const { data: requests, isLoading } = usePurchaseRequests();
  const { data: faenas } = useFaenas();
  const { data: items } = useItems();
  const { data: assets } = useAssets();

  const createRequestMutation = useCreatePurchaseRequest();
  const updateStatusMutation = useUpdatePurchaseRequestStatus();

  const handleOpenModal = () => {
    setRequestNumber('SOL-' + Math.floor(1000 + Math.random() * 9000));
    setFaenaId(faenas?.[0]?.id || '');
    setJustification('');
    setLines([{ itemId: items?.[0]?.id || '', quantity: 1, urgency: 'NORMAL', notes: '' }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleAddLine = () => {
    setLines([...lines, { itemId: items?.[0]?.id || '', quantity: 1, urgency: 'NORMAL', notes: '' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const handleLineChange = (index: number, field: keyof RequestLineForm, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFaenaId = faenaId || (faenas && faenas.length > 0 ? faenas[0].id : '');
    if (!targetFaenaId || !justification.trim()) {
      const msg = 'Debe seleccionar una faena válida e ingresar una justificación.';
      setErrorMsg(msg);
      toast.warning(msg);
      return;
    }

    if (lines.some((l) => !l.itemId || Number(l.quantity) <= 0)) {
      const msg = 'Debe seleccionar los repuestos y cantidades requeridas.';
      setErrorMsg(msg);
      toast.warning(msg);
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        requestNumber,
        faenaId: targetFaenaId,
        justification: justification.trim(),
        status: 'PENDIENTE',
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          targetAssetId: l.targetAssetId || undefined,
          urgency: l.urgency,
          notes: l.notes,
        })),
      });
      setIsModalOpen(false);
      toast.success('Solicitud de pedido creada exitosamente');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error al crear la solicitud de compra.';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT';
    request: PurchaseRequest | null;
    rejectionReason: string;
  }>({
    isOpen: false,
    type: 'APPROVE',
    request: null,
    rejectionReason: '',
  });

  const handleSendToReview = async (id: string) => {
    setMutatingRequestId(id);
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'PENDIENTE' });
      toast.success('Solicitud enviada a revisión exitosamente');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error al enviar la solicitud.';
      toast.error(msg);
    } finally {
      setMutatingRequestId(null);
    }
  };

  const handleOpenConfirm = (type: 'APPROVE' | 'REJECT', request: PurchaseRequest) => {
    setConfirmDialog({
      isOpen: true,
      type,
      request,
      rejectionReason: '',
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.request) return;
    const { id, requestNumber } = confirmDialog.request;
    setMutatingRequestId(id);
    try {
      if (confirmDialog.type === 'APPROVE') {
        await updateStatusMutation.mutateAsync({ id, status: 'APROBADA' });
        toast.success(
          `Solicitud ${requestNumber} APROBADA exitosamente. Paso siguiente: El departamento de Compras (comprador@sgmt.local) debe cotizar con proveedores.`
        );
      } else {
        await updateStatusMutation.mutateAsync({
          id,
          status: 'RECHAZADA',
          rejectionReason: confirmDialog.rejectionReason.trim() || undefined,
        });
        toast.info(`Solicitud ${requestNumber} rechazada`);
      }
      setConfirmDialog({ isOpen: false, type: 'APPROVE', request: null, rejectionReason: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error al procesar la acción.';
      toast.error(msg);
    } finally {
      setMutatingRequestId(null);
    }
  };

  const filteredRequests =
    requests?.filter(
      (r) =>
        r.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.justification.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.faena?.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const columns = [
    {
      header: 'N° Solicitud',
      cell: (item: PurchaseRequest) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {item.requestNumber}
        </span>
      ),
    },
    {
      header: 'Faena Solicitante',
      cell: (item: PurchaseRequest) => <span className="font-medium text-slate-800">{item.faena?.name}</span>,
    },
    {
      header: 'Justificación / Repuestos',
      cell: (item: PurchaseRequest) => (
        <div>
          <span className="text-xs text-slate-700 block font-medium">{item.justification}</span>
          {item.lines && item.lines.length > 0 && (
            <span className="text-[11px] text-slate-400">
              {item.lines.length} repuestos • {item.lines.map((l) => `${l.quantity}x ${l.item?.description || ''}`).join(', ').slice(0, 45)}...
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (item: PurchaseRequest) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Fecha',
      cell: (item: PurchaseRequest) => (
        <span className="text-xs text-slate-500">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-CL') : ''}
        </span>
      ),
    },
    {
      header: 'Acciones',
      cell: (item: PurchaseRequest) => (
        <div className="flex gap-1.5 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900"
            title="Ver Trazabilidad"
            onClick={() => setSelectedRequestIdForTimeline(item.id)}
          >
            <History size={16} />
          </Button>

          {item.status === 'BORRADOR' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                title="Enviar a Revisión (Pendiente)"
                disabled={updateStatusMutation.isPending && mutatingRequestId === item.id}
                onClick={() => handleSendToReview(item.id)}
              >
                <Send size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                title="Aprobar Solicitud Directamente"
                disabled={updateStatusMutation.isPending && mutatingRequestId === item.id}
                onClick={() => handleOpenConfirm('APPROVE', item)}
              >
                <CheckCircle size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Rechazar Borrador"
                disabled={updateStatusMutation.isPending && mutatingRequestId === item.id}
                onClick={() => handleOpenConfirm('REJECT', item)}
              >
                <XCircle size={16} />
              </Button>
            </>
          )}

          {item.status === 'PENDIENTE' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                title="Aprobar Solicitud"
                disabled={updateStatusMutation.isPending && mutatingRequestId === item.id}
                onClick={() => handleOpenConfirm('APPROVE', item)}
              >
                <CheckCircle size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Rechazar Solicitud"
                disabled={updateStatusMutation.isPending && mutatingRequestId === item.id}
                onClick={() => handleOpenConfirm('REJECT', item)}
              >
                <XCircle size={16} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Solicitudes de Pedido desde Faena</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Requerimientos originados en terreno para cotización y compra</p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus size={16} className="mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <Input
          placeholder="Buscar por N° solicitud, faena o justificación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      <DataTable
        data={filteredRequests}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No hay solicitudes de compra registradas"
      />

      {/* Modal: Nueva Solicitud con Repuestos */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Solicitud de Pedido" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="N° Solicitud" value={requestNumber} disabled />

            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Faena de Origen *</label>
              <select
                value={faenaId}
                onChange={(e) => setFaenaId(e.target.value)}
                required
                className="flex w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Seleccione Faena --</option>
                {faenas?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Justificación del Requerimiento *"
            placeholder="Ej: Repuestos para mantención correctiva por fuga en mando final"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            required
          />

          {/* Lines */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Repuestos Requeridos</label>
              <Button variant="ghost" size="sm" type="button" onClick={handleAddLine}>
                <Plus size={14} className="mr-1" /> Agregar Repuesto
              </Button>
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Repuesto *</label>
                    <select
                      value={line.itemId}
                      onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                      required
                      className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2"
                    >
                      <option value="">Seleccione repuesto...</option>
                      {items?.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.code} - {it.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Cantidad *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                      required
                      className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Maquinaria Destino (Opcional)</label>
                    <select
                      value={line.targetAssetId || ''}
                      onChange={(e) => handleLineChange(idx, 'targetAssetId', e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2"
                    >
                      <option value="">Sin máquina específica</option>
                      {assets?.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.internalNumber} ({a.brand} {a.model})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Urgencia</label>
                      <select
                        value={line.urgency}
                        onChange={(e) => handleLineChange(idx, 'urgency', e.target.value as RequestUrgency)}
                        className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2"
                      >
                        <option value="BAJA">Baja</option>
                        <option value="NORMAL">Normal</option>
                        <option value="ALTA">Alta</option>
                        <option value="DETIENE_EQUIPO">Detiene Equipo</option>
                      </select>
                    </div>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-red-500 hover:text-red-700 p-2 mt-4"
                        title="Eliminar fila"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createRequestMutation.isPending}>
              Registrar Solicitud
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        title={confirmDialog.type === 'APPROVE' ? 'Confirmar Aprobación Operacional' : 'Rechazar Solicitud de Pedido'}
        size="xl"
      >
        <div className="space-y-4">
          {confirmDialog.type === 'APPROVE' ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle size={17} className="text-emerald-600 dark:text-emerald-400" />
                  ¿Desea otorgar el visto bueno a la solicitud {confirmDialog.request?.requestNumber}?
                </p>
                <div className="mt-2 text-slate-700 dark:text-slate-300 space-y-1">
                  <p>📍 Faena: <strong className="text-slate-900 dark:text-white">{confirmDialog.request?.faena?.name}</strong></p>
                  <p>👤 Solicitante: <strong className="text-slate-900 dark:text-white">{confirmDialog.request?.requester?.name}</strong></p>
                  <p>📝 Motivo: <em>"{confirmDialog.request?.justification}"</em></p>
                </div>

                {/* Items & Target Machinery Detail */}
                <div className="mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <p className="font-bold text-slate-900 dark:text-white text-xs mb-1.5 flex items-center gap-1.5">
                    <Package size={14} className="text-emerald-700 dark:text-emerald-300" />
                    Detalle de Repuestos Solicitados y Equipo Destino ({confirmDialog.request?.lines?.length || 0}):
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 border border-emerald-200/80 dark:border-emerald-900/60 rounded-lg p-2 bg-white/90 dark:bg-slate-900/90">
                    {confirmDialog.request?.lines && confirmDialog.request.lines.length > 0 ? (
                      confirmDialog.request.lines.map((line, idx) => (
                        <div
                          key={line.id || idx}
                          className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {line.item?.code ? `[${line.item.code}] ` : ''}
                              {line.item?.description || 'Repuesto'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 font-medium">
                                <Truck size={12} className="text-amber-500" />
                                {line.targetAsset?.internalNumber ? (
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                    Equipo: {line.targetAsset.internalNumber} {line.targetAsset.type ? `(${line.targetAsset.type})` : ''}
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400">Stock general de faena</span>
                                )}
                              </span>
                              {line.notes && (
                                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={line.notes}>
                                  • {line.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900 dark:text-white text-xs">
                              {line.quantity} {line.item?.unitOfMeasure || 'UN'}
                            </span>
                            <div className="mt-0.5">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  line.urgency === 'DETIENE_EQUIPO'
                                    ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-black'
                                    : line.urgency === 'ALTA'
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {line.urgency}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-400 py-2 text-center">Sin líneas detalladas</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 p-2 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-emerald-100 dark:border-emerald-900 text-[11px] text-slate-600 dark:text-slate-400">
                  ⚡ <strong>Siguiente paso en el flujo:</strong> Al aprobar, la solicitud pasará al estado <strong>APROBADA</strong> y quedará disponible para que el <strong>Departamento de Compras (comprador@sgmt.local)</strong> comience la licitación y cotización con proveedores.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertCircle size={17} className="text-rose-600 dark:text-rose-400" />
                  ¿Está seguro de rechazar la solicitud {confirmDialog.request?.requestNumber}?
                </p>
                <div className="mt-2 text-slate-700 dark:text-slate-300 space-y-1">
                  <p>📍 Faena: <strong className="text-slate-900 dark:text-white">{confirmDialog.request?.faena?.name}</strong></p>
                  <p>👤 Solicitante: <strong className="text-slate-900 dark:text-white">{confirmDialog.request?.requester?.name}</strong></p>
                  <p>📝 Motivo: <em>"{confirmDialog.request?.justification}"</em></p>
                </div>

                {/* Items & Target Machinery Detail on Reject */}
                {confirmDialog.request?.lines && confirmDialog.request.lines.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-800/60">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-1">
                      Repuestos que serán descartados ({confirmDialog.request.lines.length}):
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 border border-rose-200/80 dark:border-rose-900/60 rounded-lg p-1.5 bg-white/90 dark:bg-slate-900/90 text-[11px]">
                      {confirmDialog.request.lines.map((line, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700 dark:text-slate-300 py-0.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <span className="truncate max-w-[280px]">
                            {line.quantity}x {line.item?.description || 'Repuesto'}
                            {line.targetAsset?.internalNumber ? ` [${line.targetAsset.internalNumber}]` : ''}
                          </span>
                          <span className="font-bold text-slate-500">{line.urgency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo u Observación del Rechazo (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={confirmDialog.rejectionReason}
                  onChange={(e) => setConfirmDialog({ ...confirmDialog, rejectionReason: e.target.value })}
                  placeholder="Ej: Stock disponible en bodega central o especificación técnica errónea"
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.type === 'APPROVE' ? 'primary' : 'danger'}
              onClick={handleConfirmAction}
              disabled={updateStatusMutation.isPending && mutatingRequestId === confirmDialog.request?.id}
            >
              {confirmDialog.type === 'APPROVE' ? 'Sí, Aprobar Solicitud' : 'Confirmar Rechazo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Timeline Modal */}
      {selectedRequestIdForTimeline && (
        <ProcurementTimelineModal
          isOpen={!!selectedRequestIdForTimeline}
          onClose={() => setSelectedRequestIdForTimeline(null)}
          title={`Trazabilidad: ${timelineData?.requestNumber || 'Solicitud de Compra'}`}
          subtitle={`Faena: ${timelineData?.faena || ''} • Solicitante: ${timelineData?.requester || ''}`}
          events={timelineData?.timeline || []}
          isLoading={isTimelineLoading}
        />
      )}
    </div>
  );
}
