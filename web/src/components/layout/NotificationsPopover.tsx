import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../api/notifications';
import {
  Bell,
  ShoppingCart,
  Box,
  Wrench,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  X,
} from 'lucide-react';

export function NotificationsPopover() {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'COMPRAS' | 'STOCK' | 'MANTENIMIENTO'>('ALL');
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sgmt_dismissed_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const allNotifications = data?.notifications || [];
  const activeNotifications = allNotifications.filter((n) => !dismissedIds.includes(n.id));

  const filteredNotifications = activeNotifications.filter((n) => {
    if (activeFilter === 'ALL') return true;
    return n.category === activeFilter;
  });

  const criticalCount = activeNotifications.filter((n) => n.priority === 'CRITICAL').length;
  const unreadCount = activeNotifications.length;

  const handleDismissAll = () => {
    const allIds = allNotifications.map((n) => n.id);
    setDismissedIds(allIds);
    try {
      localStorage.setItem('sgmt_dismissed_notifications', JSON.stringify(allIds));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismissOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('sgmt_dismissed_notifications', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (link: string) => {
    setIsOpen(false);
    navigate(link);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'COMPRAS':
        return <ShoppingCart size={15} className="text-amber-500" />;
      case 'STOCK':
        return <Box size={15} className="text-red-500" />;
      case 'MANTENIMIENTO':
        return <Wrench size={15} className="text-blue-500" />;
      default:
        return <AlertTriangle size={15} className="text-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertCircle size={10} />
            Crítico
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle size={10} />
            Alta
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Centro de Alertas y Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-black text-white ${
              criticalCount > 0
                ? 'bg-red-600 animate-pulse'
                : 'bg-amber-500'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Centro de Notificaciones
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  {unreadCount} activas
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleDismissAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCircle size={12} />
                Marcar leídas
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 p-2 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Todas ({activeNotifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('COMPRAS')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeFilter === 'COMPRAS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Compras
            </button>
            <button
              onClick={() => setActiveFilter('MANTENIMIENTO')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeFilter === 'MANTENIMIENTO'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Taller
            </button>
            <button
              onClick={() => setActiveFilter('STOCK')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                activeFilter === 'STOCK'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Bodega
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Cargando notificaciones en tiempo real...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="mx-auto text-emerald-500 mb-2" size={28} />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Todo al día
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No hay alertas ni acciones pendientes
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n.link)}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-2.5 group relative"
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {getCategoryIcon(n.category)}
                  </div>
                  <div className="flex-1 min-w-0 pr-5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </span>
                      {getPriorityBadge(n.priority)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
                      {n.description}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-1.5 group-hover:underline">
                      <span>Ir al módulo</span>
                      <ExternalLink size={10} />
                    </div>
                  </div>

                  {/* Dismiss Single */}
                  <button
                    type="button"
                    onClick={(e) => handleDismissOne(n.id, e)}
                    className="absolute top-2.5 right-2.5 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Descartar notificación"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
