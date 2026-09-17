import { useState } from 'react';
import { usePurchaseRequests, useCreatePurchaseRequest, useUpdatePurchaseRequestStatus } from '../../../api/compras';
import { useFaenas } from '../../../api/faenas';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DataTable } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { PurchaseRequest } from '../../../types/compras';
import { Plus, Search, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function PurchaseRequestsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [requestNumber, setRequestNumber] = useState('');
  const [faenaId, setFaenaId] = useState('');
  const [justification, setJustification] = useState('');

  const { data: requests, isLoading } = usePurchaseRequests();
  const { data: faenas } = useFaenas();
  const createRequestMutation = useCreatePurchaseRequest();
  const updateStatusMutation = useUpdatePurchaseRequestStatus();

  const handleOpenModal = () => {
    setRequestNumber('SOL-' + Math.floor(1000 + Math.random() * 9000));
    setFaenaId(faenas?.[0]?.id || '');
    setJustification('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFaenaId = faenaId || (faenas && faenas.length > 0 ? faenas[0].id : '');
    if (!targetFaenaId || !justification.trim()) {
      setErrorMsg('Debe seleccionar una faena válida e ingresar una justificación.');
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        requestNumber,
        faenaId: targetFaenaId,
        justification: justification.trim(),
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al crear la solicitud de compra.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'APROBADA' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'RECHAZADA' });
    } catch (err) {
      console.error(err);
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
      header: 'Justificación',
      cell: (item: PurchaseRequest) => <span className="text-xs text-slate-600">{item.justification}</span>,
    },
    {
      header: 'Estado',
      cell: (item: PurchaseRequest) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Fecha',
      cell: (item: PurchaseRequest) => (
        <span className="text-xs text-slate-500">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
        </span>
      ),
    },
    {
      header: 'Acciones',
      cell: (item: PurchaseRequest) => (
        <div className="flex gap-1 items-center">
          {item.status === 'PENDIENTE' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700"
                title="Aprobar Solicitud"
                onClick={() => handleApprove(item.id)}
              >
                <CheckCircle size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                title="Rechazar Solicitud"
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
          <h2 className="text-lg font-bold text-slate-900">Solicitudes de Compra desde Faena</h2>
          <p className="text-slate-500 text-sm">Requerimientos originados en terreno para conversión a Orden de Compra</p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus size={16} className="mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <Input
          placeholder="Buscar por N° solicitud, faena o justificacion..."
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

      {/* Modal: Nueva Solicitud */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Solicitud de Compra">
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          <Input label="N° Solicitud" value={requestNumber} disabled />

          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Faena de Origen *</label>
            <select
              value={faenaId}
              onChange={(e) => setFaenaId(e.target.value)}
              required
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione Faena --</option>
              {faenas?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Justificación del Requerimiento *"
            placeholder="Ej: Insumos de perforación para cumplimiento de meta mensual"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createRequestMutation.isPending}>
              Registrar Solicitud
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
