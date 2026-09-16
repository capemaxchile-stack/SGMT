import { useState } from 'react';
import { usePurchaseRequests, useCreatePurchaseRequest } from '../../../api/compras';
import { useFaenas } from '../../../api/faenas';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DataTable } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { PurchaseRequest } from '../../../types/compras';
import { Plus, Search, AlertCircle } from 'lucide-react';

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

  const handleOpenModal = () => {
    setRequestNumber('SOL-' + Math.floor(1000 + Math.random() * 9000));
    setFaenaId(faenas?.[0]?.id || '');
    setJustification('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faenaId || !justification.trim()) {
      setErrorMsg('Debe seleccionar una faena e ingresar una justificacion.');
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        requestNumber,
        faenaId,
        justification: justification.trim(),
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al crear la solicitud de compra.');
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
      header: 'Justificacion',
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Solicitudes de Compra desde Faena</h2>
          <p className="text-slate-500 text-sm">Requerimientos originados en terreno para conversion a Orden de Compra</p>
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
              {faenas?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Justificacion del Requerimiento *"
            placeholder="Ej: Insumos de perforacion para cumplimiento de meta mensual"
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
