import { useState } from 'react';
import { useItems, useWarehouses, useSuppliers } from '../../api/bodega';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Item, Warehouse, Supplier } from '../../types/models';
import { Search, Plus, Package, Building, Truck, Edit2 } from 'lucide-react';

export function BodegaPage() {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'WAREHOUSES' | 'SUPPLIERS'>('ITEMS');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: items, isLoading: isLoadingItems } = useItems();
  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const { data: suppliers, isLoading: isLoadingSuppliers } = useSuppliers();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const filteredItems = items?.filter(i => 
    i.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredWarehouses = warehouses?.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredSuppliers = suppliers?.filter(s => 
    s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rut.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const itemColumns = [
    { header: 'Código', cell: (item: Item) => <span className="font-medium text-slate-900">{item.code}</span> },
    { header: 'Descripción', accessorKey: 'description' as keyof Item },
    { header: 'Categoría', accessorKey: 'category' as keyof Item },
    { 
      header: 'Stock Actual', 
      cell: (item: Item) => (
        <span className={`font-medium ${item.currentStock <= item.minStock ? 'text-red-600' : 'text-green-600'}`}>
          {item.currentStock} {item.unit}
        </span>
      )
    },
    { 
      header: 'Acciones', 
      cell: () => (
        <Button variant="ghost" size="sm" title="Editar">
          <Edit2 size={16} />
        </Button>
      ) 
    }
  ];

  const warehouseColumns = [
    { header: 'Nombre', cell: (item: Warehouse) => <span className="font-medium text-slate-900">{item.name}</span> },
    { header: 'Tipo', accessorKey: 'type' as keyof Warehouse },
    { header: 'Ubicación', accessorKey: 'location' as keyof Warehouse },
    { 
      header: 'Acciones', 
      cell: () => (
        <Button variant="ghost" size="sm" title="Editar">
          <Edit2 size={16} />
        </Button>
      ) 
    }
  ];

  const supplierColumns = [
    { header: 'RUT', cell: (item: Supplier) => <span className="font-medium text-slate-900">{item.rut}</span> },
    { header: 'Razón Social', accessorKey: 'businessName' as keyof Supplier },
    { header: 'Contacto', cell: (item: Supplier) => (
      <div className="text-sm">
        <p>{item.contactName}</p>
        <p className="text-slate-500 text-xs">{item.phone}</p>
      </div>
    )},
    { header: 'Email', accessorKey: 'email' as keyof Supplier },
    { 
      header: 'Acciones', 
      cell: () => (
        <Button variant="ghost" size="sm" title="Editar">
          <Edit2 size={16} />
        </Button>
      ) 
    }
  ];

  const openActiveModal = () => {
    if (activeTab === 'ITEMS') setIsItemModalOpen(true);
    if (activeTab === 'WAREHOUSES') setIsWarehouseModalOpen(true);
    if (activeTab === 'SUPPLIERS') setIsSupplierModalOpen(true);
  };

  const getActiveTabTitle = () => {
    if (activeTab === 'ITEMS') return 'Nuevo Ítem';
    if (activeTab === 'WAREHOUSES') return 'Nueva Bodega';
    return 'Nuevo Proveedor';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bodega y Catálogos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de inventario, bodegas y proveedores</p>
        </div>
        <Button onClick={openActiveModal}>
          <Plus size={16} className="mr-2" />
          {getActiveTabTitle()}
        </Button>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'ITEMS', label: 'Ítems y Materiales', icon: Package },
            { id: 'WAREHOUSES', label: 'Bodegas', icon: Building },
            { id: 'SUPPLIERS', label: 'Proveedores', icon: Truck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchTerm('');
                }}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${isActive 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                `}
              >
                <Icon className={`mr-2 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-500'}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <Input 
          placeholder="Buscar..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search size={18} />}
          className="max-w-md"
        />
      </div>

      {activeTab === 'ITEMS' && (
        <DataTable data={filteredItems} columns={itemColumns} isLoading={isLoadingItems} />
      )}
      
      {activeTab === 'WAREHOUSES' && (
        <DataTable data={filteredWarehouses} columns={warehouseColumns} isLoading={isLoadingWarehouses} />
      )}
      
      {activeTab === 'SUPPLIERS' && (
        <DataTable data={filteredSuppliers} columns={supplierColumns} isLoading={isLoadingSuppliers} />
      )}

      {/* Item Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Nuevo Ítem">
        <div className="space-y-4 pt-4">
          <Input label="Código" placeholder="Ej: MAT-100" />
          <Input label="Descripción" placeholder="Ej: Filtro de Aceite" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Categoría" placeholder="Ej: Repuestos" />
            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Unidad de Medida</label>
              <select className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>UN (Unidad)</option>
                <option>KG (Kilogramos)</option>
                <option>LT (Litros)</option>
                <option>MT (Metros)</option>
              </select>
            </div>
          </div>
          <Input label="Stock Mínimo" type="number" placeholder="Ej: 10" />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsItemModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsItemModalOpen(false)}>Guardar Ítem</Button>
          </div>
        </div>
      </Modal>

      {/* Warehouse Modal */}
      <Modal isOpen={isWarehouseModalOpen} onClose={() => setIsWarehouseModalOpen(false)} title="Nueva Bodega">
        <div className="space-y-4 pt-4">
          <Input label="Nombre de Bodega" placeholder="Ej: Bodega Principal" />
          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Tipo</label>
            <select className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="CENTRAL">Central</option>
              <option value="FAENA">Faena</option>
            </select>
          </div>
          <Input label="Ubicación" placeholder="Ej: Santiago" />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsWarehouseModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsWarehouseModalOpen(false)}>Guardar Bodega</Button>
          </div>
        </div>
      </Modal>

      {/* Supplier Modal */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Nuevo Proveedor">
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="RUT" placeholder="Ej: 76.123.456-7" />
            <Input label="Razón Social" placeholder="Ej: Comercializadora SPA" />
          </div>
          <Input label="Contacto Principal" placeholder="Ej: Juan Pérez" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono" placeholder="Ej: +56912345678" />
            <Input label="Email" type="email" placeholder="Ej: contacto@empresa.cl" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsSupplierModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsSupplierModalOpen(false)}>Guardar Proveedor</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
