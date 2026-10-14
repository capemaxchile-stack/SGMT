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
const TerrainRequestMobileView = lazy(() => import('./pages/compras/TerrainRequestMobileView').then(m => ({ default: m.TerrainRequestMobileView })));
const MantenimientoPage = lazy(() => import('./pages/mantenimiento/MantenimientoPage').then(m => ({ default: m.MantenimientoPage })));
const CombustiblePage = lazy(() => import('./pages/combustible/CombustiblePage').then(m => ({ default: m.CombustiblePage })));
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage').then(m => ({ default: m.ReportesPage })));
const DocumentacionPage = lazy(() => import('./pages/docs/DocumentacionPage').then(m => ({ default: m.DocumentacionPage })));
const CertificacionesPage = lazy(() => import('./pages/certificaciones/CertificacionesPage').then(m => ({ default: m.CertificacionesPage })));
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then(m => ({ default: m.AdminPage })));

const routeFallback = (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Spinner className="h-8 w-8 text-primary-600 animate-spin" />
      <span className="text-sm font-medium text-slate-500">Cargando módulo...</span>
    </div>
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={routeFallback}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/terreno',
    element: <ProtectedRoute module="TERRENO">{withSuspense(TerrainRequestMobileView)}</ProtectedRoute>,
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
        element: <ProtectedRoute module="DASHBOARD">{withSuspense(DashboardPage)}</ProtectedRoute>,
      },
      {
        path: 'dashboard',
        element: <ProtectedRoute module="DASHBOARD">{withSuspense(DashboardPage)}</ProtectedRoute>,
      },
      {
        path: 'faenas',
        element: <ProtectedRoute module="FAENAS">{withSuspense(FaenasPage)}</ProtectedRoute>,
      },
      {
        path: 'flota',
        element: <ProtectedRoute module="FLOTA">{withSuspense(FlotaPage)}</ProtectedRoute>,
      },
      {
        path: 'mantenimiento',
        element: <ProtectedRoute module="MANTENIMIENTO">{withSuspense(MantenimientoPage)}</ProtectedRoute>,
      },
      {
        path: 'combustible',
        element: <ProtectedRoute module="COMBUSTIBLE">{withSuspense(CombustiblePage)}</ProtectedRoute>,
      },
      {
        path: 'bodega',
        element: <ProtectedRoute module="BODEGA">{withSuspense(BodegaPage)}</ProtectedRoute>,
      },
      {
        path: 'compras',
        element: <ProtectedRoute module="COMPRAS">{withSuspense(ComprasPage)}</ProtectedRoute>,
      },
      {
        path: 'compras/terreno',
        element: <ProtectedRoute module="TERRENO">{withSuspense(TerrainRequestMobileView)}</ProtectedRoute>,
      },
      {
        path: 'reportes',
        element: <ProtectedRoute module="REPORTES">{withSuspense(ReportesPage)}</ProtectedRoute>,
      },
      {
        path: 'certificaciones',
        element: <ProtectedRoute module="CERTIFICACIONES">{withSuspense(CertificacionesPage)}</ProtectedRoute>,
      },
      {
        path: 'documentacion',
        element: <ProtectedRoute module="DOCUMENTACION">{withSuspense(DocumentacionPage)}</ProtectedRoute>,
      },
      {
        path: 'admin',
        element: <ProtectedRoute module="ADMINISTRACION">{withSuspense(AdminPage)}</ProtectedRoute>,
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(NotFoundPage),
  },
]);
