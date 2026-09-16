import { useState } from 'react';
import { useFlota } from '../../api/flota';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Asset } from '../../types/models';
import { Search, Plus, Wrench, MapPin, Edit2, AlertCircle } from 'lucide-react';

export function FlotaPage() {
  const { data: flota, isLoading } = useFlota();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredFlota = flota?.filter(f => {
    const matchesSearch = f.internalNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'TODOS' || f.type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const types = ['TODOS', ...Array.from(new Set(flota?.map(f => f.type) || []))];

  const columns = [
    {
      header: 'Identificación',
      cell: (item: Asset) => (
        <div>
          <p className="font-medium text-slate-900">{item.internalNumber}</p>
          <div className="flex items-center text-xs text-slate-500 mt-1">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-2">{item.licensePlate}</span>
            {item.type}
          </div>
        </div>
      )
    },
    {
      header: 'Vehículo',
      cell: (item: Asset) => (
        <div className="text-sm text-slate-700">
          {item.brand} {item.model} <span className="text-slate-400 text-xs ml-1">({item.year})</span>
        </div>
      )
    },
    {
      header: 'Estado',
      cell: (item: Asset) => <StatusBadge status={item.status} />
    },
    {
      header: 'Uso Actual',
      cell: (item: Asset) => (
        <div className="text-sm text-slate-600">
          {item.currentHorometer > 0 ? (
            <div>{item.currentHorometer.toLocaleString()} Hrs</div>
          ) : (
            <div>{item.currentKilometers.toLocaleString()} Km</div>
          )}
        </div>
      )
    },
    {
      header: 'Faena Asignada',
      cell: (item: Asset) => (
        <div className="text-sm text-slate-600 flex items-center">
          {item.faenaName ? (
            <>
              <MapPin size={14} className="mr-1 text-slate-400" />
              {item.faenaName}
            </>
          ) : (
            <span className="text-slate-400 italic">Sin asignar</span>
          )}
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" title="Actualizar Horómetro/Km">
            <Wrench size={16} />
          </Button>
          <Button variant="ghost" size="sm" title="Editar">
            <Edit2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Flota y Maquinaria</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de activos, mantenimientos y asignaciones</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Nuevo Equipo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Equipos', value: flota?.length || 0, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Operativos', value: flota?.filter(f => f.status === 'OPERATIVO').length || 0, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'En Mantención', value: flota?.filter(f => f.status === 'EN_MANTENCION').length || 0, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          { label: 'Detenidos', value: flota?.filter(f => f.status === 'DETENIDO').length || 0, color: 'bg-red-50 text-red-700 border-red-200' },
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-lg border ${stat.color} flex flex-col`}>
            <span className="text-sm font-medium opacity-80">{stat.label}</span>
            <span className="text-2xl font-bold mt-1">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex-1">
          <Input 
            placeholder="Buscar por N° interno o patente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="w-full sm:w-48">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable 
        data={filteredFlota} 
        columns={columns} 
        isLoading={isLoading}
        emptyMessage="No se encontraron equipos con los filtros actuales"
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nuevo Equipo"
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="N° Interno" placeholder="Ej: EXC-01" />
            <Input label="Patente" placeholder="Ej: ABC-123" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Tipo de Equipo</label>
              <select className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Excavadora</option>
                <option>Camión</option>
                <option>Bulldozer</option>
                <option>Camioneta</option>
              </select>
            </div>
            <Input label="Año" type="number" placeholder="Ej: 2023" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Marca" placeholder="Ej: Caterpillar" />
            <Input label="Modelo" placeholder="Ej: 320" />
          </div>
          <div className="bg-blue-50 text-blue-800 p-3 rounded-md flex items-start text-sm">
            <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
            <p>El equipo se creará con estado <strong>OPERATIVO</strong> por defecto. Podrá asignarlo a una faena luego de crearlo.</p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsModalOpen(false)}>Guardar Equipo</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
