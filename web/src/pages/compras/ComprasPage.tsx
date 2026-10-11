import { useState } from 'react';
import { ShoppingCart, FileText, BadgePercent, AlertTriangle } from 'lucide-react';
import { PurchaseOrdersTab } from './tabs/PurchaseOrdersTab';
import { PurchaseRequestsTab } from './tabs/PurchaseRequestsTab';
import { QuotationsTab } from './tabs/QuotationsTab';
import { PendingReceptionTab } from './tabs/PendingReceptionTab';

export function ComprasPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'requests' | 'quotations' | 'pending'>('orders');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Abastecimiento & Compras</h1>
        <p className="text-slate-500 text-sm mt-1">
          Trazabilidad completa: Solicitudes de terreno, cotizaciones multimarca, aprobaciones jerárquicas, logística de garitas y recepción en bodega
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
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && <PurchaseOrdersTab />}
      {activeTab === 'requests' && <PurchaseRequestsTab />}
      {activeTab === 'quotations' && <QuotationsTab />}
      {activeTab === 'pending' && <PendingReceptionTab />}
    </div>
  );
}
