import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Factory, Truck, Box, ShoppingCart, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Faenas', path: '/faenas', icon: <Factory size={20} /> },
    { name: 'Flota', path: '/flota', icon: <Truck size={20} /> },
    { name: 'Bodega', path: '/bodega', icon: <Box size={20} /> },
    { name: 'Compras', path: '/compras', icon: <ShoppingCart size={20} /> },
    { name: 'Administración', path: '/admin', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-sidebar text-white flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-slate-700 font-bold text-xl tracking-wider">
        SGMT
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
