import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Factory, Truck, Wrench, Box, ShoppingCart, Settings, X, Server } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';
import { Logo } from '../ui/Logo';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const APP_VERSION = 'v1.2.0';
export const BUILD_DATE = '2026.10.02';

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Faenas', path: '/faenas', icon: <Factory size={20} /> },
    { name: 'Flota', path: '/flota', icon: <Truck size={20} /> },
    { name: 'Mantenimiento', path: '/mantenimiento', icon: <Wrench size={20} /> },
    { name: 'Bodega', path: '/bodega', icon: <Box size={20} /> },
    { name: 'Compras', path: '/compras', icon: <ShoppingCart size={20} /> },
    { name: 'Administración', path: '/admin', icon: <Settings size={20} /> },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    if (isMobileOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen, onCloseMobile]);

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <ul className="space-y-1 px-3">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Version Footer */}
      <div className="p-4 mx-3 mb-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
          <span>SGMT Core</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-300 font-mono text-[10px]">
            {APP_VERSION}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Server size={12} className="text-emerald-400" />
          <span>LXC Contenedor 106</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          Build {BUILD_DATE} (Producción)
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 dark:bg-slate-950 text-white flex flex-col hidden md:flex border-r border-slate-800">
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <Logo size="sm" variant="full" textColor="text-white" />
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navContent}
        </nav>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación móvil"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-slate-900 dark:bg-slate-950 text-white flex flex-col h-full shadow-2xl z-10 transition-transform duration-200 ease-out border-r border-slate-800">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
              <Logo size="sm" variant="full" textColor="text-white" />
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Cerrar menú móvil"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              {navContent}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
