import { useState } from 'react';
import {
  Sparkles,
  AlertOctagon,
  TrendingDown,
  ShoppingCart,
  CheckCircle,
  Building,
  ShieldCheck,
  PackageCheck,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useFaenas } from '../../../api/faenas';
import { usePurchaseSuggestions, useGenerateRequestFromSuggestion } from '../../../api/compras';

export function PurchaseSuggestionsTab() {
  const { data: faenas = [] } = useFaenas();
  const [selectedFaenaId, setSelectedFaenaId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; selected: boolean }>>({});
  const [justification] = useState('Reposición predictiva automática basada en stock crítico y rotación de bodega');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading } = usePurchaseSuggestions(selectedFaenaId || undefined);
  const generateMutation = useGenerateRequestFromSuggestion();

  const suggestions = data?.suggestions || [];
  const summary = data?.summary;

  const handleToggleItem = (itemId: string, defaultQty: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId];
      if (current) {
        return {
          ...prev,
          [itemId]: { ...current, selected: !current.selected },
        };
      } else {
        return {
          ...prev,
          [itemId]: { quantity: defaultQty, selected: true },
        };
      }
    });
  };

  const handleQuantityChange = (itemId: string, qty: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        quantity: Math.max(qty, 1),
        selected: prev[itemId]?.selected ?? true,
      },
    }));
  };

  const handleSelectAll = () => {
    const allSelected = suggestions.every((s) => selectedItems[s.itemId]?.selected);
    const updated: Record<string, { quantity: number; selected: boolean }> = {};
    for (const s of suggestions) {
      updated[s.itemId] = {
        quantity: selectedItems[s.itemId]?.quantity || s.suggestedQuantity,
        selected: !allSelected,
      };
    }
    setSelectedItems(updated);
  };

  const selectedCount = Object.values(selectedItems).filter((i) => i.selected).length;

  const handleGenerateRequest = async () => {
    if (selectedCount === 0) return;
    const targetFaena = selectedFaenaId || (faenas.length > 0 ? faenas[0].id : '');
    if (!targetFaena) return;

    const itemsToRequest = suggestions
      .filter((s) => selectedItems[s.itemId]?.selected)
      .map((s) => ({
        itemId: s.itemId,
        quantity: selectedItems[s.itemId]?.quantity || s.suggestedQuantity,
        urgency: s.urgency,
        notes: s.reasons.join(' | '),
      }));

    const result = await generateMutation.mutateAsync({
      faenaId: targetFaena,
      justification,
      items: itemsToRequest,
    });

    setSuccessMessage(`¡Solicitud ${result.requestNumber} generada exitosamente con ${itemsToRequest.length} repuestos!`);
    setSelectedItems({});
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* AI Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={16} />
            Motor de Inteligencia & Reposición Predictiva
          </div>
          <h2 className="text-xl font-bold">Sugerencias Automáticas de Abastecimiento</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            El sistema cruza en tiempo real el <span className="text-white font-medium">stock actual</span> contra el{' '}
            <span className="text-white font-medium">stock mínimo de seguridad</span> y la{' '}
            <span className="text-white font-medium">velocidad de consumo (salidas)</span> de los últimos 60 días para
            prevenir quiebres de faena antes de que detengan maquinaria.
          </p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building size={18} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filtrar por Faena:</span>
          <select
            value={selectedFaenaId}
            onChange={(e) => setSelectedFaenaId(e.target.value)}
            className="text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todas las faenas y bodegas</option>
            {faenas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Seleccionar Todos ({suggestions.length})
          </button>
          <button
            onClick={handleGenerateRequest}
            disabled={selectedCount === 0 || generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <ShoppingCart size={16} />
            {generateMutation.isPending
              ? 'Generando Solicitud...'
              : `Generar Solicitud de Compra (${selectedCount})`}
          </button>
        </div>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 animate-fadeIn">
          <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-sm font-medium">{successMessage}</div>
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <span className="p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl">
              <AlertOctagon size={24} />
            </span>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalCriticalItems}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Repuestos Bajo Stock Mínimo</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <span className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <TrendingDown size={24} />
            </span>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalHighTurnoverItems}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Riesgo de Quiebre por Alta Rotación (&lt;15 días)</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <span className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <PackageCheck size={24} />
            </span>
            <div>
              <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                ${summary.estimatedReplenishmentCost.toLocaleString('es-CL')}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inversión Estimada en Reposición</p>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions List Table */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          Analizando stock y patrones de rotación...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <CheckCircle size={36} className="text-emerald-500 mx-auto" />
          <h3 className="font-semibold text-slate-800 dark:text-white">¡Niveles de inventario óptimos!</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No se detectaron repuestos bajo el stock crítico ni rotación con riesgo de agotamiento inminente.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Sel</th>
                  <th className="py-3 px-4">Repuesto / SKU</th>
                  <th className="py-3 px-4">Stock vs Mínimo</th>
                  <th className="py-3 px-4">Consumo & Autonomía</th>
                  <th className="py-3 px-4">Motivo Diagnóstico</th>
                  <th className="py-3 px-4 w-32">Cant. Sugerida</th>
                  <th className="py-3 px-4">Proveedor Sugerido</th>
                  <th className="py-3 px-4 text-right">Costo Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {suggestions.map((item) => {
                  const isSelected = selectedItems[item.itemId]?.selected ?? false;
                  const currentQty = selectedItems[item.itemId]?.quantity ?? item.suggestedQuantity;
                  const lineTotal = currentQty * (item.recommendedSupplier?.lastPrice || 0);

                  return (
                    <tr
                      key={item.itemId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-primary-50/30 dark:bg-primary-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item.itemId, item.suggestedQuantity)}
                          className="text-primary-600 dark:text-primary-400 focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-primary-600 dark:text-primary-400" />
                          ) : (
                            <Square size={18} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Repuesto */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{item.itemCode}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.itemDescription}</div>
                        <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.category}
                        </span>
                      </td>

                      {/* Stock vs Minimo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              item.currentStock <= item.minimumStock ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.currentStock}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">/ mín {item.minimumStock} {item.unitOfMeasure}</span>
                        </div>
                      </td>

                      {/* Consumo & Autonomia */}
                      <td className="py-3 px-4">
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {item.dailyBurnRate} {item.unitOfMeasure}/día
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.runwayDays !== null ? (
                            <span
                              className={`font-semibold ${
                                item.runwayDays <= 7
                                  ? 'text-red-600 dark:text-red-400'
                                  : item.runwayDays <= 15
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {item.runwayDays} días restantes
                            </span>
                          ) : (
                            'Sin consumo reciente'
                          )}
                        </div>
                      </td>

                      {/* Diagnostico */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {item.reasons.map((r, idx) => (
                            <div
                              key={idx}
                              className={`text-xs px-2 py-0.5 rounded-md inline-block mr-1 font-medium ${
                                item.urgency === 'DETIENE_EQUIPO'
                                  ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                                  : item.urgency === 'ALTA'
                                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                                  : 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {r}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Cantidad Sugerida Editable */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(item.itemId, parseInt(e.target.value, 10) || 1)}
                          className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded text-sm text-center font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                      </td>

                      {/* Proveedor Sugerido */}
                      <td className="py-3 px-4">
                        {item.recommendedSupplier ? (
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                              {item.recommendedSupplier.businessName}
                              {item.recommendedSupplier.isExclusive && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <ShieldCheck size={12} />
                                  Exclusivo
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              Plazo: {item.recommendedSupplier.leadTimeDays} días | Ref: $
                              {item.recommendedSupplier.lastPrice.toLocaleString('es-CL')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin proveedor en catálogo</span>
                        )}
                      </td>

                      {/* Costo Estimado */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ${lineTotal.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
