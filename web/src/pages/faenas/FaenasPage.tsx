import { useState } from 'react';
import { useFaenas, useCreateFaena, useUsers } from '../../api/faenas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Faena, FaenaStatus } from '../../types/models';
import { Search, Plus, MapPin, Building2, Calendar, FileText, UserCheck, AlertCircle } from 'lucide-react';

export function FaenasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<FaenaStatus>('EN_FORMACION');
  const [chiefId, setChiefId] = useState('');
  const [startDate, setStartDate] = useState('');

  const { data: faenas, isLoading } = useFaenas({
    status: statusFilter === 'TODAS' ? undefined : statusFilter,
    search: searchTerm || undefined,
  });

  const { data: users } = useUsers();
  const createFaenaMutation = useCreateFaena();

  const handleOpenModal = () => {
    setName('');
    setLocation('');
    setStatus('EN_FORMACION');
    setChiefId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      setErrorMsg('El nombre y la ubicación son obligatorios.');
      return;
    }

    try {
      await createFaenaMutation.mutateAsync({
        name: name.trim(),
        location: location.trim(),
        status,
        chiefId: chiefId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al crear la faena. Verifique los datos.');
    }
  };

  const columns = [
    {
      header: 'Nombre y Ubicación',
      cell: (item: Faena) => (
        <div>
          <p className="font-semibold text-slate-900">{item.name}</p>
          <div className="flex items-center text-xs text-slate-500 mt-1">
            <MapPin size={12} className="mr-1 text-slate-400" /> {item.location}
          </div>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (item: Faena) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Jefe Responsable',
      cell: (item: Faena) => (
        <div className="text-sm text-slate-700 flex items-center">
          <UserCheck size={14} className="mr-1.5 text-slate-400" />
          {item.chief?.name || <span className="text-slate-400 italic">Sin asignar</span>}
        </div>
      ),
    },
    {
      header: 'Métricas',
      cell: (item: Faena) => (
        <div className="flex gap-4">
          <div className="flex items-center text-sm text-slate-600">
            <FileText size={14} className="mr-1 text-slate-400" />
            {item._count?.contracts ?? 0} Contratos
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <Building2 size={14} className="mr-1 text-slate-400" />
            {item._count?.assets ?? 0} Equipos
          </div>
        </div>
      ),
    },
    {
      header: 'Fecha Inicio',
      cell: (item: Faena) => (
        <div className="text-sm text-slate-600 flex items-center">
          <Calendar size={12} className="mr-1.5 text-slate-400" />
          {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A'}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Faenas</h1>
          <p className="text-slate-500 text-sm mt-1">Administra los proyectos, obras y sus asignaciones</p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus size={16} className="mr-2" />
          Nueva Faena
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['TODAS', 'EN_FORMACION', 'ACTIVA', 'EN_CIERRE', 'CERRADA'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${
                  statusFilter === st
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {st === 'TODAS' ? 'Todas' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        data={faenas || []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No hay faenas registradas en el sistema"
      />

      {/* Modal de Creación */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Faena">
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          <Input
            label="Nombre de la Faena *"
            placeholder="Ej: Mina Los Bronces - Fase 3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Ubicación *"
            placeholder="Ej: Lo Barnechea, Región Metropolitana"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Estado Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FaenaStatus)}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EN_FORMACION">En Formación</option>
                <option value="ACTIVA">Activa</option>
                <option value="EN_CIERRE">En Cierre</option>
                <option value="CERRADA">Cerrada</option>
              </select>
            </div>

            <Input
              label="Fecha de Inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Jefe de Faena Responsable</label>
            <select
              value={chiefId}
              onChange={(e) => setChiefId(e.target.value)}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sin asignar / Seleccionar después --</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createFaenaMutation.isPending}>
              Guardar Faena
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
