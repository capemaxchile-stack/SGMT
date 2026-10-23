import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotDrawer } from '../copilot/CopilotDrawer';
import { CopilotFloatingButton } from '../copilot/CopilotFloatingButton';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore } from '../../stores/theme.store';

export function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const { can } = useAuthStore();
  const { copilotEnabled } = useThemeStore();
  const hasCopilotAccess = copilotEnabled && can('COPILOT', 'read');

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
