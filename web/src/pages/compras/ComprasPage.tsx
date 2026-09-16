import { useState } from 'react';
import { ShoppingCart, FileText } from 'lucide-react';
import { PurchaseOrdersTab } from './tabs/PurchaseOrdersTab';
import { PurchaseRequestsTab } from './tabs/PurchaseRequestsTab';

export function ComprasPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestion de Compras</h1>
        <p className="text-slate-500 text-sm mt-1">
          Control de solicitudes, ordenes de compra, aprobaciones y recepciones en bodega
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart size={16} className="mr-2" />
          Ordenes de Compra
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={16} className="mr-2" />
          Solicitudes de Compra
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && <PurchaseOrdersTab />}
      {activeTab === 'requests' && <PurchaseRequestsTab />}
    </div>
  );
}
