import { useState } from 'react';
import { useFlota, useCreateAsset, useUpdateMeter, useAssignAsset } from '../../api/flota';
import { useFaenas } from '../../api/faenas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Asset, AssetType, AssetOperationalStatus } from '../../types/models';
import { Search, Plus, Gauge, MapPin, AlertCircle } from 'lucide-react';

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'EXCAVADORA', label: 'Excavadora' },
  { value: 'RETROEXCAVADORA', label: 'Retroexcavadora' },
  { value: 'BULLDOZER', label: 'Bulldozer' },
  { value: 'CAMION_TOLVA', label: 'Camión Tolva' },
  { value: 'CAMION_PLUMA', label: 'Camión Pluma' },
  { value: 'CAMIONETA', label: 'Camioneta' },
  { value: 'RODILLO', label: 'Rodillo Compactador' },
  { value: 'MOTONIVELADORA', label: 'Motoniveladora' },
  { value: 'CARGADOR_FRONTAL', label: 'Cargador Frontal' },
  { value: 'OTRO', label: 'Otro' },
];

export function FlotaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form: Create Asset
  const [internalNumber, setInternalNumber] = useState('');
  const [type, setType] = useState<AssetType>('EXCAVADORA');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [licensePlate, setLicensePlate] = useState('');
  const [operationalStatus, setOperationalStatus] = useState<AssetOperationalStatus>('OPERATIVO');
  const [currentHourmeter, setCurrentHourmeter] = useState<number>(0);
  const [currentKilometrage, setCurrentKilometrage] = useState<number>(0);

  // Form: Meter Update
  const [newHourmeter, setNewHourmeter] = useState<number>(0);
  const [newKilometrage, setNewKilometrage] = useState<number>(0);

  // Form: Assign Asset
  const [selectedFaenaId, setSelectedFaenaId] = useState('');

  const { data: assets, isLoading } = useFlota({
    type: typeFilter === 'TODOS' ? undefined : typeFilter,
    operationalStatus: statusFilter === 'TODOS' ? undefined : statusFilter,
    search: searchTerm || undefined,
  });

  const { data: faenas } = useFaenas();

  const createAssetMutation = useCreateAsset();
  const updateMeterMutation = useUpdateMeter();
  const assignAssetMutation = useAssignAsset();

  const handleOpenCreateModal = () => {
    setInternalNumber('');
    setType('EXCAVADORA');
    setBrand('');
    setModel('');
    setYear(new Date().getFullYear());
    setLicensePlate('');
    setOperationalStatus('OPERATIVO');
    setCurrentHourmeter(0);
    setCurrentKilometrage(0);
    setErrorMsg('');
    setIsCreateModalOpen(true);
  };

  const handleOpenMeterModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setNewHourmeter(Number(asset.currentHourmeter) || 0);
    setNewKilometrage(Number(asset.currentKilometrage) || 0);
    setErrorMsg('');
    setIsMeterModalOpen(true);
  };

  const handleOpenAssignModal = (asset: Asset) => {
    setSelectedAsset(asset);
    const activeAssignment = asset.assignments?.find((a) => !a.endDate);
    setSelectedFaenaId(activeAssignment?.faenaId || '');
    setErrorMsg('');
    setIsAssignModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNumber.trim() || !brand.trim() || !model.trim()) {
      setErrorMsg('Número interno, marca y modelo son obligatorios.');
      return;
    }

    try {
      await createAssetMutation.mutateAsync({
        internalNumber: internalNumber.trim().toUpperCase(),
        type,
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year),
        licensePlate: licensePlate.trim().toUpperCase() || undefined,
        operationalStatus,
        currentHourmeter: Number(currentHourmeter) || 0,
        currentKilometrage: Number(currentKilometrage) || 0,
      });
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al registrar el equipo.');
    }
  };

  const handleMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    try {
      await updateMeterMutation.mutateAsync({
        id: selectedAsset.id,
        currentHourmeter: Number(newHourmeter),
        currentKilometrage: Number(newKilometrage),
      });
      setIsMeterModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al actualizar lecturas.');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !selectedFaenaId) {
      setErrorMsg('Debe seleccionar una faena de destino.');
      return;
    }

    try {
      await assignAssetMutation.mutateAsync({
        id: selectedAsset.id,
        faenaId: selectedFaenaId,
        startDate: new Date().toISOString(),
      });
      setIsAssignModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al asignar el equipo.');
    }
  };

  // Metrics
  const totalEquipos = assets?.length || 0;
  const operativos = assets?.filter((a) => a.operationalStatus === 'OPERATIVO').length || 0;
  const enMantencion = assets?.filter((a) => a.operationalStatus === 'EN_MANTENCION').length || 0;
  const detenidos = assets?.filter((a) => a.operationalStatus === 'DETENIDO').length || 0;

  const columns = [
    {
      header: 'N° Interno / Patente',
      cell: (item: Asset) => (
        <div>
          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
            {item.internalNumber}
          </span>
          {item.licensePlate && <p className="text-xs text-slate-500 mt-1 font-mono">{item.licensePlate}</p>}
        </div>
      ),
    },
    {
      header: 'Tipo y Modelo',
      cell: (item: Asset) => (
        <div>
          <p className="font-medium text-slate-800">
            {item.brand} {item.model}
          </p>
          <p className="text-xs text-slate-500">
            {item.type} • {item.year}
          </p>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (item: Asset) => <StatusBadge status={item.operationalStatus} />,
    },
    {
      header: 'Lecturas Actuales',
      cell: (item: Asset) => (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div className="flex items-center">
            <Gauge size={12} className="mr-1 text-slate-400" />
            <span className="font-semibold">{Number(item.currentHourmeter).toLocaleString()}</span> hrs
          </div>
          {Number(item.currentKilometrage) > 0 && (
            <div className="text-slate-500">{Number(item.currentKilometrage).toLocaleString()} km</div>
          )}
        </div>
      ),
    },
    {
      header: 'Faena Asignada',
      cell: (item: Asset) => {
        const active = item.assignments?.find((a) => !a.endDate);
        return (
          <div className="text-sm">
            {active?.faena ? (
              <span className="inline-flex items-center text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs font-medium">
                <MapPin size={12} className="mr-1" />
                {active.faena.name}
              </span>
            ) : (
              <span className="text-slate-400 text-xs italic">En patio central</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Acciones',
      cell: (item: Asset) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            title="Actualizar Horómetro/KM"
            onClick={() => handleOpenMeterModal(item)}
          >
            <Gauge size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Asignar a Faena"
            onClick={() => handleOpenAssignModal(item)}
          >
            <MapPin size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Flota y Maquinaria</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión técnica de equipos, horómetros y asignaciones a faenas
          </p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <Plus size={16} className="mr-2" />
          Nuevo Equipo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Flota</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalEquipos}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-emerald-600 uppercase font-bold">Operativos</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{operativos}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-amber-600 uppercase font-bold">En Mantención</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{enMantencion}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-red-600 uppercase font-bold">Detenidos</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{detenidos}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex-1">
          <Input
            placeholder="Buscar por N° interno, marca, modelo o patente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los Tipos</option>
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="OPERATIVO">Operativo</option>
            <option value="EN_MANTENCION">En Mantención</option>
            <option value="DETENIDO">Detenido</option>
          </select>
        </div>
      </div>

      <DataTable
        data={assets || []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No hay maquinaria o equipos registrados"
      />

      {/* Modal: Crear Equipo */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nuevo Equipo">
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="N° Interno *"
              placeholder="Ej: EXC-01"
              value={internalNumber}
              onChange={(e) => setInternalNumber(e.target.value)}
              required
            />
            <Input
              label="Patente"
              placeholder="Ej: ABCD-12"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Tipo de Maquinaria *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Año *"
              type="number"
              min="1990"
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Marca *"
              placeholder="Ej: Caterpillar"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
            />
            <Input
              label="Modelo *"
              placeholder="Ej: 320D"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horómetro Inicial (hrs)"
              type="number"
              step="0.1"
              value={currentHourmeter}
              onChange={(e) => setCurrentHourmeter(Number(e.target.value))}
            />
            <Input
              label="Kilometraje Inicial (km)"
              type="number"
              step="0.1"
              value={currentKilometrage}
              onChange={(e) => setCurrentKilometrage(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createAssetMutation.isPending}>
              Guardar Equipo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Actualizar Horómetro/KM */}
      <Modal
        isOpen={isMeterModalOpen}
        onClose={() => setIsMeterModalOpen(false)}
        title={`Actualizar Lecturas: ${selectedAsset?.internalNumber || ''}`}
      >
        <form onSubmit={handleMeterSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded text-sm text-slate-700">
            <p>
              <strong>Equipo:</strong> {selectedAsset?.brand} {selectedAsset?.model} (
              {selectedAsset?.internalNumber})
            </p>
          </div>

          <Input
            label="Horómetro Actual (hrs)"
            type="number"
            step="0.1"
            value={newHourmeter}
            onChange={(e) => setNewHourmeter(Number(e.target.value))}
            required
          />

          <Input
            label="Kilometraje Actual (km)"
            type="number"
            step="0.1"
            value={newKilometrage}
            onChange={(e) => setNewKilometrage(Number(e.target.value))}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsMeterModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={updateMeterMutation.isPending}>
              Guardar Lecturas
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Asignar a Faena */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Asignar a Faena: ${selectedAsset?.internalNumber || ''}`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Faena de Destino *</label>
            <select
              value={selectedFaenaId}
              onChange={(e) => setSelectedFaenaId(e.target.value)}
              required
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar Faena --</option>
              {faenas?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Al confirmar, el equipo quedará vinculado a la faena y cerrará cualquier asignación previa.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={assignAssetMutation.isPending}>
              Confirmar Asignación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
