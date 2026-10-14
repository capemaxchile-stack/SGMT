import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
}

export function ProtectedRoute({ children, module }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const can = useAuthStore((state) => state.can);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (module && !can(module, 'read')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert size={26} />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Acceso Restringido</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
            Tu perfil de usuario no cuenta con atribuciones de acceso al módulo <strong>{module}</strong>.
          </p>
          <div className="mt-5 flex gap-2 justify-center">
            {can('DASHBOARD', 'read') ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-xs"
              >
                Ir al Dashboard
              </Link>
            ) : can('TERRENO', 'read') ? (
              <Link
                to="/terreno"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-xs"
              >
                Ir a App Terreno
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
