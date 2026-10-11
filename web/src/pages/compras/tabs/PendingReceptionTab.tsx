import { useState } from 'react';
import {
  AlertTriangle,
  Truck,
  Warehouse,
  Clock,
  CheckCircle2,
  Calendar,
  Building,
} from 'lucide-react';
import {
  usePendingReceptionOrders,
  useReceivePurchaseOrder,
  useOrderTimeline,
} from '../../../api/compras';
import { useWarehouses } from '../../../api/bodega';
import { useAssets } from '../../../api/flota';
import { ProcurementTimelineModal } from '../../../components/procurement/ProcurementTimelineModal';
import { PendingReceptionOrder, ReceptionDestination } from '../../../types/compras';

export function PendingReceptionTab() {
  const { data: pendingOrders = [], isLoading } = usePendingReceptionOrders();
  const { data: warehouses = [] } = useWarehouses();
  const { data: assets = [] } = useAssets();
  const receiveOrderMutation = useReceivePurchaseOrder();

  const [selectedOrderForTimeline, setSelectedOrderForTimeline] = useState<string | null>(null);
  const { data: timelineData, isLoading: isTimelineLoading } = useOrderTimeline(selectedOrderForTimeline);

  // Reception dialog state
  const [selectedOrderForReception, setSelectedOrderForReception] = useState<PendingReceptionOrder | null>(null);
  const [destination, setDestination] = useState<ReceptionDestination>('BODEGA');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [targetAssetId, setTargetAssetId] = useState<string>('');
  const [gateTicketNumber, setGateTicketNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleOpenReceive = (order: PendingReceptionOrder) => {
    setSelectedOrderForReception(order);
    setDestination(order.receptionDestination === 'GARITA_TRANSITO' ? 'BODEGA' : 'GARITA_TRANSITO');
    setGateTicketNumber(order.gateTicketNumber || '');
    setWarehouseId(warehouses[0]?.id || '');
    setTargetAssetId(assets[0]?.id || '');
    setNotes('');
  };

  const handleConfirmReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReception) return;

    if (destination === 'BODEGA' && !warehouseId) {
      alert('Debe seleccionar la bodega de destino');
      return;
    }

    if (destination === 'ACTIVO_DIRECTO' && !targetAssetId) {
      alert('Debe seleccionar la maquinaria en terreno para entrega directa');
      return;
    }

    try {
      await receiveOrderMutation.mutateAsync({
        id: selectedOrderForReception.id,
        destination,
        warehouseId: destination === 'BODEGA' ? warehouseId : undefined,
        targetAssetId: destination === 'ACTIVO_DIRECTO' ? targetAssetId : undefined,
        gateTicketNumber: destination === 'GARITA_TRANSITO' ? gateTicketNumber : undefined,
        notes,
      });
      alert('¡Recepción registrada exitosamente!');
      setSelectedOrderForReception(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al procesar la recepción');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">
              Control de Compras en Tránsito y Garitas ({pendingOrders.length})
            </h3>
            <p className="text-xs text-amber-800">
              Alertas de órdenes emitidas o recepcionadas en control de garita que aún no ingresan físicamente al kardex de bodega.
            </p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Cargando compras pendientes...</div>
        ) : pendingOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
            No hay compras pendientes de ingreso a bodega en este momento. Todas las recepciones están al día.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">{order.orderNumber}</span>

                    {order.receptionDestination === 'GARITA_TRANSITO' ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800 flex items-center gap-1">
                        <Truck size={12} />
                        En Garita (Ticket: {order.gateTicketNumber || 'S/N'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock size={12} />
                        Emitida - En Despacho
                      </span>
                    )}

                    {order.isOverdue && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Atrasada
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium text-slate-800">
                      <Building size={14} className="text-slate-400" />
                      {order.supplierName} ({order.supplierRut})
                    </span>
                    <span>• Faena: {order.faenaName}</span>
                    <span>• {order.itemCount} repuestos requeridos</span>
                    {order.estimatedDeliveryDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        Entrega estimada: {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-CL')}
                      </span>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700">
                    {order.lines.map((l, lIdx) => (
                      <div key={lIdx} className="flex justify-between py-0.5">
                        <span>
                          {l.quantity}x {l.itemDescription} ({l.itemCode})
                        </span>
                        <span className="font-semibold">${(l.quantity * l.unitPrice).toLocaleString('es-CL')} CLP</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block uppercase font-medium">Monto OC</span>
                    <span className="text-base font-bold text-slate-900">
                      ${order.totalAmount.toLocaleString('es-CL')} CLP
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrderForTimeline(order.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      Ver Trazabilidad
                    </button>

                    <button
                      onClick={() => handleOpenReceive(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Warehouse size={14} />
                      Ingresar / Recepcionar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reception Action Dialog */}
      {selectedOrderForReception && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Recepcionar Compra ({selectedOrderForReception.orderNumber})
            </h3>
            <p className="text-xs text-slate-500">
              Seleccione el destino físico de la carga según los procedimientos de logística de faena.
            </p>

            <form onSubmit={handleConfirmReception} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destino de Recepción *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestination('BODEGA')}
                    className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                      destination === 'BODEGA'
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Bodega Central/Faena
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestination('GARITA_TRANSITO')}
                    className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                      destination === 'GARITA_TRANSITO'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Garita Control
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestination('ACTIVO_DIRECTO')}
                    className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                      destination === 'ACTIVO_DIRECTO'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Directo a Terreno
                  </button>
                </div>
              </div>

              {destination === 'BODEGA' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bodega de Destino *</label>
                  <select
                    required
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="">Seleccione bodega...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {destination === 'GARITA_TRANSITO' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Ticket Garita *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. GT-2026-9042"
                    value={gateTicketNumber}
                    onChange={(e) => setGateTicketNumber(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              )}

              {destination === 'ACTIVO_DIRECTO' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maquinaria / Camión Destino *
                  </label>
                  <select
                    required
                    value={targetAssetId}
                    onChange={(e) => setTargetAssetId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="">Seleccione maquinaria...</option>
                    {assets.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.internalNumber} - {a.brand} {a.model} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  placeholder="Guía de despacho, transportista, estado del empaque"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForReception(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={receiveOrderMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-xs"
                >
                  {receiveOrderMutation.isPending ? 'Confirmando...' : 'Confirmar Recepción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {selectedOrderForTimeline && (
        <ProcurementTimelineModal
          isOpen={!!selectedOrderForTimeline}
          onClose={() => setSelectedOrderForTimeline(null)}
          title={`Trazabilidad Completa: ${timelineData?.orderNumber || 'Orden de Compra'}`}
          subtitle={`Proveedor: ${timelineData?.supplier || 'N/A'} • Total: $${Number(timelineData?.totalAmount || 0).toLocaleString('es-CL')} CLP`}
          events={timelineData?.timeline || []}
          isLoading={isTimelineLoading}
        />
      )}
    </div>
  );
}
