import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Spinner } from './components/ui/Spinner';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const FaenasPage = lazy(() => import('./pages/faenas/FaenasPage').then(m => ({ default: m.FaenasPage })));
const FlotaPage = lazy(() => import('./pages/flota/FlotaPage').then(m => ({ default: m.FlotaPage })));
const BodegaPage = lazy(() => import('./pages/bodega/BodegaPage').then(m => ({ default: m.BodegaPage })));
const ComprasPage = lazy(() => import('./pages/compras/ComprasPage').then(m => ({ default: m.ComprasPage })));
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then(m => ({ default: m.AdminPage })));

function RouteFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8 text-primary-600 animate-spin" />
        <span className="text-sm font-medium text-slate-500">Cargando módulo...</span>
      </div>
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(DashboardPage),
      },
      {
        path: 'dashboard',
        element: withSuspense(DashboardPage),
      },
      {
        path: 'faenas',
        element: withSuspense(FaenasPage),
      },
      {
        path: 'flota',
        element: withSuspense(FlotaPage),
      },
      {
        path: 'bodega',
        element: withSuspense(BodegaPage),
      },
      {
        path: 'compras',
        element: withSuspense(ComprasPage),
      },
      {
        path: 'admin',
        element: withSuspense(AdminPage),
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(NotFoundPage),
  },
]);
