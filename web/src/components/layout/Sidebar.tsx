import { useState, useEffect } from 'react';
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
  Lock,
  Sparkles,
  Building2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Logo } from '../ui/Logo';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/auth.store';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const APP_VERSION = 'v1.6.1' as const;
export const BUILD_DATE = '2026.10.11' as const;

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { can, isModuleEnabled, getPlanTier, getTenantName } = useAuthStore();
  const [upgradeModalItem, setUpgradeModalItem] = useState<{ name: string; module: string } | null>(null);

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
              {section.items.map((item) => {
                const isLocked = !isModuleEnabled(item.module);

                if (isLocked) {
                  return (
                    <li key={item.path}>
                      <button
                        type="button"
                        onClick={() => {
                          setUpgradeModalItem({ name: item.name, module: item.module });
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 text-left group"
                        title="Disponible en Plan Superior"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="opacity-60">{item.icon}</span>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20">
                          <Lock size={10} />
                          Upgrade
                        </span>
                      </button>
                    </li>
                  );
                }

                return (
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
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Corporate Footer with Multi-Tenant Info */}
      <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-200">
          <div className="flex items-center gap-1.5 truncate max-w-[130px]">
            <Building2 size={13} className="text-blue-400 shrink-0" />
            <span className="truncate" title={getTenantName()}>{getTenantName()}</span>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
            {getPlanTier()}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          KATEI &bull; Gestión Operativa
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
      {/* Multi-Tenant Upgrade Modal */}
      {upgradeModalItem && (
        <Modal
          isOpen={!!upgradeModalItem}
          onClose={() => setUpgradeModalItem(null)}
          title="Herramienta en Plan Superior"
          size="md"
        >
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-sm">Módulo {upgradeModalItem.name}</div>
                <div className="text-xs text-amber-300/80">
                  Tu suscripción actual es <strong>{getPlanTier()}</strong>.
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Esta herramienta forma parte de un plan superior o requiere una activación personalizada para tu empresa.
            </p>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400">
              Para activar <strong>{upgradeModalItem.name}</strong> en tu cuenta, consulta con el administrador de tu empresa o solicita un cambio de plan a soporte.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setUpgradeModalItem(null)}>
                Cerrar
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  window.open(
                    `mailto:soporte@katei.cl?subject=Solicitud de Activación Módulo ${upgradeModalItem.name}&body=Hola,%0D%0A%0D%0ASolicitamos activar el módulo ${upgradeModalItem.name} para nuestra cuenta (${getTenantName()}).%0D%0AGracias.`,
                    '_blank'
                  );
                  setUpgradeModalItem(null);
                }}
              >
                Solicitar Activación
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
