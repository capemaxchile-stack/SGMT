import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Truck,
  Package,
  Send,
  CloudOff,
  ArrowLeft,
  Fuel,
  Gauge,
  Droplet,
} from 'lucide-react';
import { useFaenas } from '../../api/faenas';
import { useItems, useWarehouses } from '../../api/bodega';
import { useAssets } from '../../api/flota';
import { useCreatePurchaseRequest } from '../../api/compras';
import { useCreateFuelLog } from '../../api/fuel';
import {
  getOfflineQueue,
  queueOfflineRequest,
  cacheOfflineData,
  getCachedOfflineData,
  syncOfflineRequests,
  OfflineRequestItem,
  getOfflineFuelQueue,
  queueOfflineFuel,
  syncOfflineFuel,
  OfflineFuelItem,
} from '../../lib/offlineQueue';
import { RequestUrgency } from '../../types/compras';

export function TerrainRequestMobileView() {
  const navigate = useNavigate();
  const [mobileMode, setMobileMode] = useState<'repuestos' | 'combustible'>('combustible');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineRequestItem[]>(getOfflineQueue());
  const [offlineFuelQueue, setOfflineFuelQueue] = useState<OfflineFuelItem[]>(getOfflineFuelQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Queries
  const { data: serverFaenas = [] } = useFaenas();
  const { data: serverItems = [] } = useItems();
  const { data: serverAssets = [] } = useAssets();
  const { data: serverWarehouses = [] } = useWarehouses();

  // Mutations
  const createRequestMutation = useCreatePurchaseRequest();
  const createFuelMutation = useCreateFuelLog();

  // Master data caching
  useEffect(() => {
    if (serverFaenas.length > 0 || serverItems.length > 0 || serverAssets.length > 0) {
      cacheOfflineData({
        faenas: serverFaenas,
        items: serverItems,
        assets: serverAssets,
      });
    }
  }, [serverFaenas, serverItems, serverAssets]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdated = () => {
      setOfflineQueue(getOfflineQueue());
      setOfflineFuelQueue(getOfflineFuelQueue());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sgmt-queue-updated', handleQueueUpdated);
    window.addEventListener('sgmt-fuel-queue-updated', handleQueueUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sgmt-queue-updated', handleQueueUpdated);
      window.removeEventListener('sgmt-fuel-queue-updated', handleQueueUpdated);
    };
  }, []);

  // Offline fallback master data
  const cached = getCachedOfflineData();
  const faenas = serverFaenas.length > 0 ? serverFaenas : cached.faenas;
  const items = serverItems.length > 0 ? serverItems : cached.items;
  const assets = serverAssets.length > 0 ? serverAssets : cached.assets;
  const warehouses = serverWarehouses;

  // =================== REPUESTOS FORM STATE ===================
  const [faenaId, setFaenaId] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [urgency, setUrgency] = useState<RequestUrgency>('NORMAL');
  const [targetAssetId, setTargetAssetId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: string; quantity: number; notes: string }>>([
    { itemId: '', quantity: 1, notes: '' },
  ]);

  // =================== COMBUSTIBLE FORM STATE ===================
  const [fuelAssetId, setFuelAssetId] = useState<string>('');
  const [fuelFaenaId, setFuelFaenaId] = useState<string>('');
  const [fuelWarehouseId, setFuelWarehouseId] = useState<string>('');
  const [fuelLiters, setFuelLiters] = useState<number>(100);
  const [fuelHourmeter, setFuelHourmeter] = useState<number>(0);
  const [fuelKilometrage, setFuelKilometrage] = useState<number>(0);
  const [fuelOperatorName, setFuelOperatorName] = useState<string>('');
  const [fuelTruckPlate, setFuelTruckPlate] = useState<string>('');
  const [fuelTicketNumber, setFuelTicketNumber] = useState<string>('');
  const [fuelNotes, setFuelNotes] = useState<string>('');

  const selectedFuelAsset = assets.find((a: any) => a.id === fuelAssetId);
  const prevHours = Number(selectedFuelAsset?.currentHourmeter || 0);
  const deltaHours = fuelHourmeter > prevHours ? fuelHourmeter - prevHours : 0;
  const isHourmeterAnomaly = fuelHourmeter > 0 && prevHours > 0 && fuelHourmeter < prevHours;
  const calculatedLph = deltaHours > 0 && fuelLiters > 0 ? (fuelLiters / deltaHours).toFixed(2) : null;

  const handleFuelAssetChange = (assetId: string) => {
    setFuelAssetId(assetId);
    const asset = assets.find((a: any) => a.id === assetId);
    if (asset) {
      setFuelHourmeter(Number(asset.currentHourmeter || 0));
      setFuelKilometrage(Number(asset.currentKilometrage || 0));
      if (asset.faenaId) {
        setFuelFaenaId(asset.faenaId);
      }
    }
  };

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('Sincronizando registros pendientes con el ERP...');
    try {
      const reqResult = await syncOfflineRequests();
      const fuelResult = await syncOfflineFuel();
      setOfflineQueue(getOfflineQueue());
      setOfflineFuelQueue(getOfflineFuelQueue());
      const totalSuccess = reqResult.success + fuelResult.success;
      const totalFailed = reqResult.failed + fuelResult.failed;
      setSyncFeedback(`Sincronización finalizada: ${totalSuccess} enviado(s), ${totalFailed} pendiente(s).`);
      setTimeout(() => setSyncFeedback(''), 4000);
    } catch {
      setSyncFeedback('Error durante la sincronización');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalOfflinePending = offlineQueue.length + offlineFuelQueue.length;

  // Repuestos form handlers
  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { itemId: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...selectedItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setSelectedItems(updated);
  };

  const resetForm = () => {
    setJustification('');
    setTargetAssetId('');
    setUrgency('NORMAL');
    setSelectedItems([{ itemId: '', quantity: 1, notes: '' }]);
  };

  const resetFuelForm = () => {
    setFuelAssetId('');
    setFuelLiters(100);
    setFuelHourmeter(0);
    setFuelKilometrage(0);
    setFuelOperatorName('');
    setFuelTruckPlate('');
    setFuelTicketNumber('');
    setFuelNotes('');
  };

  const handleSubmitRepuestos = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveFaenaId = faenaId || faenas[0]?.id;
    if (!effectiveFaenaId || !justification.trim()) {
      alert('Debe ingresar la faena y la justificación del pedido');
      return;
    }

    const validLines = selectedItems.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) {
      alert('Debe agregar al menos un repuesto con cantidad válida');
      return;
    }

    const payload = {
      requestNumber: `SOL-T-${Date.now().toString().slice(-6)}`,
      faenaId: effectiveFaenaId,
      justification: justification.trim(),
      lines: validLines.map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        targetAssetId: targetAssetId || undefined,
        urgency,
        notes: l.notes || undefined,
      })),
    };

    const targetFaena = faenas.find((f: any) => f.id === effectiveFaenaId);
    const summary = `${validLines.length} repuesto(s) - ${urgency}`;

    if (!isOnline) {
      queueOfflineRequest(payload, {
        faenaName: targetFaena?.name || 'Faena en Terreno',
        itemsSummary: summary,
      });
      setSuccessMessage('¡Pedido guardado localmente en modo OFFLINE! Se enviará automáticamente al reconectar.');
      resetForm();
    } else {
      try {
        await createRequestMutation.mutateAsync(payload);
        setSuccessMessage('¡Pedido de repuestos enviado exitosamente al centro de compras!');
        resetForm();
      } catch (err: any) {
        queueOfflineRequest(payload, {
          faenaName: targetFaena?.name || 'Faena en Terreno',
          itemsSummary: summary,
        });
        setSuccessMessage('Conexión inestable: Pedido respaldado en cola offline de terreno.');
        resetForm();
      }
    }

    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const handleSubmitFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelAssetId || fuelLiters <= 0) {
      alert('Debe seleccionar la maquinaria en terreno e ingresar los litros despachados.');
      return;
    }

    const payload = {
      assetId: fuelAssetId,
      faenaId: fuelFaenaId.trim() ? fuelFaenaId : (selectedFuelAsset?.faenaId || faenas[0]?.id),
      warehouseId: fuelWarehouseId.trim() ? fuelWarehouseId : undefined,
      liters: Number(fuelLiters),
      currentHourmeter: fuelHourmeter ? Number(fuelHourmeter) : undefined,
      currentKilometrage: fuelKilometrage ? Number(fuelKilometrage) : undefined,
      operatorName: fuelOperatorName.trim() || undefined,
      fuelTruckPlate: fuelTruckPlate.trim() || undefined,
      dispatchTicketNumber: fuelTicketNumber.trim() || undefined,
      notes: fuelNotes.trim() || undefined,
    };

    if (!isOnline) {
      queueOfflineFuel(payload, {
        assetInternalNumber: selectedFuelAsset?.internalNumber || 'Equipo',
        liters: fuelLiters,
      });
      setSuccessMessage('¡Despacho de combustible guardado en cola OFFLINE! Se enviará automáticamente al reconectar.');
      resetFuelForm();
    } else {
      try {
        await createFuelMutation.mutateAsync(payload);
        setSuccessMessage(`¡Despacho de ${fuelLiters} L registrado exitosamente para ${selectedFuelAsset?.internalNumber}!`);
        resetFuelForm();
      } catch (err: any) {
        queueOfflineFuel(payload, {
          assetInternalNumber: selectedFuelAsset?.internalNumber || 'Equipo',
          liters: fuelLiters,
        });
        setSuccessMessage('Conexión inestable: Despacho respaldado en cola local offline.');
        resetFuelForm();
      }
    }

    setTimeout(() => setSuccessMessage(''), 6000);
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4 pb-20">
      {/* Mobile Header & Connectivity Bar */}
      <div
        className={`p-4 rounded-xl flex items-center justify-between shadow-xs transition-colors ${
          isOnline
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 dark:bg-emerald-950/40'
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-300 dark:bg-amber-950/40'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOnline ? (
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-300">
              <Wifi size={18} />
            </div>
          ) : (
            <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300 animate-pulse">
              <WifiOff size={18} />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold flex items-center gap-1.5">
              <Smartphone size={16} />
              SGMT Terreno
            </h1>
            <p className="text-[11px] opacity-80">
              {isOnline ? '🟢 En línea - Red minera conectada' : '🟠 Modo Offline - Sin señal celular / WiFi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalOfflinePending > 0 && (
            <button
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isOnline
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sincronizando' : `Sincronizar (${totalOfflinePending})`}
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-medium transition shadow-xs"
            title="Volver al Portal ERP"
          >
            <ArrowLeft size={13} />
            <span>ERP</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-200/80 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-300/60 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setMobileMode('combustible')}
          className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileMode === 'combustible'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Fuel size={16} />
          <span>Carga Combustible</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMode('repuestos')}
          className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileMode === 'repuestos'
              ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200 dark:border-slate-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Package size={16} />
          <span>Pedidos Repuestos</span>
        </button>
      </div>

      {/* Sync Banner */}
      {syncFeedback && (
        <div className="p-3 bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 rounded-lg text-xs text-primary-900 dark:text-primary-300 font-medium animate-in fade-in">
          {syncFeedback}
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-900 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Offline Pending Items Drawer / Warning */}
      {totalOfflinePending > 0 && (
        <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <CloudOff size={14} className="text-amber-600 dark:text-amber-400" />
              Registros en cola local de terreno:
            </span>
            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[11px]">
              {totalOfflinePending} pendiente(s)
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-400">
            {offlineFuelQueue.map((item) => (
              <div key={item.id} className="p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Fuel size={13} className="text-amber-500" />
                  <span className="font-semibold">{item.assetInternalNumber || 'Equipo'}:</span>
                  <span>{item.liters} L</span>
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">Combustible OFFLINE</span>
              </div>
            ))}
            {offlineQueue.map((item) => (
              <div key={item.id} className="p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Package size={13} className="text-primary-500" />
                  <span className="font-semibold">{item.faenaName || 'Faena'}:</span>
                  <span className="text-slate-400">{item.itemsSummary}</span>
                </div>
                <span className="text-[10px] text-primary-600 dark:text-primary-400 font-mono">Repuestos OFFLINE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 1: CARGA DE COMBUSTIBLE EN TERRENO                       */}
      {/* ============================================================ */}
      {mobileMode === 'combustible' && (
        <form onSubmit={handleSubmitFuel} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Fuel className="text-amber-500" size={18} />
              Registro Rápido de Combustible
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control de horómetro y despacho para camiones aljibe y terreno
            </p>
          </div>

          {/* Maquinaria Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Truck size={14} className="text-slate-500" />
              Maquinaria o Vehículo Receptor *
            </label>
            <select
              required
              value={fuelAssetId}
              onChange={(e) => handleFuelAssetChange(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Seleccione equipo de la flota...</option>
              {assets.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.internalNumber} — {a.brand} {a.model} ({a.type})
                </option>
              ))}
            </select>
          </div>

          {/* Liters Entry with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Droplet size={14} className="text-amber-500" />
                Litros Despachados (Diésel) *
              </label>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {fuelLiters} L
              </span>
            </div>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={fuelLiters}
              onChange={(e) => setFuelLiters(Number(e.target.value))}
              className="w-full text-lg font-black text-center border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            />

            {/* Quick Presets Buttons */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {[50, 100, 200, 300, 500].map((lit) => (
                <button
                  key={lit}
                  type="button"
                  onClick={() => setFuelLiters(lit)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    fuelLiters === lit
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  +{lit}L
                </button>
              ))}
            </div>
          </div>

          {/* Hourmeter & Kilometrage Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Gauge size={13} className="text-slate-500" />
                Horómetro Actual
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={fuelHourmeter || ''}
                onChange={(e) => setFuelHourmeter(Number(e.target.value))}
                placeholder={prevHours > 0 ? `Ant: ${prevHours}` : '0'}
                className="w-full text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
              />
              {prevHours > 0 && (
                <span className="text-[10px] text-slate-400 block mt-0.5">Lectura previa: {prevHours} hrs</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Gauge size={13} className="text-slate-500" />
                Kilometraje
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={fuelKilometrage || ''}
                onChange={(e) => setFuelKilometrage(Number(e.target.value))}
                placeholder="Km actual"
                className="w-full text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Anomaly / Consumption Callouts */}
          {isHourmeterAnomaly && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Advertencia de Horómetro Menor</strong>
                La lectura ingresada ({fuelHourmeter}) es inferior al último valor registrado ({prevHours}). Verifique que no sea un error de digitación.
              </div>
            </div>
          )}

          {calculatedLph && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between animate-in fade-in">
              <span className="font-semibold">Horas trabajadas: +{deltaHours.toFixed(1)} hrs</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-700">
                {calculatedLph} L/h
              </span>
            </div>
          )}

          {/* Cisterna / Aljibe and Faena */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Patente Camión Aljibe
              </label>
              <input
                type="text"
                placeholder="Ej. LJ-9981"
                value={fuelTruckPlate}
                onChange={(e) => setFuelTruckPlate(e.target.value.toUpperCase())}
                className="w-full text-xs uppercase font-mono border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                N° Vale / Ticket
              </label>
              <input
                type="text"
                placeholder="Ej. V-4081"
                value={fuelTicketNumber}
                onChange={(e) => setFuelTicketNumber(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Operador and Bodega/Estanque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Operador Receptor
              </label>
              <input
                type="text"
                placeholder="Nombre conductor"
                value={fuelOperatorName}
                onChange={(e) => setFuelOperatorName(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Estanque Origen (Opcional)
              </label>
              <select
                value={fuelWarehouseId}
                onChange={(e) => setFuelWarehouseId(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">Despacho Móvil / General</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Big Fuel Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={createFuelMutation.isPending}
              className="w-full p-4 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Fuel size={17} />
              {isOnline ? 'Registrar Despacho de Combustible' : 'Guardar Despacho en Cola Offline'}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* MODE 2: PEDIDOS DE REPUESTOS EN TERRENO                       */}
      {/* ============================================================ */}
      {mobileMode === 'repuestos' && (
        <form onSubmit={handleSubmitRepuestos} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="text-primary-600" size={18} />
              Solicitud de Repuestos en Terreno
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Requerimiento técnico originado en faena para cotización y compra
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Faena de Origen *</label>
            <select
              value={faenaId}
              onChange={(e) => setFaenaId(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
            >
              {faenas.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>

          {/* Urgency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Urgencia Operacional *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUrgency('NORMAL')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  urgency === 'NORMAL'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 ring-2 ring-blue-100 dark:ring-blue-900/40'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Normal (Abastecimiento)
              </button>
              <button
                type="button"
                onClick={() => setUrgency('DETIENE_EQUIPO')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  urgency === 'DETIENE_EQUIPO'
                    ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 ring-2 ring-rose-100 dark:ring-rose-900/40'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <AlertTriangle size={14} className="text-rose-600" />
                Detiene Equipo ⚠️
              </button>
            </div>
          </div>

          {/* Target Asset */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Truck size={14} className="text-slate-500" />
              Maquinaria en Terreno (Opcional)
            </label>
            <select
              value={targetAssetId}
              onChange={(e) => setTargetAssetId(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">Sin equipo específico / Uso general</option>
              {assets.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.internalNumber} - {a.brand} {a.model} ({a.type})
                </option>
              ))}
            </select>
          </div>

          {/* Justification */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Motivo / Falla / Justificación *</label>
            <textarea
              required
              rows={2}
              placeholder="Ej: Fuga de aceite en cilindro de levante o cambio programado de filtros en terreno"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-xl p-3 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Repuestos Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Package size={14} className="text-primary-600" />
                Repuestos Requeridos
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 p-1"
              >
                <Plus size={15} /> Agregar Otro
              </button>
            </div>

            <div className="space-y-3">
              {selectedItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Repuesto *</label>
                      <select
                        required
                        value={item.itemId}
                        onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                        className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="">Seleccione repuesto del catálogo...</option>
                        {items.map((it: any) => (
                          <option key={it.id} value={it.id}>
                            {it.code} - {it.description} ({it.unitOfMeasure})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Cant *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center font-bold"
                      />
                    </div>

                    {selectedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-2 mt-4"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Detalle o nota (ej. lado derecho, número de parte en placa)"
                    value={item.notes}
                    onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                    className="w-full text-[11px] border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Big Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={createRequestMutation.isPending}
              className={`w-full p-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                urgency === 'DETIENE_EQUIPO'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              <Send size={16} />
              {isOnline ? 'Enviar Pedido de Terreno' : 'Guardar Pedido en Cola Offline'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
