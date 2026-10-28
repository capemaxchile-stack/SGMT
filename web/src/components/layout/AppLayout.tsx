import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Eye, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotDrawer } from '../copilot/CopilotDrawer';
import { CopilotFloatingButton } from '../copilot/CopilotFloatingButton';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore } from '../../stores/theme.store';

export function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const navigate = useNavigate();
  const { can, isModuleEnabled, isImpersonating, stopImpersonating, getTenantName } = useAuthStore();
  const { copilotEnabled } = useThemeStore();
  const hasCopilotAccess = copilotEnabled && isModuleEnabled('COPILOT') && can('COPILOT', 'read');

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K to toggle Copilot
  useEffect(() => {
    if (!hasCopilotAccess) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isCopilotOpen) {
        setIsCopilotOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCopilotOpen, hasCopilotAccess]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Impersonation / Monitoring Active Banner */}
        {isImpersonating() && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-30 shrink-0 border-b border-amber-600">
            <div className="flex items-center gap-2 truncate">
              <span className="flex h-2 w-2 rounded-full bg-slate-950 animate-ping" />
              <Eye size={16} className="text-slate-950 shrink-0" />
              <span className="truncate">
                MODO MONITOREO ACTIVO &bull; Estás visualizando la plataforma del cliente:{' '}
                <strong className="underline uppercase tracking-wide">{getTenantName()}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                stopImpersonating();
                navigate('/super-admin');
              }}
              className="ml-3 shrink-0 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <ArrowLeft size={13} />
              <span>Salir del Monitoreo</span>
            </button>
          </div>
        )}
        <Header
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onOpenCopilot={() => hasCopilotAccess && setIsCopilotOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Copilot Floating Trigger Button (governed by COPILOT permission) */}
      {hasCopilotAccess && <CopilotFloatingButton onClick={() => setIsCopilotOpen(true)} />}

      {/* Copilot Drawer Panel */}
      {hasCopilotAccess && (
        <CopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
        />
      )}
    </div>
  );
}
