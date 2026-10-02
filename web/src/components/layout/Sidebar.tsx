import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Factory, Truck, Box, ShoppingCart, Settings, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Faenas', path: '/faenas', icon: <Factory size={20} /> },
    { name: 'Flota', path: '/flota', icon: <Truck size={20} /> },
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
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                isActive
                  ? 'bg-primary-600 text-white'
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
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar text-white flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-700 font-bold text-xl tracking-wider">
          SGMT
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-sidebar text-white flex flex-col h-full shadow-2xl z-10 transition-transform duration-200 ease-out">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700 font-bold text-xl tracking-wider">
              <span>SGMT</span>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
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
