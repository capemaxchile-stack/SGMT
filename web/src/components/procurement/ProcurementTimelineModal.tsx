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
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800">Rechazado</span>;
    }
    if (status === 'IN_PROGRESS') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">En Curso</span>;
    }
    if (status === 'PENDING') {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-600">Pendiente</span>;
    }
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
        {badge || 'Completado'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Cargando trazabilidad...</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No hay eventos registrados</div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {events.map((evt, idx) => (
                <div key={idx} className="relative flex items-start gap-4 group">
                  {/* Dot / Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white shadow-xs ${
                      evt.status === 'COMPLETED'
                        ? 'border-emerald-500 text-emerald-600'
                        : evt.status === 'IN_PROGRESS'
                        ? 'border-amber-500 text-amber-600 ring-4 ring-amber-50'
                        : evt.status === 'REJECTED'
                        ? 'border-rose-500 text-rose-600'
                        : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    {getStepIcon(evt.phase, evt.status)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{evt.title}</h3>
                      {getStatusBadge(evt.status, evt.badge)}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{evt.description}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
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
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
