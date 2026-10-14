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
import { Plus, Search, AlertCircle, CheckCircle, XCircle, History, Trash2, Send } from 'lucide-react';

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

  const handleApprove = async (id: string) => {
    setMutatingRequestId(id);
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'APROBADA' });
      toast.success('Solicitud de compra aprobada exitosamente');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error al aprobar la solicitud de compra.';
      toast.error(msg);
    } finally {
      setMutatingRequestId(null);
    }
  };

  const handleReject = async (id: string) => {
    setMutatingRequestId(id);
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'RECHAZADA' });
      toast.info('Solicitud de compra rechazada');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Error al rechazar la solicitud de compra.';
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
                onClick={() => handleApprove(item.id)}
              >
                <CheckCircle size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Rechazar Borrador"
                disabled={updateStatusMutation.isPending && mutatingRequestId === item.id}
                onClick={() => handleReject(item.id)}
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
                onClick={() => handleApprove(item.id)}
              >
                <CheckCircle size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Rechazar Solicitud"
                disabled={updateStatusMutation.isPending && mutatingRequestId === item.id}
                onClick={() => handleReject(item.id)}
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
