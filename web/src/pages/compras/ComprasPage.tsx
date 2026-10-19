import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  FileText,
  BadgePercent,
  AlertTriangle,
  Wallet,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { PurchaseOrdersTab } from './tabs/PurchaseOrdersTab';
import { PurchaseRequestsTab } from './tabs/PurchaseRequestsTab';
import { QuotationsTab } from './tabs/QuotationsTab';
import { PendingReceptionTab } from './tabs/PendingReceptionTab';
import { BudgetControlTab } from './tabs/BudgetControlTab';
import { PurchaseSuggestionsTab } from './tabs/PurchaseSuggestionsTab';
import { ProcurementAuditTab } from './tabs/ProcurementAuditTab';

type ComprasTabKey = 'orders' | 'requests' | 'quotations' | 'pending' | 'budget' | 'suggestions' | 'audit';

export function ComprasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ComprasTabKey | null;
  const validTabs: ComprasTabKey[] = ['orders', 'requests', 'quotations', 'pending', 'budget', 'suggestions', 'audit'];

  const [activeTab, setActiveTabState] = useState<ComprasTabKey>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'orders'
  );

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [tabParam]);

  const setActiveTab = (tab: ComprasTabKey) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const tabs: Array<{ id: ComprasTabKey; name: string; shortName: string; icon: React.ReactNode; color: string }> = [
    { id: 'orders', name: 'Órdenes de Compra', shortName: 'Órdenes', icon: <ShoppingCart size={16} />, color: 'text-primary-600' },
    { id: 'requests', name: 'Solicitudes de Terreno', shortName: 'Solicitudes', icon: <FileText size={16} />, color: 'text-primary-600' },
    { id: 'quotations', name: 'Cotizaciones & Proveedores', shortName: 'Cotizaciones', icon: <BadgePercent size={16} />, color: 'text-primary-600' },
    { id: 'pending', name: 'Alertas Garitas & Tránsito', shortName: 'Garitas', icon: <AlertTriangle size={16} />, color: 'text-amber-500' },
    { id: 'budget', name: 'Presupuesto & Gastos', shortName: 'Presupuestos', icon: <Wallet size={16} />, color: 'text-emerald-500' },
    { id: 'suggestions', name: 'Sugerencias IA & Stock', shortName: 'Sugerencias IA', icon: <Sparkles size={16} />, color: 'text-indigo-500' },
    { id: 'audit', name: 'Radar Antifraude', shortName: 'Antifraude', icon: <ShieldAlert size={16} />, color: 'text-red-500' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Abastecimiento & Compras</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Trazabilidad integral: Requerimientos en faena, cotizaciones comparativas, aprobaciones multinivel, logística de garitas y radar de integridad.
        </p>
      </div>

      {/* Mobile Selector Dropdown (sm:hidden) */}
      <div className="sm:hidden">
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
          Módulo de Compras:
        </label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as ComprasTabKey)}
          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop / Tablet Tabs (hidden sm:flex) */}
      <div className="hidden sm:flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center pb-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-semibold dark:border-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span className={`mr-2 ${tab.color}`}>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'orders' && <PurchaseOrdersTab />}
        {activeTab === 'requests' && <PurchaseRequestsTab />}
        {activeTab === 'quotations' && <QuotationsTab />}
        {activeTab === 'pending' && <PendingReceptionTab />}
        {activeTab === 'budget' && <BudgetControlTab />}
        {activeTab === 'suggestions' && <PurchaseSuggestionsTab />}
        {activeTab === 'audit' && <ProcurementAuditTab />}
      </div>
    </div>
  );
}
