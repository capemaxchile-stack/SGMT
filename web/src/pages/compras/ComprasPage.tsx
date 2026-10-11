import { useState } from 'react';
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

export function ComprasPage() {
  const [activeTab, setActiveTab] = useState<
    'orders' | 'requests' | 'quotations' | 'pending' | 'budget' | 'suggestions' | 'audit'
  >('orders');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Abastecimiento & Compras</h1>
        <p className="text-slate-500 text-sm mt-1">
          Trazabilidad completa: Solicitudes de terreno, cotizaciones multimarca, aprobaciones jerárquicas, logística de garitas, control presupuestario y radar antifraude
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'border-primary-600 text-primary-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart size={16} className="mr-2" />
          Órdenes de Compra
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'requests'
              ? 'border-primary-600 text-primary-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={16} className="mr-2" />
          Solicitudes de Terreno
        </button>

        <button
          onClick={() => setActiveTab('quotations')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'quotations'
              ? 'border-primary-600 text-primary-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BadgePercent size={16} className="mr-2" />
          Cotizaciones & Catálogo Proveedores
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'pending'
              ? 'border-amber-600 text-amber-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertTriangle size={16} className="mr-2 text-amber-500" />
          Alertas Tránsito & Garitas
        </button>

        <button
          onClick={() => setActiveTab('budget')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'budget'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet size={16} className="mr-2 text-emerald-500" />
          Presupuesto & Gastos
        </button>

        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'suggestions'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles size={16} className="mr-2 text-indigo-500" />
          Sugerencias IA & Stock Crítico
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-red-600 text-red-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldAlert size={16} className="mr-2 text-red-500" />
          Radar Auditoría & Antifraude
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && <PurchaseOrdersTab />}
      {activeTab === 'requests' && <PurchaseRequestsTab />}
      {activeTab === 'quotations' && <QuotationsTab />}
      {activeTab === 'pending' && <PendingReceptionTab />}
      {activeTab === 'budget' && <BudgetControlTab />}
      {activeTab === 'suggestions' && <PurchaseSuggestionsTab />}
      {activeTab === 'audit' && <ProcurementAuditTab />}
    </div>
  );
}

