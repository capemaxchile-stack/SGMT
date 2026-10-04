import { useState } from 'react';
import {
  useExecutiveReport,
  useFaenaClosing,
  FilterReportsParams,
} from '../../api/reports';
import { useFaenas } from '../../api/faenas';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AssetIcon } from '../../components/ui/AssetIcon';
import { exportToCSV, printElement } from '../../lib/export';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Layers,
  Fuel,
  Wrench,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  FileCheck2,
  Building2,
} from 'lucide-react';
import { Faena, FaenaReportSummary, AssetReportSummary } from '../../types/models';

export function ReportesPage() {
  const [activeTab, setActiveTab] = useState<'resumen' | 'cierre' | 'exportar'>('resumen');
  const [period, setPeriod] = useState<string>('current_month');
  const [selectedFaenaId, setSelectedFaenaId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Closing report specific faena
  const [closingFaenaId, setClosingFaenaId] = useState<string>('');

  // Fetch Faenas list for dropdown
  const { data: faenas = [] } = useFaenas();

  // Params for queries
  const reportParams: FilterReportsParams = {
    period: period !== 'custom' ? period : undefined,
    faenaId: selectedFaenaId !== 'ALL' ? selectedFaenaId : undefined,
    startDate: period === 'custom' && startDate ? startDate : undefined,
    endDate: period === 'custom' && endDate ? endDate : undefined,
  };

  const { data: report, isLoading } = useExecutiveReport(reportParams);

  // If no specific closing faena is selected, default to first available
  const effectiveClosingFaenaId = closingFaenaId || (faenas.length > 0 ? faenas[0].id : '');
  const { data: closingData } = useFaenaClosing(effectiveClosingFaenaId, reportParams);

  // Handlers for CSV Exports
  const handleExportExecutive = () => {
    if (!report) return;

    const rows = report.faenasSummary.map((f) => ({
      faena: f.faenaName,
      ubicacion: f.location,
      estado: f.status,
      equiposActivos: f.activeAssetsCount,
      litrosDiesel: f.fuelLiters,
      gastoDiesel: f.fuelCost,
      gastoMantencion: f.maintenanceCost,
      gastoTotal: f.totalCost,
      montoContrato: f.totalContractAmount,
      porcentajePresupuesto: `${f.budgetBurnPercentage}%`,
    }));

    exportToCSV(
      rows,
      [
        { header: 'Faena / Proyecto', key: 'faena' },
        { header: 'Ubicación', key: 'ubicacion' },
        { header: 'Estado', key: 'estado' },
        { header: 'N° Equipos', key: 'equiposActivos' },
        { header: 'Diésel (Litros)', key: 'litrosDiesel' },
        { header: 'Gasto Diésel ($ CLP)', key: 'gastoDiesel' },
        { header: 'Gasto Mantenimiento ($ CLP)', key: 'gastoMantencion' },
        { header: 'Gasto Total ($ CLP)', key: 'gastoTotal' },
        { header: 'Monto Contrato ($ CLP)', key: 'montoContrato' },
        { header: '% Presupuesto Consumido', key: 'porcentajePresupuesto' },
      ],
      'SGMT_Resumen_Ejecutivo_Faenas'
    );
  };

  const handleExportMachinery = () => {
    if (!report) return;

    const rows = report.assetsSummary.map((a) => ({
      numeroInterno: a.internalNumber,
      marcaModelo: `${a.brand} ${a.model}`,
      tipo: a.type,
      faena: a.currentFaena,
      horasTrabajadas: a.hoursWorked,
      kmRecorridos: a.kmTraveled,
      litrosDiesel: a.fuelLiters,
      gastoDiesel: a.fuelCost,
      litrosPorHora: a.avgLitersPerHour,
      gastoMantencion: a.maintenanceCost,
      ots: a.workOrdersCount,
      costoTotal: a.totalCost,
      costoPorHora: a.costPerHour,
    }));

    exportToCSV(
      rows,
      [
        { header: 'N° Interno', key: 'numeroInterno' },
        { header: 'Equipo', key: 'marcaModelo' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Faena Actual', key: 'faena' },
        { header: 'Horas Trabajadas (hrs)', key: 'horasTrabajadas' },
        { header: 'Km Recorridos', key: 'kmRecorridos' },
        { header: 'Diésel (Litros)', key: 'litrosDiesel' },
        { header: 'Rendimiento Promedio (L/h)', key: 'litrosPorHora' },
        { header: 'Gasto Diésel ($ CLP)', key: 'gastoDiesel' },
        { header: 'Gasto Taller ($ CLP)', key: 'gastoMantencion' },
        { header: 'N° OTs', key: 'ots' },
        { header: 'Costo Total ($ CLP)', key: 'costoTotal' },
        { header: 'Costo por Hora ($/hr)', key: 'costoPorHora' },
      ],
      'SGMT_Rendimiento_Costos_Maquinaria'
    );
  };

  const handleExportClosing = () => {
    if (!closingData) return;

    const rows = [
      {
        concepto: 'Combustible Diésel',
        detalle: `${closingData.totals.totalFuelLiters.toLocaleString('es-CL')} Litros despachados`,
        monto: closingData.totals.totalFuelCost,
      },
      {
        concepto: 'Mano de Obra y Servicios de Mantenimiento',
        detalle: `${closingData.workOrders.length} Órdenes de Trabajo`,
        monto: closingData.totals.totalLaborCost,
      },
      {
        concepto: 'Repuestos e Insumos de Taller',
        detalle: 'Repuestos consumidos desde bodega en OTs',
        monto: closingData.totals.totalSparePartsCost,
      },
      {
        concepto: 'Materiales Directos de Bodega',
        detalle: `${closingData.warehouseMovements.length} Movimientos de Salida`,
        monto: closingData.totals.totalWarehouseDispatchesCost,
      },
      {
        concepto: 'TOTAL GENERAL LIQUIDADO',
        detalle: 'Periodo de Cierre',
        monto: closingData.totals.grandTotalCost,
      },
    ];

    exportToCSV(
      rows,
      [
        { header: 'Concepto de Costo', key: 'concepto' },
        { header: 'Detalle Operativo', key: 'detalle' },
        { header: 'Total ($ CLP)', key: 'monto' },
      ],
      `SGMT_Cierre_Faena_${closingData.faena.name.replace(/\s+/g, '_')}`
    );
  };

  const kpis = report?.kpis;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-300 text-xs font-bold tracking-wider uppercase">
              Control Financiero y Operacional
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              Cierre de Costos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="text-blue-400" size={30} />
            Reportes Ejecutivos & Cierres de Faena
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Consolidación de costos operacionales (combustible, mantenimiento y bodegas), análisis de rendimiento de flota y liquidaciones mensuales de faena listas para exportar o imprimir.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => setActiveTab('exportar')}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs sm:text-sm"
          >
            <Download size={16} className="mr-1.5" />
            Descargar CSV
          </Button>
          <Button
            onClick={() => {
              setActiveTab('cierre');
              setTimeout(() => printElement('faena-closing-statement', 'Liquidacion_Faena'), 150);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm shadow-md"
          >
            <Printer size={16} className="mr-1.5" />
            Imprimir Cierre
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Calendar size={16} className="text-slate-400 ml-2" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent border-0 text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-0 pr-6"
            >
              <option value="current_month">Este Mes (En Curso)</option>
              <option value="last_month">Mes Anterior</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Año en Curso</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
              <span className="text-xs text-slate-400">a</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          )}

          {/* Faena Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Building2 size={16} className="text-slate-400 ml-2" />
            <select
              value={selectedFaenaId}
              onChange={(e) => setSelectedFaenaId(e.target.value)}
              className="bg-transparent border-0 text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-0 pr-6"
            >
              <option value="ALL">Todas las Faenas</option>
              {faenas.map((f: Faena) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
          Periodo: {report ? `${new Date(report.period.startDate).toLocaleDateString('es-CL')} — ${new Date(report.period.endDate).toLocaleDateString('es-CL')}` : 'Cargando...'}
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Operational Cost */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Costo Total Operacional</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                ${Number(kpis?.totalOperationalCost || 0).toLocaleString('es-CL')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Combustible + Taller + Bodega</p>
            </div>
          </CardContent>
        </Card>

        {/* Fuel Spend & Volume */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Fuel size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gasto Combustible (Diésel)</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                ${Number(kpis?.totalFuelCost || 0).toLocaleString('es-CL')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {Number(kpis?.totalFuelLiters || 0).toLocaleString('es-CL')} Litros despachados
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance & Workshop */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Wrench size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gasto Mantenimiento Flota</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${Number(kpis?.totalMaintenanceCost || 0).toLocaleString('es-CL')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {kpis?.completedWorkOrders || 0} de {kpis?.totalWorkOrders || 0} OTs finalizadas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Direct Warehouse Materials */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Insumos y Salidas Bodega</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400">
                ${Number(kpis?.directWarehouseMaterialsCost || 0).toLocaleString('es-CL')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Materiales directos a faena</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'resumen'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <BarChart3 size={18} />
          Resumen Consolidado & Flota
        </button>

        <button
          onClick={() => setActiveTab('cierre')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cierre'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <FileCheck2 size={18} />
          Cierre Mensual de Faena (Liquidación)
        </button>

        <button
          onClick={() => setActiveTab('exportar')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'exportar'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <FileSpreadsheet size={18} />
          Centro de Exportaciones (CSV)
        </button>
      </div>

      {/* TAB 1: RESUMEN CONSOLIDADO */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* Monthly Trend Visual */}
          {report && report.monthlyTrends.length > 0 && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600" />
                    Tendencia de Costos Operacionales (Últimos 6 Meses)
                  </span>
                  <div className="flex items-center gap-4 text-xs font-normal text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Diésel
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Mantenimiento
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-40 pt-6">
                  {report.monthlyTrends.map((t) => {
                    const maxVal = Math.max(...report.monthlyTrends.map((m) => m.totalCost || 1000));
                    const totalHeight = Math.max((t.totalCost / maxVal) * 100, 8);
                    const fuelPercent = t.totalCost > 0 ? (t.fuelCost / t.totalCost) * 100 : 50;

                    return (
                      <div key={t.month} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] text-slate-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${(t.totalCost / 1000).toFixed(0)}k
                        </div>
                        <div
                          className="w-full max-w-[40px] rounded-t-lg overflow-hidden flex flex-col justify-end bg-slate-100 dark:bg-slate-800"
                          style={{ height: `${totalHeight}%` }}
                        >
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{ height: `${100 - fuelPercent}%` }}
                            title={`Mantenimiento: $${t.maintenanceCost.toLocaleString('es-CL')}`}
                          />
                          <div
                            className="bg-amber-500 transition-all"
                            style={{ height: `${fuelPercent}%` }}
                            title={`Combustible: $${t.fuelCost.toLocaleString('es-CL')}`}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          {t.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table: Costos por Faena */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Consolidado de Costos por Faena
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Desglose de combustible, mantenimiento y consumo presupuestario del contrato
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleExportExecutive}>
                <Download size={14} className="mr-1" />
                Exportar Faenas
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Faena / Proyecto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-center">N° Equipos</th>
                    <th className="px-4 py-3 text-right">Diésel (L)</th>
                    <th className="px-4 py-3 text-right">Gasto Diésel</th>
                    <th className="px-4 py-3 text-right">Gasto Taller</th>
                    <th className="px-4 py-3 text-right">Gasto Total</th>
                    <th className="px-4 py-3 text-right">% Contrato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Cargando reporte de faenas...
                      </td>
                    </tr>
                  ) : !report?.faenasSummary || report.faenasSummary.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No hay registros para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    report.faenasSummary.map((f: FaenaReportSummary) => (
                      <tr key={f.faenaId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {f.faenaName}
                          <span className="block text-xs font-normal text-slate-400">{f.location}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={f.status} />
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {f.activeAssetsCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {f.fuelLiters.toLocaleString('es-CL')} L
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600 font-semibold">
                          ${f.fuelCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">
                          ${f.maintenanceCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                          ${f.totalCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  f.budgetBurnPercentage > 90
                                    ? 'bg-red-500'
                                    : f.budgetBurnPercentage > 70
                                    ? 'bg-amber-500'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(f.budgetBurnPercentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                              {f.budgetBurnPercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table: Rendimiento y Costos por Maquinaria */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Rendimiento Operativo y Costo por Equipo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Horas trabajadas, litros consumidos, rendimiento (L/h) y costo unitario por hora de trabajo
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleExportMachinery}>
                <Download size={14} className="mr-1" />
                Exportar Maquinaria
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Equipo</th>
                    <th className="px-4 py-3">Faena Asignada</th>
                    <th className="px-4 py-3 text-right">Horas Periodo</th>
                    <th className="px-4 py-3 text-right">Diésel (L)</th>
                    <th className="px-4 py-3 text-right">Rendimiento</th>
                    <th className="px-4 py-3 text-right">Gasto Diésel</th>
                    <th className="px-4 py-3 text-right">Gasto Taller</th>
                    <th className="px-4 py-3 text-right">Costo Total</th>
                    <th className="px-4 py-3 text-right">Costo / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Cargando rendimiento de maquinaria...
                      </td>
                    </tr>
                  ) : !report?.assetsSummary || report.assetsSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        No hay movimientos de flota registrados en el periodo seleccionado
                      </td>
                    </tr>
                  ) : (
                    report.assetsSummary.map((a: AssetReportSummary) => (
                      <tr key={a.assetId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <AssetIcon type={a.type} size="sm" />
                          <div>
                            <span>{a.internalNumber}</span>
                            <span className="block text-xs font-normal text-slate-400">
                              {a.brand} {a.model}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {a.currentFaena}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {a.hoursWorked > 0 ? `${a.hoursWorked.toFixed(1)} hrs` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {a.fuelLiters > 0 ? `${a.fuelLiters.toLocaleString('es-CL')} L` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600">
                          {a.avgLitersPerHour > 0 ? `${a.avgLitersPerHour} L/h` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          ${a.fuelCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">
                          ${a.maintenanceCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                          ${a.totalCost.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {a.costPerHour > 0 ? `$${a.costPerHour.toLocaleString('es-CL')}/hr` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CIERRE MENSUAL DE FAENA (LIQUIDACIÓN OPERATIVA) */}
      {activeTab === 'cierre' && (
        <div className="space-y-4">
          {/* Subheader Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Seleccionar Faena:
              </label>
              <select
                value={effectiveClosingFaenaId}
                onChange={(e) => setClosingFaenaId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium"
              >
                {faenas.map((f: Faena) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button size="sm" variant="outline" onClick={handleExportClosing}>
                <Download size={15} className="mr-1.5" />
                Exportar CSV
              </Button>
              <Button
                size="sm"
                onClick={() => printElement('faena-closing-statement', `Cierre_${closingData?.faena.name || 'Faena'}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer size={15} className="mr-1.5" />
                Imprimir Documento Oficial
              </Button>
            </div>
          </div>

          {/* Printable Statement Box */}
          <div
            id="faena-closing-statement"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6"
          >
            {/* Statement Header */}
            <div className="border-b-2 border-slate-900 dark:border-slate-700 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                  SGMT PRO — Sistema de Gestión Movimiento de Tierra
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  Liquidación Operativa & Cierre Mensual de Faena
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Documento formal de liquidación de costos de operación, combustible y mantenimiento
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400">
                <p>
                  <strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-CL')}
                </p>
                <p>
                  <strong>Periodo Liquidado:</strong>{' '}
                  {closingData
                    ? `${new Date(closingData.period.startDate).toLocaleDateString('es-CL')} al ${new Date(closingData.period.endDate).toLocaleDateString('es-CL')}`
                    : '-'}
                </p>
              </div>
            </div>

            {/* Faena Info Cards */}
            {closingData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Proyecto / Faena</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {closingData.faena.name}
                  </span>
                  <span className="text-slate-500 block">{closingData.faena.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Jefe de Faena Responsable</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {closingData.faena.chiefName}
                  </span>
                  <span className="text-slate-500 block">{closingData.faena.chiefEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Maquinaria Activa en Terreno</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {closingData.faena.activeAssets.length} Equipos Asignados
                  </span>
                  <span className="text-slate-500 block">Estado: {closingData.faena.status}</span>
                </div>
              </div>
            )}

            {/* Financial Summary Grid */}
            {closingData && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-3">
                  Resumen Consolidado de Costos del Periodo
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40">
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium block">
                      1. Diésel / Combustible
                    </span>
                    <span className="text-lg font-black text-amber-900 dark:text-amber-200 block mt-1">
                      ${closingData.totals.totalFuelCost.toLocaleString('es-CL')}
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      {closingData.totals.totalFuelLiters.toLocaleString('es-CL')} L
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
                      2. Mantenimiento & Mano de Obra
                    </span>
                    <span className="text-lg font-black text-emerald-900 dark:text-emerald-200 block mt-1">
                      ${closingData.totals.totalLaborCost.toLocaleString('es-CL')}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      {closingData.workOrders.length} OTs atendidas
                    </span>
                  </div>

                  <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40">
                    <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium block">
                      3. Repuestos en Taller
                    </span>
                    <span className="text-lg font-black text-blue-900 dark:text-blue-200 block mt-1">
                      ${closingData.totals.totalSparePartsCost.toLocaleString('es-CL')}
                    </span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400">
                      Consumidos en OTs
                    </span>
                  </div>

                  <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/40">
                    <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium block">
                      4. Insumos Directos Bodega
                    </span>
                    <span className="text-lg font-black text-purple-900 dark:text-purple-200 block mt-1">
                      ${closingData.totals.totalWarehouseDispatchesCost.toLocaleString('es-CL')}
                    </span>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400">
                      Salidas directas
                    </span>
                  </div>
                </div>

                {/* Grand Total Banner */}
                <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Total General Liquidado de la Faena
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      ${closingData.totals.grandTotalCost.toLocaleString('es-CL')} CLP
                    </span>
                  </div>

                  {closingData.totals.totalContractAmount > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">
                        Presupuesto Contrato: ${closingData.totals.totalContractAmount.toLocaleString('es-CL')}
                      </span>
                      <span className="text-xs font-bold text-amber-400">
                        {closingData.totals.budgetBurnPercentage}% Ejecutado
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Signature Blocks for Formal Printing */}
            <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
              <div>
                <div className="w-48 border-t border-slate-400 mx-auto mb-2"></div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {closingData?.faena.chiefName || 'Jefe de Faena'}
                </p>
                <p className="text-[11px]">Jefatura de Faena / Aprobación en Terreno</p>
              </div>

              <div>
                <div className="w-48 border-t border-slate-400 mx-auto mb-2"></div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Gerencia de Operaciones / Finanzas
                </p>
                <p className="text-[11px]">Control Central SGMT</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CENTRO DE EXPORTACIONES */}
      {activeTab === 'exportar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={20} />
                Resumen Ejecutivo Consolidado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Descarga un archivo CSV estructurado con el gasto consolidado por faena, litros de combustible, costos de taller y porcentaje de consumo presupuestario del contrato.
              </p>
              <Button onClick={handleExportExecutive} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <Download size={15} className="mr-2" />
                Descargar CSV de Faenas
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" size={20} />
                Rendimiento y Costos por Maquinaria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Exporta el detalle máquina por máquina con horas trabajadas, litros consumidos, rendimiento medio (L/h) y costo horario de operación ($/hr).
              </p>
              <Button onClick={handleExportMachinery} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Download size={15} className="mr-2" />
                Descargar CSV de Maquinaria
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck2 className="text-purple-600" size={20} />
                Liquidación y Cierre de Faena
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Genera el archivo con el detalle financiero consolidado para la faena seleccionada ({closingData?.faena.name || 'Faena'}).
              </p>
              <Button onClick={handleExportClosing} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs">
                <Download size={15} className="mr-2" />
                Descargar Liquidación de Faena (CSV)
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Printer className="text-slate-700 dark:text-slate-300" size={20} />
                Impresión / PDF de Liquidación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Imprime o genera un archivo PDF formal con membrete de SGMT PRO, detalle de partidas y casillas de firma para el cliente y jefatura.
              </p>
              <Button
                onClick={() => {
                  setActiveTab('cierre');
                  setTimeout(() => printElement('faena-closing-statement', 'Liquidacion_Faena'), 150);
                }}
                variant="outline"
                className="w-full text-xs"
              >
                <Printer size={15} className="mr-2" />
                Vista de Impresión Oficial
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
