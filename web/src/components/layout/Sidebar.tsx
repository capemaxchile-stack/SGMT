import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Factory,
  Truck,
  FileBadge,
  Wrench,
  Fuel,
  Box,
  ShoppingCart,
  Smartphone,
  BarChart3,
  BookOpen,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';
import { Logo } from '../ui/Logo';
import { useAuthStore } from '../../stores/auth.store';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const APP_VERSION = 'v1.6.1' as const;
export const BUILD_DATE = '2026.10.11' as const;

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { can } = useAuthStore();

  interface NavItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    module: string;
    end?: boolean;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Dashboard General', path: '/', icon: <LayoutDashboard size={18} />, module: 'DASHBOARD', end: true },
      ],
    },
    {
      title: 'Gestión Operativa',
      items: [
        { name: 'Compras & Abastecimiento', path: '/compras', icon: <ShoppingCart size={18} />, module: 'COMPRAS', end: true },
        { name: 'Pedidos Terreno (Móvil)', path: '/terreno', icon: <Smartphone size={18} />, module: 'TERRENO', end: true },
        { name: 'Bodega & Inventario', path: '/bodega', icon: <Box size={18} />, module: 'BODEGA' },
        { name: 'Mantenimiento & OTs', path: '/mantenimiento', icon: <Wrench size={18} />, module: 'MANTENIMIENTO' },
        { name: 'Combustible & Cargas', path: '/combustible', icon: <Fuel size={18} />, module: 'COMBUSTIBLE' },
      ],
    },
    {
      title: 'Control & Reportes',
      items: [
        { name: 'Certificaciones Flota', path: '/certificaciones', icon: <FileBadge size={18} />, module: 'CERTIFICACIONES' },
        { name: 'Reportes y Cierres', path: '/reportes', icon: <BarChart3 size={18} />, module: 'REPORTES' },
      ],
    },
    {
      title: 'Mantenedores',
      items: [
        { name: 'Faenas & Contratos', path: '/faenas', icon: <Factory size={18} />, module: 'FAENAS' },
        { name: 'Flota & Maquinaria', path: '/flota', icon: <Truck size={18} />, module: 'FLOTA' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { name: 'Manual & Operación', path: '/documentacion', icon: <BookOpen size={18} />, module: 'DOCUMENTACION' },
        { name: 'Configuración & Permisos', path: '/admin', icon: <Settings size={18} />, module: 'ADMINISTRACION' },
      ],
    },
  ];

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.module === 'PUBLIC' ? true : can(item.module, 'read')
      ),
    }))
    .filter((section) => section.items.length > 0);

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
      <div className="space-y-4 px-3">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-medium',
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      )
                    }
                  >
                    {item.icon}
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Corporate Footer */}
      <div className="p-4 mx-3 mb-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-300">
          <span>KATEI Plataforma Corporativa</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          Gestión Operativa & Abastecimiento
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
