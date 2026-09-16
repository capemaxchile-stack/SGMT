import { useState } from 'react';
import { useFaenas } from '../../api/faenas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Faena } from '../../types/models';
import { Search, Plus, MapPin, Building2, Calendar, FileText, Settings, Eye } from 'lucide-react';

export function FaenasPage() {
  const { data: faenas, isLoading } = useFaenas();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredFaenas = faenas?.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'TODAS' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const columns = [
    {
      header: 'Nombre y Ubicación',
      cell: (item: Faena) => (
        <div>
          <p className="font-medium text-slate-900">{item.name}</p>
          <div className="flex items-center text-xs text-slate-500 mt-1">
            <MapPin size={12} className="mr-1" /> {item.location}
          </div>
        </div>
      )
    },
    {
      header: 'Estado',
      cell: (item: Faena) => <StatusBadge status={item.status} />
    },
    {
      header: 'Métricas',
      cell: (item: Faena) => (
        <div className="flex gap-4">
          <div className="flex items-center text-sm text-slate-600">
            <FileText size={14} className="mr-1 text-slate-400" />
            {item.contractsCount} Contratos
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <Building2 size={14} className="mr-1 text-slate-400" />
            {item.assetsCount} Equipos
          </div>
        </div>
      )
    },
    {
      header: 'Fechas',
      cell: (item: Faena) => (
        <div className="text-sm text-slate-600">
          <div className="flex items-center">
            <Calendar size={12} className="mr-1 text-slate-400" />
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" title="Ver Detalle">
            <Eye size={16} />
          </Button>
          <Button variant="ghost" size="sm" title="Gestionar Contratos">
            <Settings size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Faenas</h1>
          <p className="text-slate-500 text-sm mt-1">Administra los sitios, proyectos y contratos asociados</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Nueva Faena
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex-1">
          <Input 
            placeholder="Buscar faena o ubicación..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['TODAS', 'EN_FORMACION', 'ACTIVA', 'EN_CIERRE', 'CERRADA'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${statusFilter === status 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {status === 'TODAS' ? 'Todas' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <DataTable 
        data={filteredFaenas} 
        columns={columns} 
        isLoading={isLoading}
        emptyMessage="No se encontraron faenas con los filtros actuales"
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nueva Faena"
      >
        <div className="space-y-4 pt-4">
          <Input label="Nombre de la Faena" placeholder="Ej: Mina Los Bronces" />
          <Input label="Ubicación" placeholder="Ej: Región Metropolitana" />
          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Estado Inicial</label>
            <select className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="EN_FORMACION">En Formación</option>
              <option value="ACTIVA">Activa</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Guardar Faena</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
