import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useFaenas } from '../../api/faenas';
import { useItems } from '../../api/bodega';
import { useAssets } from '../../api/flota';
import { useCreatePurchaseRequest } from '../../api/compras';
import {
  getOfflineQueue,
  queueOfflineRequest,
  cacheOfflineData,
  getCachedOfflineData,
  syncOfflineRequests,
  OfflineRequestItem,
} from '../../lib/offlineQueue';
import { RequestUrgency } from '../../types/compras';

export function TerrainRequestMobileView() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineRequestItem[]>(getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  // Queries
  const { data: serverFaenas = [] } = useFaenas();
  const { data: serverItems = [] } = useItems();
  const { data: serverAssets = [] } = useAssets();
  const createRequestMutation = useCreatePurchaseRequest();

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
    const handleQueueUpdated = () => setOfflineQueue(getOfflineQueue());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sgmt-queue-updated', handleQueueUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sgmt-queue-updated', handleQueueUpdated);
    };
  }, []);

  // Offline fallback master data
  const cached = getCachedOfflineData();
  const faenas = serverFaenas.length > 0 ? serverFaenas : cached.faenas;
  const items = serverItems.length > 0 ? serverItems : cached.items;
  const assets = serverAssets.length > 0 ? serverAssets : cached.assets;

  // Form State
  const [faenaId, setFaenaId] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [urgency, setUrgency] = useState<RequestUrgency>('NORMAL');
  const [targetAssetId, setTargetAssetId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: string; quantity: number; notes: string }>>([
    { itemId: '', quantity: 1, notes: '' },
  ]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('Sincronizando solicitudes pendientes...');
    try {
      const result = await syncOfflineRequests();
      setOfflineQueue(getOfflineQueue());
      setSyncFeedback(`Sincronización completada: ${result.success} enviada(s), ${result.failed} fallida(s).`);
      setTimeout(() => setSyncFeedback(''), 4000);
    } catch {
      setSyncFeedback('Error durante la sincronización');
    } finally {
      setIsSyncing(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Offline mode: queue in localStorage
      queueOfflineRequest(payload, {
        faenaName: targetFaena?.name || 'Faena en Terreno',
        itemsSummary: summary,
      });
      setSuccessMessage('¡Pedido guardado localmente en modo OFFLINE! Se enviará automáticamente al reconectar.');
      resetForm();
    } else {
      // Online mode: direct server submit
      try {
        await createRequestMutation.mutateAsync(payload);
        setSuccessMessage('¡Pedido enviado exitosamente al centro de compras!');
        resetForm();
      } catch (err: any) {
        // Fallback to queue if network dropped midway
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

  const resetForm = () => {
    setJustification('');
    setTargetAssetId('');
    setUrgency('NORMAL');
    setSelectedItems([{ itemId: '', quantity: 1, notes: '' }]);
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4 pb-20">
      {/* Mobile Header & Connectivity Bar */}
      <div
        className={`p-4 rounded-xl flex items-center justify-between shadow-xs transition-colors ${
          isOnline
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-900'
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOnline ? (
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <Wifi size={18} />
            </div>
          ) : (
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 animate-pulse">
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

        {offlineQueue.length > 0 && (
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isOnline
                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-xs'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando' : `Sincronizar (${offlineQueue.length})`}
          </button>
        )}
      </div>

      {/* Sync Banner */}
      {syncFeedback && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-xs text-primary-900 font-medium animate-in fade-in">
          {syncFeedback}
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Offline Pending Items Drawer / Warning */}
      {offlineQueue.length > 0 && (
        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <CloudOff size={14} className="text-amber-600" />
              Pedidos en cola local de terreno:
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[11px]">
              {offlineQueue.length} pendiente(s)
            </span>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto text-[11px] text-slate-600">
            {offlineQueue.map((item) => (
              <div key={item.id} className="p-2 bg-white rounded-md border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-semibold block">{item.faenaName || 'Faena'}</span>
                  <span className="text-slate-400">{item.itemsSummary}</span>
                </div>
                <span className="text-[10px] text-amber-600 font-mono">Pendiente Sync</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Faena de Origen *</label>
          <select
            value={faenaId}
            onChange={(e) => setFaenaId(e.target.value)}
            className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-primary-500"
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
          <label className="block text-xs font-bold text-slate-800 mb-1">Urgencia Operacional *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUrgency('NORMAL')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                urgency === 'NORMAL'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Normal (Abastecimiento)
            </button>
            <button
              type="button"
              onClick={() => setUrgency('DETIENE_EQUIPO')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                urgency === 'DETIENE_EQUIPO'
                  ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-100'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <AlertTriangle size={14} className="text-rose-600" />
              Detiene Equipo ⚠️
            </button>
          </div>
        </div>

        {/* Target Asset */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Truck size={14} className="text-slate-500" />
            Maquinaria en Terreno (Opcional)
          </label>
          <select
            value={targetAssetId}
            onChange={(e) => setTargetAssetId(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white text-slate-800"
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
          <label className="block text-xs font-bold text-slate-800 mb-1">Motivo / Falla / Justificación *</label>
          <textarea
            required
            rows={2}
            placeholder="Ej: Fuga de aceite en cilindro de levante o cambio programado de filtros en terreno"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl p-3 resize-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Repuestos Section */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Package size={14} className="text-primary-600" />
              Repuestos Requeridos
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 p-1"
            >
              <Plus size={15} /> Agregar Otro
            </button>
          </div>

          <div className="space-y-3">
            {selectedItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Repuesto *</label>
                    <select
                      required
                      value={item.itemId}
                      onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-medium"
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
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Cant *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-center font-bold"
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
                  className="w-full text-[11px] border border-slate-200 rounded-lg p-2 bg-white"
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
    </div>
  );
}
