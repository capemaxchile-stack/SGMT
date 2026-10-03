import { useState } from 'react';
import {
  useFuelLogs,
  useFuelStats,
  useCreateFuelLog,
} from '../../api/fuel';
import { useFlota } from '../../api/flota';
import { useFaenas } from '../../api/faenas';
import { useWarehouses } from '../../api/bodega';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { HelpTip } from '../../components/ui/HelpTip';
import { AssetIcon } from '../../components/ui/AssetIcon';
import {
  Fuel,
  Plus,
  Search,
  Droplet,
  DollarSign,
  TrendingUp,
  Truck,
  Activity,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Asset, Faena, Warehouse } from '../../types/models';

export function CombustiblePage() {
  const [activeTab, setActiveTab] = useState<'dispatches' | 'performance' | 'faenas'>('dispatches');
  const [search, setSearch] = useState('');
  const [selectedFaena, setSelectedFaena] = useState<string>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Queries
  const { data: fuelLogs = [], isLoading: isLoadingLogs } = useFuelLogs({
    search: search || undefined,
    faenaId: selectedFaena !== 'ALL' ? selectedFaena : undefined,
    assetId: selectedAsset !== 'ALL' ? selectedAsset : undefined,
  });

  const { data: stats } = useFuelStats();
  const { data: assets = [] } = useFlota();
  const { data: faenas = [] } = useFaenas();
  const { data: warehouses = [] } = useWarehouses();

  // Mutation
  const createMutation = useCreateFuelLog();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    assetId: '',
    faenaId: '',
    warehouseId: '',
    liters: 100,
    unitPrice: 1050,
    currentHourmeter: 0,
    currentKilometrage: 0,
    operatorName: '',
    fuelTruckPlate: '',
    dispatchTicketNumber: '',
    notes: '',
  });

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find((a: Asset) => a.id === assetId);
    setForm((prev) => ({
      ...prev,
      assetId,
      currentHourmeter: Number(asset?.currentHourmeter || 0),
      currentKilometrage: Number(asset?.currentKilometrage || 0),
    }));
  };

  const selectedAssetObj = assets.find((a: Asset) => a.id === form.assetId);
  const prevHours = Number(selectedAssetObj?.currentHourmeter || 0);
  const deltaHours = form.currentHourmeter > prevHours ? form.currentHourmeter - prevHours : 0;
  const instantLitersPerHour = deltaHours > 0 ? (form.liters / deltaHours).toFixed(2) : '0.00';

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!form.assetId || form.liters <= 0) return;

    try {
      await createMutation.mutateAsync({
        assetId: form.assetId,
        faenaId: form.faenaId.trim() ? form.faenaId : undefined,
        warehouseId: form.warehouseId.trim() ? form.warehouseId : undefined,
        liters: Number(form.liters),
        unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
        currentHourmeter: form.currentHourmeter ? Number(form.currentHourmeter) : undefined,
        currentKilometrage: form.currentKilometrage ? Number(form.currentKilometrage) : undefined,
        operatorName: form.operatorName.trim() || undefined,
        fuelTruckPlate: form.fuelTruckPlate.trim() || undefined,
        dispatchTicketNumber: form.dispatchTicketNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      setIsCreateOpen(false);
      setForm({
        assetId: '',
        faenaId: '',
        warehouseId: '',
        liters: 100,
        unitPrice: 1050,
        currentHourmeter: 0,
        currentKilometrage: 0,
        operatorName: '',
        fuelTruckPlate: '',
        dispatchTicketNumber: '',
        notes: '',
      });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        setErrorMessage(msg.join('. '));
      } else if (typeof msg === 'string') {
        setErrorMessage(msg);
      } else {
        setErrorMessage(err.message || 'Error al registrar el despacho de combustible');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Fuel className="text-amber-500" size={26} />
            Control y Rendimiento de Combustible
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro de cargas de diésel, camiones aljibe, cálculo automático de L/hora y detección de anomalías
          </p>
        </div>
      </div>

      {/* Help Tip */}
      <HelpTip
        title="Guía Operativa de Combustible (Diésel)"
        description="El registro de combustible calcula automáticamente los litros consumidos por hora (L/h) para maquinaria pesada y km/L para vehículos livianos, comparando la lectura de horómetro actual con la anterior."
        tips={[
          'Ingresá la lectura exacta del horómetro de la máquina en cada carga para tener un cálculo de rendimiento confiable.',
          'Si seleccionás una Bodega/Estanque de origen, el stock de diésel se rebajará automáticamente en Kardex.',
          'Revisá la pestaña de Rendimiento para detectar posibles fugas mecánicas o desvíos en el consumo esperado.'
        ]}
      />

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Droplet size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Litros Despachados</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {Number(stats?.totalLiters || 0).toLocaleString('es-CL')} L
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gasto Total en Combustible</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${Number(stats?.totalSpend || 0).toLocaleString('es-CL')}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">N° Despachos Registrados</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {stats?.totalDispatches || 0}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Truck size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Equipos con Cargas</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {new Set(fuelLogs.map((l) => l.assetId)).size}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dispatches')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dispatches'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Fuel size={18} />
          Despachos y Cargas
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'performance'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp size={18} />
          Rendimiento y Desvíos (L/h)
        </button>

        <button
          onClick={() => setActiveTab('faenas')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'faenas'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers size={18} />
          Consumo por Faena
        </button>
      </div>

      {/* Tab 1: Despachos y Cargas */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar N° despacho, equipo, operador, aljibe..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200"
                />
              </div>

              <select
                value={selectedFaena}
                onChange={(e) => setSelectedFaena(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="ALL">Todas las Faenas</option>
                {faenas.map((f: Faena) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="ALL">Todos los Equipos</option>
                {assets.map((a: Asset) => (
                  <option key={a.id} value={a.id}>
                    {a.internalNumber} ({a.brand} {a.model})
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={() => setIsCreateOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white w-full md:w-auto shrink-0">
              <Plus size={18} className="mr-1.5" />
              Nueva Carga de Combustible
            </Button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {isLoadingLogs ? (
              <div className="p-8 text-center text-slate-500">Cargando registros de combustible...</div>
            ) : fuelLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Fuel className="mx-auto text-slate-400 mb-3" size={40} />
                <p className="text-slate-600 dark:text-slate-300 font-medium">No hay registros de combustible</p>
                <p className="text-slate-400 text-sm mt-1">Registrá la primera carga de diésel para comenzar el seguimiento</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">N° Despacho</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Equipo</th>
                      <th className="px-4 py-3">Faena</th>
                      <th className="px-4 py-3 text-right">Litros</th>
                      <th className="px-4 py-3 text-right">Horómetro / Km</th>
                      <th className="px-4 py-3 text-center">Rendimiento (L/h)</th>
                      <th className="px-4 py-3 text-right">Costo Total</th>
                      <th className="px-4 py-3">Operador / Aljibe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {fuelLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400">
                          {log.dispatchNumber}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(log.dispatchDate).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <AssetIcon type={log.asset?.type || 'OTRO'} size="sm" />
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {log.asset?.internalNumber}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {log.asset?.brand} {log.asset?.model}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {log.faena?.name || 'Central / Aljibe'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {Number(log.liters).toLocaleString('es-CL')} L
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {Number(log.currentHourmeter)} hrs
                          </div>
                          {Number(log.hourmeterDelta) > 0 && (
                            <div className="text-slate-400">+{Number(log.hourmeterDelta)} hrs trabajadas</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {Number(log.litersPerHour) > 0 ? (
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                              {Number(log.litersPerHour)} L/h
                            </span>
                          ) : Number(log.kmPerLiter) > 0 ? (
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                              {Number(log.kmPerLiter)} km/L
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Primer registro</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                          ${Number(log.totalCost).toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          <div>{log.operatorName || 'Sin operador'}</div>
                          {log.fuelTruckPlate && (
                            <div className="text-slate-400">Aljibe: {log.fuelTruckPlate}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Rendimiento y Desvíos */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats &&
              Object.entries(stats.byAssetType || {}).map(([type, data]) => (
                <Card key={type} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                      <span>{type}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-normal">
                        {data.count} cargas
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Rendimiento Promedio:</span>
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                        {data.avgLitersPerHour > 0 ? `${data.avgLitersPerHour} L/h` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Total Litros Consumidos:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {data.totalLiters.toLocaleString('es-CL')} L
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Horas Trabajadas:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {data.totalHoursDelta} hrs
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Tab 3: Consumo por Faena */}
      {activeTab === 'faenas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.byFaena &&
            stats.byFaena.map((faenaItem, idx) => (
              <Card key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Layers size={18} className="text-blue-500" />
                    {faenaItem.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Litros Consumidos:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400">
                      {faenaItem.totalLiters.toLocaleString('es-CL')} L
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Costo Total Diésel:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${faenaItem.totalSpend.toLocaleString('es-CL')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Modal: Nueva Carga */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setErrorMessage(null);
        }}
        title="Registrar Carga de Combustible (Diésel)"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Equipo Receptor *
            </label>
            <select
              value={form.assetId}
              onChange={(e) => handleAssetChange(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="">Seleccionar Equipo...</option>
              {assets.map((a: Asset) => (
                <option key={a.id} value={a.id}>
                  {a.internalNumber} - {a.brand} {a.model} ({a.type}) [Horómetro: {Number(a.currentHourmeter)} hrs]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Faena / Proyecto
              </label>
              <select
                value={form.faenaId}
                onChange={(e) => setForm({ ...form, faenaId: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="">Central / Terreno</option>
                {faenas.map((f: Faena) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estanque / Bodega Origen (Opcional)
              </label>
              <select
                value={form.warehouseId}
                onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="">Camión Aljibe Externo / Proveedor Directo</option>
                {warehouses.map((w: Warehouse) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type}) - Descontar Stock
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Litros Cargados *"
              type="number"
              min="1"
              step="0.1"
              value={form.liters}
              onChange={(e) => setForm({ ...form, liters: Number(e.target.value) })}
              required
            />
            <Input
              label="Precio por Litro ($ CLP)"
              type="number"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={`Horómetro Actual Máquina (Anterior: ${prevHours} hrs)`}
              type="number"
              step="0.1"
              value={form.currentHourmeter}
              onChange={(e) => setForm({ ...form, currentHourmeter: Number(e.target.value) })}
            />
            <Input
              label="Kilometraje Actual"
              type="number"
              value={form.currentKilometrage}
              onChange={(e) => setForm({ ...form, currentKilometrage: Number(e.target.value) })}
            />
          </div>

          {/* Live Performance Preview */}
          {deltaHours > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs">
              <span className="text-amber-800 dark:text-amber-300">
                Horas trabajadas desde última carga: <strong>{deltaHours.toFixed(1)} hrs</strong>
              </span>
              <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400">
                Rendimiento: {instantLitersPerHour} L/h
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Nombre Operador"
              placeholder="Ej: Manuel González"
              value={form.operatorName}
              onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
            />
            <Input
              label="Patente Aljibe / Surtidor"
              placeholder="Ej: ABCD-12"
              value={form.fuelTruckPlate}
              onChange={(e) => setForm({ ...form, fuelTruckPlate: e.target.value })}
            />
            <Input
              label="N° Vale / Ticket"
              placeholder="Ej: VALE-9042"
              value={form.dispatchTicketNumber}
              onChange={(e) => setForm({ ...form, dispatchTicketNumber: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" isLoading={createMutation.isPending}>
              Registrar Despacho
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
