import { useAuthStore } from '../../stores/auth.store';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="font-semibold text-slate-800 hidden md:block">
        Sistema de Gestión
      </div>
      <div className="font-bold text-xl md:hidden text-primary-700 tracking-wider">
        SGMT
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <UserIcon size={16} />
          <span className="hidden sm:inline">{user?.name || 'Usuario'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-red-600">
          <LogOut size={18} className="sm:mr-2" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}
