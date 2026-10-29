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
  Sparkles,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
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

interface PlanOption {
  tier: 'PRO' | 'ENTERPRISE';
  name: string;
  badge: string;
  tagline: string;
  highlights: string[];
  recommended?: boolean;
}

const UPGRADE_PLANS: PlanOption[] = [
  {
    tier: 'PRO',
    name: 'Plan Profesional (PRO)',
    badge: 'Recomendado',
    tagline: 'Ideal para empresas en crecimiento con gestión activa de almacén, equipos y faenas.',
    highlights: [
      'Bodega e Inventario de Materiales',
      'Mantenimiento Preventivo y Correctivo (OTs)',
      'Control de Cargas de Combustible en Terreno',
      'Pedidos Terreno desde App Móvil PWA',
      'Control Documental y Certificaciones de Flota',
    ],
    recommended: true,
  },
  {
    tier: 'ENTERPRISE',
    name: 'Plan Enterprise Corporativo',
    badge: 'Máxima Potencia',
    tagline: 'Para operaciones a gran escala con Inteligencia Artificial y cadena de abastecimiento completa.',
    highlights: [
      'Todo lo incluido en el Plan PRO',
      'Módulo Integral de Compras & Abastecimiento',
      'Copilot IA: Asistente Operacional Inteligente',
      'Reportes Ejecutivos Avanzados & Cierres Contables',
      'Soporte Dedicado Prioritario y Onboarding',
    ],
  },
];

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const { can, isModuleEnabled, getPlanTier, getTenantName, hasRole, isImpersonating } = useAuthStore();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('katei_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('katei_sidebar_collapsed', String(next));
      return next;
    });
  };

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
        { name: 'Bodega & Inventario', path: '/bodega', icon: <Box size={18} />, module: 'BODEGA' },
        { name: 'Mantenimiento & OTs', path: '/mantenimiento', icon: <Wrench size={18} />, module: 'MANTENIMIENTO' },
        { name: 'Combustible & Cargas', path: '/combustible', icon: <Fuel size={18} />, module: 'COMBUSTIBLE' },
        { name: 'Pedidos Terreno (Móvil)', path: '/terreno', icon: <Smartphone size={18} />, module: 'TERRENO', end: true },
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
      title: 'Control & Reportes',
      items: [
        { name: 'Certificaciones Flota', path: '/certificaciones', icon: <FileBadge size={18} />, module: 'CERTIFICACIONES' },
        { name: 'Reportes y Cierres', path: '/reportes', icon: <BarChart3 size={18} />, module: 'REPORTES' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { name: 'Manual & Operación', path: '/documentacion', icon: <BookOpen size={18} />, module: 'DOCUMENTACION' },
        { name: 'Configuración & Permisos', path: '/admin', icon: <Settings size={18} />, module: 'ADMINISTRACION' },
      ],
    },
    ...(hasRole('SUPER_USUARIO') && !isImpersonating()
      ? [
          {
            title: 'Control Maestro',
            items: [
              {
                name: 'Portal Maestro SaaS',
                path: '/super-admin',
                icon: <Building2 size={18} />,
                module: 'PUBLIC',
              },
            ],
          },
        ]
      : []),
  ];

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.module === 'PUBLIC') return true;
        return isModuleEnabled(item.module) && can(item.module, 'read');
      }),
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

  const handleRequestUpgrade = (targetTier: string, targetPlanName: string) => {
    const tenantName = getTenantName();
    const currentPlan = getPlanTier();
    const subject = encodeURIComponent(`Solicitud de Upgrade a Plan ${targetTier} - ${tenantName}`);
    const body = encodeURIComponent(
      `Hola equipo comercial KATEI,\n\n` +
      `Solicitamos cotización y activación para actualizar nuestra suscripción en la plataforma KATEI:\n\n` +
      `• Empresa: ${tenantName}\n` +
      `• Plan Actual: ${currentPlan}\n` +
      `• Plan Solicitado: ${targetPlanName} (${targetTier})\n\n` +
      `Favor contactarnos para coordinar condiciones comerciales y habilitación de módulos.\n\n` +
      `Saludos,\n` +
      `${tenantName}`
    );
    window.open(`mailto:soporte@katei.cl?subject=${subject}&body=${body}`, '_blank');
    setIsUpgradeModalOpen(false);
  };

  const currentTier = getPlanTier();
  const availablePlans = UPGRADE_PLANS.filter((p) => {
    if (currentTier === 'BASICO') return true;
    if (currentTier === 'PRO') return p.tier === 'ENTERPRISE';
    return false;
  });

  const renderNavContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full justify-between">
      <div className={cn("space-y-4", collapsed ? "px-2" : "px-3")}>
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {collapsed ? (
              <div className="my-2 border-t border-slate-800/80 mx-1" title={section.title} />
            ) : (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    title={collapsed ? item.name : undefined}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg transition-colors text-xs font-medium',
                        collapsed ? 'justify-center p-2.5 my-0.5' : 'gap-2.5 px-3 py-2',
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm font-semibold shadow-emerald-950/40'
                          : 'text-slate-300 hover:bg-[#141c19] hover:text-white'
                      )
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Corporate Footer */}
      {collapsed ? (
        <div className="p-2 mx-1 mb-2 flex flex-col items-center gap-2 rounded-xl bg-[#0f1513] border border-[#1e2925]">
          <div
            className="p-1 rounded text-emerald-400 hover:bg-[#141c19] transition cursor-help"
            title={`${getTenantName()} (Plan ${currentTier})`}
          >
            <Building2 size={16} />
          </div>
          {currentTier !== 'ENTERPRISE' && (
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 transition"
              title="Mejorar Plan (Upgrade)"
              aria-label="Mejorar Plan (Upgrade)"
            >
              <Sparkles size={14} className="text-amber-400" />
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 mx-3 mb-3 rounded-xl bg-[#0f1513] border border-[#1e2925] text-slate-400 text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold text-slate-200">
            <div className="flex items-center gap-1.5 truncate max-w-[130px]">
              <Building2 size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate" title={getTenantName()}>{getTenantName()}</span>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              {currentTier}
            </span>
          </div>

          {currentTier !== 'ENTERPRISE' && (
            <button
              type="button"
              onClick={() => {
                setIsUpgradeModalOpen(true);
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition shadow-xs cursor-pointer"
            >
              <Sparkles size={12} className="text-amber-400" />
              <span>Mejorar Plan (Upgrade)</span>
            </button>
          )}

          <div className="text-[10px] text-slate-400 text-center">
            KATEI &bull; Gestión Operativa
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 bg-[#0b100e] text-white flex flex-col hidden md:flex border-r border-[#1e2925] transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div
          className={cn(
            'h-16 flex items-center border-b border-[#1e2925] transition-all px-3 shrink-0',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg hover:bg-[#141c19] transition text-slate-300 hover:text-white"
              title="Expandir menú lateral"
              aria-label="Expandir menú lateral"
            >
              <Logo size="sm" variant="icon" />
            </button>
          ) : (
            <>
              <Logo size="sm" variant="full" textColor="text-white" />
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141c19] transition-colors"
                title="Contraer menú lateral"
                aria-label="Contraer menú lateral"
              >
                <ChevronLeft size={18} />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 overflow-x-hidden">
          {renderNavContent(isCollapsed)}
        </nav>

        {/* Desktop Expand/Collapse Bottom Bar */}
        <div className="border-t border-[#1e2925] p-2 shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              'w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#141c19] transition-colors text-xs font-medium cursor-pointer',
              !isCollapsed && 'gap-2'
            )}
            title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Contraer menú</span>
              </>
            )}
          </button>
        </div>
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
          <aside className="relative w-64 max-w-[80vw] bg-[#0b100e] text-white flex flex-col h-full shadow-2xl z-10 transition-transform duration-200 ease-out border-r border-[#1e2925]">
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#1e2925] shrink-0">
              <Logo size="sm" variant="full" textColor="text-white" />
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141c19] transition-colors"
                aria-label="Cerrar menú móvil"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              {renderNavContent(false)}
            </nav>
          </aside>
        </div>
      )}

      {/* Multi-Tenant Upgrade Plan Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Escalar Plan KATEI"
        size={availablePlans.length > 1 ? '2xl' : 'lg'}
      >
        <div className="space-y-5 py-1">
          {/* Active Subscription Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Empresa y Suscripción Actual:</div>
              <div className="font-bold text-sm text-slate-100 flex items-center gap-2 mt-0.5">
                <span>{getTenantName()}</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                  Plan {currentTier}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 hidden sm:block">
              Potencia tu gestión operativa y flota
            </div>
          </div>

          {/* Available Higher Plans Grid */}
          <div
            className={cn(
              'grid gap-4',
              availablePlans.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            )}
          >
            {availablePlans.map((plan) => (
              <div
                key={plan.tier}
                className={cn(
                  'relative rounded-xl p-5 border flex flex-col justify-between transition-all',
                  plan.recommended
                    ? 'bg-slate-900/90 border-blue-500/50 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/20'
                    : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                )}
              >
                {plan.recommended && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                    {plan.badge}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-white">{plan.name}</h3>
                    {!plan.recommended && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {plan.tagline}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold uppercase text-slate-300 tracking-wider">
                      Módulos incluidos:
                    </div>
                    <ul className="space-y-1.5">
                      {plan.highlights.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-800/80">
                  <Button
                    className={cn(
                      'w-full text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer',
                      plan.recommended
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm'
                    )}
                    onClick={() => handleRequestUpgrade(plan.tier, plan.name)}
                  >
                    <span>Solicitar Plan {plan.tier}</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Help & Direct Contact Footer */}
          <div className="text-center pt-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-400">
              ¿Requieres un paquete a la medida o módulos específicos? Escríbenos a{' '}
              <a
                href="mailto:soporte@katei.cl"
                className="text-blue-400 underline font-medium hover:text-blue-300"
              >
                soporte@katei.cl
              </a>{' '}
              o contacta a tu ejecutivo de cuentas.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
