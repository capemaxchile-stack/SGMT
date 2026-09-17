import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { FaenasPage } from './pages/faenas/FaenasPage';
import { FlotaPage } from './pages/flota/FlotaPage';
import { BodegaPage } from './pages/bodega/BodegaPage';
import { ComprasPage } from './pages/compras/ComprasPage';
import { AdminPage } from './pages/admin/AdminPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
        element: <DashboardPage />,
      },
      {
        path: 'faenas',
        element: <FaenasPage />,
      },
      {
        path: 'flota',
        element: <FlotaPage />,
      },
      {
        path: 'bodega',
        element: <BodegaPage />,
      },
      {
        path: 'compras',
        element: <ComprasPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
