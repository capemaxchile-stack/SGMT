import { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Info,
  Building,
  CheckCircle,
  FileWarning,
  Eye,
  Split,
  Percent,
  Truck,
  Archive,
} from 'lucide-react';
import { useFaenas } from '../../../api/faenas';
import { useFraudRadar } from '../../../api/compras';

export function ProcurementAuditTab() {
  const { data: faenas = [] } = useFaenas();
  const [selectedFaenaId, setSelectedFaenaId] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const { data, isLoading } = useFraudRadar(selectedFaenaId || undefined);

  const anomalies = data?.anomalies || [];
  const summary = data?.summary;

  const filteredAnomalies = anomalies.filter((a) => {
    if (selectedSeverity !== 'all' && a.severity !== selectedSeverity) return false;
    return true;
  });

  const getRuleIcon = (ruleCode: string) => {
    switch (ruleCode) {
      case 'SPLIT_PURCHASE':
        return <Split size={18} className="text-red-500" />;
      case 'PRICE_SPIKE':
        return <Percent size={18} className="text-amber-500" />;
      case 'INACTIVE_ASSET':
        return <Truck size={18} className="text-red-500" />;
      case 'OVERSTOCK_PURCHASE':
        return <Archive size={18} className="text-blue-500" />;
      default:
        return <AlertTriangle size={18} className="text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            CRÍTICO
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            ALTO RIESGO
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            MEDIO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 rounded-xl p-6 text-white shadow-md">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-red-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert size={16} />
            Radar Antifraude & Prevención de Mal Uso (Estándar Operacional Minero)
          </div>
          <h2 className="text-xl font-bold">Indicadores de Desviación & Integridad Operativa</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Algoritmos heurísticos continuos que detectan patrones irregulares en tiempo real: fraccionamiento deliberado
            de compras para eludir umbrales de aprobación, alzas anómalas de precios, pedidos cargados a maquinaria
            dada de baja y compras de repuestos sobrestockeados sin rotación.
          </p>
        </div>
      </div>

      {/* Filter and Severity Counts */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building size={18} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar por Faena:</span>
          <select
            value={selectedFaenaId}
            onChange={(e) => setSelectedFaenaId(e.target.value)}
            className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todas las faenas</option>
            {faenas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Severidad:</span>
          {['all', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                selectedSeverity === sev
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sev === 'all' ? 'Todas' : sev}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <span className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <FileWarning size={22} />
            </span>
            <div>
              <div className="text-2xl font-bold text-slate-900">{summary.totalAnomalies}</div>
              <p className="text-xs text-slate-500 font-medium">Anomalías Detectadas</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <span className="p-3 bg-red-50 text-red-600 rounded-xl">
              <AlertOctagon size={22} />
            </span>
            <div>
              <div className="text-2xl font-bold text-red-700">{summary.criticalCount}</div>
              <p className="text-xs text-slate-500 font-medium">Alertas Críticas</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle size={22} />
            </span>
            <div>
              <div className="text-2xl font-bold text-amber-700">{summary.highCount}</div>
              <p className="text-xs text-slate-500 font-medium">Alertas de Alto Riesgo</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Info size={22} />
            </span>
            <div>
              <div className="text-2xl font-bold text-blue-700">{summary.mediumCount}</div>
              <p className="text-xs text-slate-500 font-medium">Alertas Informativas / Medias</p>
            </div>
          </div>
        </div>
      )}

      {/* Anomalies List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          Ejecutando escaneo de integridad y reglas antifraude...
        </div>
      ) : filteredAnomalies.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 space-y-2">
          <CheckCircle size={36} className="text-emerald-500 mx-auto" />
          <h3 className="font-semibold text-slate-800">¡Sin anomalías detectadas!</h3>
          <p className="text-xs text-slate-400">
            No se han encontrado patrones de fraccionamiento, sobreprecio ni desvío de repuestos en el período analizado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`bg-white rounded-xl border p-5 shadow-sm space-y-4 transition-all ${
                anomaly.severity === 'CRITICAL'
                  ? 'border-red-200 hover:border-red-400'
                  : anomaly.severity === 'HIGH'
                  ? 'border-amber-200 hover:border-amber-400'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-slate-50 border border-slate-100 rounded-lg shrink-0 mt-0.5">
                    {getRuleIcon(anomaly.ruleCode)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{anomaly.title}</h4>
                      {getSeverityBadge(anomaly.severity)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Detectado:{' '}
                      {new Date(anomaly.detectedAt).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                {anomaly.description}
              </p>

              {/* Evidence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {anomaly.evidence.orders && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Órdenes Involucradas:
                    </span>
                    <div className="font-mono text-slate-900 font-medium">
                      {anomaly.evidence.orders.join(', ')}
                    </div>
                  </div>
                )}

                {anomaly.evidence.supplier && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Proveedor:
                    </span>
                    <div className="text-slate-900 font-medium">{anomaly.evidence.supplier}</div>
                  </div>
                )}

                {anomaly.evidence.asset && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Equipo Afectado:
                    </span>
                    <div className="text-slate-900 font-medium">{anomaly.evidence.asset}</div>
                  </div>
                )}

                {anomaly.evidence.items && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Repuestos / SKUs:
                    </span>
                    <div className="font-mono text-slate-900 font-medium">
                      {anomaly.evidence.items.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Auditor Action Box */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs flex items-start gap-2 text-indigo-900">
                <Eye size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Acción Recomendada para Auditor / Gerencia: </span>
                  <span>{anomaly.recommendedAction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
