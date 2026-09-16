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
        <h1 className="text-2xl font-bold text-slate-900">Bodega e Inventario</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestion centralizada de materiales, bodegas, movimientos y proveedores
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'items'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package size={16} className="mr-2" />
          Materiales e Insumos
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'warehouses'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building size={16} className="mr-2" />
          Bodegas
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'suppliers'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck size={16} className="mr-2" />
          Proveedores
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'movements'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowRightLeft size={16} className="mr-2" />
          Movimientos y Kardex
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
