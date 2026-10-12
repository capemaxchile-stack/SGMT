import { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Building,
  DollarSign,
  Layers,
} from 'lucide-react';
import { useFaenas } from '../../../api/faenas';
import { useBudgetSummary, useUpsertBudget } from '../../../api/compras';

export function BudgetControlTab() {
  const { data: faenas = [] } = useFaenas();
  const [selectedFaenaId, setSelectedFaenaId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Default to first faena if none selected
  const activeFaenaId = selectedFaenaId || (faenas.length > 0 ? faenas[0].id : '');

  const monthParam = selectedMonth !== 'all' ? parseInt(selectedMonth, 10) : undefined;
  const { data: budgetData, isLoading: loadingBudget } = useBudgetSummary(
    activeFaenaId || null,
    selectedYear,
    monthParam,
  );

  const upsertBudgetMutation = useUpsertBudget();

  // Modal form state
  const [modalForm, setModalForm] = useState({
    amount: '',
    year: selectedYear,
    month: selectedMonth !== 'all' ? parseInt(selectedMonth, 10) : undefined,
    costCenterId: '',
    notes: '',
  });

  const handleOpenModal = () => {
    setModalForm({
      amount: budgetData?.metrics.budgetTotal ? budgetData.metrics.budgetTotal.toString() : '',
      year: selectedYear,
      month: selectedMonth !== 'all' ? parseInt(selectedMonth, 10) : undefined,
      costCenterId: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFaenaId || !modalForm.amount) return;

    await upsertBudgetMutation.mutateAsync({
      faenaId: activeFaenaId,
      amount: parseFloat(modalForm.amount),
      year: modalForm.year,
      month: modalForm.month || undefined,
      costCenterId: modalForm.costCenterId || undefined,
      notes: modalForm.notes || undefined,
    });

    setIsModalOpen(false);
  };

  const metrics = budgetData?.metrics;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Faena / Proyecto
            </label>
            <div className="flex items-center gap-2">
              <Building size={18} className="text-slate-400" />
              <select
                value={activeFaenaId}
                onChange={(e) => setSelectedFaenaId(e.target.value)}
                className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {faenas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todo el año</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m.toString()}>
                  Mes {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus size={16} />
          Asignar / Modificar Presupuesto
        </button>
      </div>

      {loadingBudget ? (
        <div className="p-12 text-center text-slate-500">Cargando métricas de presupuesto...</div>
      ) : !metrics ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          Seleccione una faena para consultar el estado presupuestario.
        </div>
      ) : (
        <>
          {/* Overbudget Warning Alert */}
          {metrics.isOverBudget && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3 text-red-800">
              <AlertTriangle size={24} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">¡Alerta de Sobregiro Presupuestario!</h4>
                <p className="text-xs mt-0.5 text-red-700">
                  El monto acumulado de compras comprometidas y facturadas supera el presupuesto asignado en{' '}
                  <span className="font-bold">${Math.abs(metrics.availableBudget).toLocaleString('es-CL')}</span>.
                  Cualquier nueva orden requerirá autorización excepcional de Gerencia General.
                </p>
              </div>
            </div>
          )}

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Presupuesto Total */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Presupuesto</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Wallet size={18} />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  ${metrics.budgetTotal.toLocaleString('es-CL')}
                </div>
                <p className="text-xs text-slate-400 mt-1">Límite asignado</p>
              </div>
            </div>

            {/* Cotizaciones en Proceso (Comprometido Potencial) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">En Cotizaciones</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Clock size={18} />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-purple-700">
                  ${metrics.committedQuotations.toLocaleString('es-CL')}
                </div>
                <p className="text-xs text-slate-400 mt-1">Compromiso en evaluación</p>
              </div>
            </div>

            {/* Órdenes Comprometidas / En Tránsito */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">OC Comprometidas</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-amber-700">
                  ${metrics.committedOrders.toLocaleString('es-CL')}
                </div>
                <p className="text-xs text-slate-400 mt-1">Aprobadas / En Tránsito</p>
              </div>
            </div>

            {/* Gasto Real Facturado */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gasto Real</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle size={18} />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-emerald-700">
                  ${metrics.executedOrders.toLocaleString('es-CL')}
                </div>
                <p className="text-xs text-slate-400 mt-1">Recepcionado en faena</p>
              </div>
            </div>

            {/* Saldo Disponible */}
            <div
              className={`p-5 rounded-xl border shadow-sm ${
                metrics.isOverBudget
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : metrics.percentageUsed >= 85
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-900 text-white border-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider opacity-80">Saldo Disponible</span>
                <DollarSign size={18} className="opacity-80" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold">
                  ${metrics.availableBudget.toLocaleString('es-CL')}
                </div>
                <div className="text-xs mt-1 opacity-80 flex items-center gap-1">
                  <span>{metrics.percentageUsed}% ejecutado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Execution Progress Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Consumo Acumulado del Presupuesto</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                ${metrics.totalCommittedAndExecuted.toLocaleString('es-CL')} de ${metrics.budgetTotal.toLocaleString('es-CL')} ({metrics.percentageUsed}%)
              </span>
            </div>

            <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              {/* Real spent */}
              <div
                style={{
                  width: `${Math.min((metrics.executedOrders / (metrics.budgetTotal || 1)) * 100, 100)}%`,
                }}
                className="bg-emerald-500 h-full"
                title={`Gasto Real: $${metrics.executedOrders.toLocaleString('es-CL')}`}
              />
              {/* Approved POs */}
              <div
                style={{
                  width: `${Math.min((metrics.committedOrders / (metrics.budgetTotal || 1)) * 100, 100)}%`,
                }}
                className="bg-amber-500 h-full"
                title={`OC Comprometidas: $${metrics.committedOrders.toLocaleString('es-CL')}`}
              />
              {/* Requested Quotes */}
              <div
                style={{
                  width: `${Math.min((metrics.committedQuotations / (metrics.budgetTotal || 1)) * 100, 100)}%`,
                }}
                className="bg-purple-500 h-full"
                title={`Cotizaciones en curso: $${metrics.committedQuotations.toLocaleString('es-CL')}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Gasto Real Recepcionado (${metrics.executedOrders.toLocaleString('es-CL')})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>OC Comprometidas (${metrics.committedOrders.toLocaleString('es-CL')})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Cotizaciones en Trámite (${metrics.committedQuotations.toLocaleString('es-CL')})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span>Saldo Libre (${Math.max(metrics.availableBudget, 0).toLocaleString('es-CL')})</span>
              </div>
            </div>
          </div>

          {/* Breakdown: Cost Centers & Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Centros de Costo */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Layers size={16} className="text-primary-600" />
                  Centros de Costo de la Faena
                </h3>
              </div>

              {budgetData.costCenters.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No hay centros de costo asociados a los contratos de esta faena.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {budgetData.costCenters.map((cc) => (
                    <div key={cc.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{cc.name}</div>
                        <div className="text-xs text-slate-400">Código: {cc.code}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          ${cc.allocatedBudget.toLocaleString('es-CL')}
                        </div>
                        <div className="text-xs text-slate-400">Asignado</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Órdenes Recientes del Período */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  Últimos Gastos & Órdenes en la Faena
                </h3>
              </div>

              {budgetData.recentOrders.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No se registran órdenes de compra en el período.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                  {budgetData.recentOrders.map((po) => (
                    <div key={po.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{po.orderNumber}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{po.supplierName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          ${po.totalAmount.toLocaleString('es-CL')}
                        </div>
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {po.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Asignar Presupuesto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Asignar / Modificar Presupuesto</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define el presupuesto operativo para compras y suministros en la faena seleccionada.
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Monto Total Presupuesto (CLP)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={modalForm.amount}
                  onChange={(e) => setModalForm({ ...modalForm, amount: e.target.value })}
                  placeholder="Ej: 50000000"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    value={modalForm.year}
                    onChange={(e) => setModalForm({ ...modalForm, year: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Mes (Opcional)
                  </label>
                  <select
                    value={modalForm.month || ''}
                    onChange={(e) =>
                      setModalForm({
                        ...modalForm,
                        month: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm"
                  >
                    <option value="">Anual (Todo el año)</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Mes {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Centro de Costo (Opcional)
                </label>
                <select
                  value={modalForm.costCenterId}
                  onChange={(e) => setModalForm({ ...modalForm, costCenterId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm"
                >
                  <option value="">General Faena</option>
                  {budgetData?.costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Notas / Justificación
                </label>
                <textarea
                  rows={2}
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  placeholder="Detalles sobre asignación presupuestaria..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={upsertBudgetMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {upsertBudgetMutation.isPending ? 'Guardando...' : 'Guardar Presupuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
