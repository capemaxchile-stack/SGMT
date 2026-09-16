const fs = require('fs');
const content = \
import { useState } from 'react';
import { useFaenas, useCreateFaena, useUpdateFaena, useDeleteFaena, useUsers } from '../../api/faenas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Faena, FaenaStatus } from '../../types/models';
import { Search, Plus, MapPin, Building2, Calendar, FileText, UserCheck, AlertCircle, Edit, Trash2, ClipboardList } from 'lucide-react';

export function FaenasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  
  const [selectedFaena, setSelectedFaena] = useState<Faena | null>(null);
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
  const updateFaenaMutation = useUpdateFaena();
  const deleteFaenaMutation = useDeleteFaena();

  const handleOpenModal = (faena?: Faena) => {
    if (faena) {
      setSelectedFaena(faena);
      setName(faena.name);
      setLocation(faena.location);
      setStatus(faena.status);
      setChiefId(faena.chiefId || '');
      setStartDate(faena.startDate ? new Date(faena.startDate).toISOString().split('T')[0] : '');
    } else {
      setSelectedFaena(null);
      setName('');
      setLocation('');
      setStatus('EN_FORMACION');
      setChiefId('');
      setStartDate(new Date().toISOString().split('T')[0]);
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenDelete = (faena: Faena) => {
    setSelectedFaena(faena);
    setIsDeleteModalOpen(true);
  };

  const handleOpenContracts = (faena: Faena) => {
    setSelectedFaena(faena);
    setIsContractModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      setErrorMsg('El nombre y la ubicación son obligatorios.');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        location: location.trim(),
        status,
        chiefId: chiefId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
      };

      if (selectedFaena) {
        await updateFaenaMutation.mutateAsync({ id: selectedFaena.id, payload });
      } else {
        await createFaenaMutation.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Error al guardar la faena. Verifique los datos.');
    }
  };

  const handleDelete = async () => {
    if (!selectedFaena) return;
    try {
      await deleteFaenaMutation.mutateAsync(selectedFaena.id);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al eliminar la faena.');
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
      header: 'Acciones',
      cell: (item: Faena) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenContracts(item)} title="Gestionar Contratos">
            <ClipboardList size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)} title="Editar Faena">
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleOpenDelete(item)} title="Eliminar Faena">
            <Trash2 size={16} />
          </Button>
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
        <Button onClick={() => handleOpenModal()}>
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
              className={\px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                \\}
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

      {/* Modal Formulario */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedFaena ? "Editar Faena" : "Nueva Faena"}>
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
            <Button type="submit" isLoading={createFaenaMutation.isPending || updateFaenaMutation.isPending}>
              {selectedFaena ? "Guardar Cambios" : "Guardar Faena"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Faena">
        <div className="p-4">
          <p>¿Estás seguro que deseas eliminar la faena <strong>{selectedFaena?.name}</strong>?</p>
          <p className="text-sm text-slate-500 mt-2">Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} isLoading={deleteFaenaMutation.isPending}>Eliminar</Button>
          </div>
        </div>
      </Modal>

      {/* Gestionar Contratos Modal (Basic placeholder) */}
      <Modal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} title="Gestionar Contratos">
        <div className="p-4">
          <p className="text-sm text-slate-600 mb-4">Contratos para faena: <strong>{selectedFaena?.name}</strong></p>
          <div className="border border-slate-200 rounded-md p-4 text-center text-slate-500">
            Módulo de contratos en construcción.
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsContractModalOpen(false)}>Cerrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
\;
fs.writeFileSync('src/pages/faenas/FaenasPage.tsx', content);
