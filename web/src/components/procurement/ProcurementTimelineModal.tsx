import { CheckCircle2, Clock, XCircle, ShieldCheck, ShoppingCart, Truck, Warehouse, Package, X } from 'lucide-react';
import { TimelineEvent } from '../../types/compras';

interface ProcurementTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  events: TimelineEvent[];
  isLoading?: boolean;
}

export function ProcurementTimelineModal({
  isOpen,
  onClose,
  title,
  subtitle,
  events,
  isLoading,
}: ProcurementTimelineModalProps) {
  if (!isOpen) return null;

  const getStepIcon = (phase: string, status: TimelineEvent['status']) => {
    if (status === 'REJECTED') {
      return <XCircle className="w-5 h-5 text-rose-600" />;
    }
    if (status === 'PENDING') {
      return <Clock className="w-5 h-5 text-slate-400" />;
    }
    switch (phase) {
      case 'SOLICITUD':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'APROBACION':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'COTIZACIONES':
        return <ShoppingCart className="w-5 h-5 text-amber-600" />;
      case 'AUTORIZACION':
        return <ShieldCheck className="w-5 h-5 text-purple-600" />;
      case 'ORDEN_COMPRA':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'GARITA_TRANSITO':
        return <Truck className="w-5 h-5 text-indigo-600" />;
      case 'INGRESO_BODEGA':
      case 'ENTREGA_TERRENO':
        return <Warehouse className="w-5 h-5 text-emerald-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-primary-600" />;
    }
  };

  const getStatusBadge = (status: TimelineEvent['status'], badge?: string) => {
    if (status === 'REJECTED') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 dark:border dark:border-rose-800/80">Rechazado</span>;
    }
    if (status === 'IN_PROGRESS') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80">En Curso</span>;
    }
    if (status === 'PENDING') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border dark:border-slate-700">Pendiente</span>;
    }
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-800/80">
        {badge || 'Completado'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">Cargando trazabilidad...</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No hay eventos registrados</div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {events.map((evt, idx) => (
                <div key={idx} className="relative flex items-start gap-4 group">
                  {/* Dot / Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white dark:bg-slate-900 shadow-xs ${
                      evt.status === 'COMPLETED'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : evt.status === 'IN_PROGRESS'
                        ? 'border-amber-500 text-amber-600 dark:text-amber-400 ring-4 ring-amber-50 dark:ring-amber-950/40'
                        : evt.status === 'REJECTED'
                        ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                        : 'border-slate-300 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    {getStepIcon(evt.phase, evt.status)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{evt.title}</h3>
                      {getStatusBadge(evt.status, evt.badge)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{evt.description}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                      <span>{new Date(evt.timestamp).toLocaleString('es-CL')}</span>
                      {evt.meta?.items && (
                        <span>• {evt.meta.items.length} repuestos solicitados</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
