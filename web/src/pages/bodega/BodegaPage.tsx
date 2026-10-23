import { useState } from 'react';
import { Package, Building, Truck, ArrowRightLeft } from 'lucide-react';
import { BodegaCatalogTab } from './tabs/BodegaCatalogTab';
import { BodegaMovementsTab } from './tabs/BodegaMovementsTab';

export function BodegaPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'warehouses' | 'suppliers' | 'movements'>('items');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bodega e Inventario</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Gestión centralizada de repuestos, insumos, bodegas, movimientos y proveedores
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'items'
              ? 'border-primary-600 text-primary-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package size={16} className="mr-2" />
          Catálogo de Repuestos e Insumos
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'warehouses'
              ? 'border-primary-600 text-primary-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building size={16} className="mr-2" />
          Bodegas
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'suppliers'
              ? 'border-primary-600 text-primary-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck size={16} className="mr-2" />
          Proveedores
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'movements'
              ? 'border-primary-600 text-primary-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowRightLeft size={16} className="mr-2" />
          Movimientos y Control de Stock
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'items' && <BodegaCatalogTab type="items" />}
      {activeTab === 'warehouses' && <BodegaCatalogTab type="warehouses" />}
      {activeTab === 'suppliers' && <BodegaCatalogTab type="suppliers" />}
      {activeTab === 'movements' && <BodegaMovementsTab />}
    </div>
  );
}
