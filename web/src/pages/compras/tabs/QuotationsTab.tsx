import { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  FileCheck,
} from 'lucide-react';
import {
  useQuotations,
  usePurchaseRequests,
  useCreateQuotation,
  useSelectQuotation,
  useItemProcurementInsights,
  useCreatePurchaseOrder,
} from '../../../api/compras';
import { useSuppliers } from '../../../api/bodega';
import { useItems } from '../../../api/bodega';
import { Quotation, QuotationStatus } from '../../../types/compras';

export function QuotationsTab() {
  const { data: quotations = [], isLoading } = useQuotations();
  const { data: requests = [] } = usePurchaseRequests();
  const { data: suppliers = [] } = useSuppliers();
  const { data: items = [] } = useItems();

  const [selectedRequestId, setSelectedRequestId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [selectedItemIdForInsights, setSelectedItemIdForInsights] = useState<string | null>(null);

  // Mutations
  const createQuotationMutation = useCreateQuotation();
  const selectQuotationMutation = useSelectQuotation();
  const createOrderMutation = useCreatePurchaseOrder();

  // New quote form state
  const [formData, setFormData] = useState({
    purchaseRequestId: '',
    supplierId: '',
    validUntil: '',
    notes: '',
    lines: [{ itemId: '', quantity: 1, unitPrice: 0, availabilityDays: 2, comments: '' }],
  });

  const { data: insights } = useItemProcurementInsights(selectedItemIdForInsights);

  // Filtered quotes
  const filteredQuotes = quotations.filter((q) => {
    if (selectedRequestId !== 'all' && q.purchaseRequestId !== selectedRequestId) return false;
    if (selectedStatus !== 'all' && q.status !== selectedStatus) return false;
    return true;
  });

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [...prev.lines, { itemId: '', quantity: 1, unitPrice: 0, availabilityDays: 2, comments: '' }],
    }));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...formData.lines];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, lines: updated });

    if (field === 'itemId') {
      setSelectedItemIdForInsights(value);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.lines.some((l) => !l.itemId)) {
      alert('Por favor complete el proveedor y los ítems requeridos');
      return;
    }

    try {
      await createQuotationMutation.mutateAsync({
        purchaseRequestId: formData.purchaseRequestId || undefined,
        supplierId: formData.supplierId,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
        notes: formData.notes,
        lines: formData.lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice) || 0,
          availabilityDays: Number(l.availabilityDays) || 1,
          comments: l.comments,
        })),
      });
      setIsNewQuoteOpen(false);
      setFormData({
        purchaseRequestId: '',
        supplierId: '',
        validUntil: '',
        notes: '',
        lines: [{ itemId: '', quantity: 1, unitPrice: 0, availabilityDays: 2, comments: '' }],
      });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al registrar cotización');
    }
  };

  const handleSelectQuote = async (quoteId: string) => {
    if (!confirm('¿Desea adjudicar esta cotización como la ganadora para este requerimiento?')) return;
    try {
      await selectQuotationMutation.mutateAsync(quoteId);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al adjudicar cotización');
    }
  };

  const handleConvertToOrder = async (quote: Quotation) => {
    if (quote.purchaseRequestId) {
      const linkedRequest = requests.find((r) => r.id === quote.purchaseRequestId);
      if (linkedRequest && linkedRequest.status !== 'APROBADA') {
        alert(
          `No se puede generar la Orden de Compra formal: La solicitud de compra vinculada (${linkedRequest.requestNumber}) se encuentra en estado "${linkedRequest.status}". Debe ser aprobada previamente por la jefatura en la pestaña "Solicitudes de Terreno".`
        );
        return;
      }
    }

    if (!confirm(`¿Generar Orden de Compra formal para la cotización ${quote.quotationNumber}?`)) return;
    try {
      await createOrderMutation.mutateAsync({
        supplierId: quote.supplierId,
        purchaseRequestId: quote.purchaseRequestId,
        quotationId: quote.id,
        deliveryTerms: `Cotización ${quote.quotationNumber}. Entrega estimada en ${quote.lines[0]?.availabilityDays || 3} días`,
        lines: quote.lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      });
      alert('¡Orden de Compra generada exitosamente y enviada para autorización!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al generar Orden de Compra';
      alert(msg);
    }
  };

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'SELECCIONADA':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Adjudicada</span>;
      case 'SOLICITADA':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Solicitada</span>;
      case 'RECIBIDA':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Recibida</span>;
      case 'DESCARTADA':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Descartada</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todas las solicitudes</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.requestNumber} - {r.justification.slice(0, 30)}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todos los estados</option>
            <option value="SOLICITADA">Solicitada</option>
            <option value="RECIBIDA">Recibida</option>
            <option value="SELECCIONADA">Adjudicada</option>
            <option value="DESCARTADA">Descartada</option>
          </select>
        </div>

        <button
          onClick={() => setIsNewQuoteOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold transition-colors shadow-xs"
        >
          <Plus size={16} />
          Nueva Cotización
        </button>
      </div>

      {/* Quotations List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart size={16} className="text-primary-600 dark:text-primary-400" />
            Cotizaciones Registradas ({filteredQuotes.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">Cargando cotizaciones...</div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">No hay cotizaciones para el filtro seleccionado.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredQuotes.map((quote) => {
              const linkedReq = quote.purchaseRequest || (quote.purchaseRequestId ? requests.find((r) => r.id === quote.purchaseRequestId) : null);
              const isReqApproved = !linkedReq || linkedReq.status === 'APROBADA';
              return (
              <div key={quote.id} className="p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{quote.quotationNumber}</span>
                    {getStatusBadge(quote.status)}
                    {linkedReq && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium border ${
                          linkedReq.status === 'APROBADA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        }`}
                        title={
                          linkedReq.status === 'APROBADA'
                            ? 'Solicitud aprobada y lista para OC'
                            : `Solicitud en estado ${linkedReq.status}. Requiere aprobación previa de jefatura.`
                        }
                      >
                        Sol: {linkedReq.requestNumber} ({linkedReq.status})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                      <Building size={14} className="text-slate-400" />
                      {quote.supplier.businessName} ({quote.supplier.rut})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} className="text-slate-400" />
                      Solicitada: {new Date(quote.requestedDate).toLocaleDateString('es-CL')}
                    </span>
                    {quote.validUntil && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Válida hasta: {new Date(quote.validUntil).toLocaleDateString('es-CL')}
                      </span>
                    )}
                  </div>

                  {/* Line items summary */}
                  <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-750 text-xs space-y-1">
                    {quote.lines.map((line, lIdx) => (
                      <div key={lIdx} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span>
                          {Number(line.quantity)}x {line.item?.description || 'Ítem'} ({line.item?.code})
                        </span>
                        <div className="flex items-center gap-3">
                          {line.availabilityDays && (
                            <span className="text-slate-400 text-[11px]">{line.availabilityDays} días entrega</span>
                          )}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ${Number(line.totalPrice).toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-3 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block uppercase font-medium">Total Cotizado</span>
                    <span className="text-lg font-bold text-primary-700 dark:text-primary-400">
                      ${Number(quote.totalAmount).toLocaleString('es-CL')} CLP
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {quote.status !== 'SELECCIONADA' && quote.status !== 'DESCARTADA' && (
                      <button
                        onClick={() => handleSelectQuote(quote.id)}
                        disabled={selectQuotationMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                      >
                        <CheckCircle size={14} />
                        Adjudicar
                      </button>
                    )}

                    {quote.status === 'SELECCIONADA' && (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => handleConvertToOrder(quote)}
                          disabled={createOrderMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                        >
                          <FileCheck size={14} />
                          Generar Orden de Compra
                        </button>
                        {!isReqApproved && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Solicitud base requiere aprobación
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Quotation Modal */}
      {isNewQuoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Solicitud / Cotización</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ingrese los datos del proveedor y líneas de repuestos a cotizar
                </p>
              </div>
              <button
                onClick={() => setIsNewQuoteOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Solicitud de Compra (Opcional)
                  </label>
                  <select
                    value={formData.purchaseRequestId}
                    onChange={(e) => {
                      const reqId = e.target.value;
                      const selectedReq = requests.find((r) => r.id === reqId);
                      if (selectedReq && selectedReq.lines && selectedReq.lines.length > 0) {
                        setFormData((prev) => ({
                          ...prev,
                          purchaseRequestId: reqId,
                          lines: selectedReq.lines!.map((l) => ({
                            itemId: l.itemId,
                            quantity: Number(l.quantity) || 1,
                            unitPrice: 0,
                            availabilityDays: 2,
                            comments: l.notes || '',
                          })),
                        }));
                      } else {
                        setFormData((prev) => ({ ...prev, purchaseRequestId: reqId }));
                      }
                    }}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Sin solicitud vinculada (Directa)</option>
                    {requests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.requestNumber} ({r.faena?.name}) - {r.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Proveedor *</label>
                  <select
                    required
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Seleccione proveedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.businessName} ({s.rut})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Válida Hasta</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas / Referencia</label>
                  <input
                    type="text"
                    placeholder="Ej. Cotización según lista de precios Q4"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">Repuestos a Cotizar</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Agregar Repuesto
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Repuesto *</label>
                          <select
                            required
                            value={line.itemId}
                            onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                            className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          >
                            <option value="">Seleccione repuesto...</option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.code} - {it.description}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Cantidad *</label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                            className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            Precio Unitario Cotizado ($ CLP)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0 si aún está en trámite"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                            className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            Plazo de Entrega (Días)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={line.availabilityDays}
                            onChange={(e) => handleLineChange(idx, 'availabilityDays', e.target.value)}
                            className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Procurement Insights Panel if an item is selected */}
              {insights && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
                    <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
                    Inteligencia de Abastecimiento: {insights.itemCode}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-950 dark:text-amber-200">
                    <div>
                      <span className="font-semibold">Stock en Bodega: </span>
                      {insights.totalStock} {insights.unitOfMeasure}
                      {insights.hasEnoughStock && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold ml-1">
                          (Hay stock suficiente para no comprar)
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="font-semibold">Última Compra: </span>
                      {insights.lastPurchase ? (
                        <span>
                          ${insights.lastPurchase.unitPrice.toLocaleString('es-CL')} ({insights.lastPurchase.supplierName})
                        </span>
                      ) : (
                        'Sin compras previas registradas'
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-900/50 p-2 rounded-lg">
                    <span className="font-bold">Recomendación: </span>
                    {insights.recommendation}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewQuoteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createQuotationMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-xs"
                >
                  {createQuotationMutation.isPending ? 'Guardando...' : 'Guardar Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
