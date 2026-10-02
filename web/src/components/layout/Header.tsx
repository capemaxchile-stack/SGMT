import { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore } from '../../stores/theme.store';
import { LogOut, Menu, Sun, Moon, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { UserProfileModal } from './UserProfileModal';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white -ml-1"
            aria-label="Abrir menú de navegación"
          >
            <Menu size={22} />
          </Button>
          <div className="font-semibold text-slate-800 dark:text-slate-200 hidden md:block">
            Sistema de Gestión Movimiento de Tierra
          </div>
          <div className="font-bold text-xl md:hidden text-primary-600 dark:text-blue-400 tracking-wider">
            SGMT
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label="Alternar tema de interfaz"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon size={18} className="text-slate-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* User Account Button */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Ver Perfil y Configuración de Cuenta"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <div className="font-medium text-slate-800 dark:text-slate-200">{user?.name || 'Usuario'}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {user?.roles?.[0] || 'Operador'}
              </div>
            </div>
            <Settings size={14} className="text-slate-400 hidden sm:block ml-1" />
          </button>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
            title="Cerrar sesión"
          >
            <LogOut size={18} className="sm:mr-1.5" />
            <span className="hidden md:inline">Salir</span>
          </Button>
        </div>
      </header>

      {/* User Account / Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
