import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
        element: <div>Módulo Faenas</div>,
      },
      {
        path: 'flota',
        element: <div>Módulo Flota</div>,
      },
      {
        path: 'bodega',
        element: <div>Módulo Bodega</div>,
      },
      {
        path: 'compras',
        element: <div>Módulo Compras</div>,
      },
      {
        path: 'admin',
        element: <div>Módulo Administración</div>,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
