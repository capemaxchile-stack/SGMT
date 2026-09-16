import { useState } from 'react';
import {
  useItems,
  useWarehouses,
  useSuppliers,
  useCreateItem,
  useCreateWarehouse,
  useCreateSupplier,
} from '../../api/bodega';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Item, Warehouse, Supplier, WarehouseType } from '../../types/models';
import { Search, Plus, Package, Building, Truck } from 'lucide-react';

export function BodegaPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'warehouses' | 'suppliers'>('items');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form: Item
  const [itemCode, setItemCode] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategory, setItemCategory] = useState('REPUESTO');
  const [itemUnit, setItemUnit] = useState('UN');
  const [itemMinStock, setItemMinStock] = useState<number>(0);

  // Form: Warehouse
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [warehouseType, setWarehouseType] = useState<WarehouseType>('CENTRAL');

  // Form: Supplier
  const [supplierRut, setSupplierRut] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  // API Hooks
  const { data: items, isLoading: loadingItems } = useItems();
  const { data: warehouses, isLoading: loadingWarehouses } = useWarehouses();
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();

  const createItemMutation = useCreateItem();
  const createWarehouseMutation = useCreateWarehouse();
  const createSupplierMutation = useCreateSupplier();

  // Item Submit
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !itemDescription.trim()) {
      setErrorMsg('El código y la descripción son obligatorios.');
      return;
    }
    try {
      await createItemMutation.mutateAsync({
        code: itemCode.trim().toUpperCase(),
        description: itemDescription.trim(),
        category: itemCategory.trim().toUpperCase(),
        unitOfMeasure: itemUnit,
        minimumStock: Number(itemMinStock) || 0,
      });
      setIsItemModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al guardar el ítem.');
    }
  };

  // Warehouse Submit
  const handleWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseName.trim() || !warehouseLocation.trim()) {
      setErrorMsg('Nombre y ubicación son obligatorios.');
      return;
    }
    try {
      await createWarehouseMutation.mutateAsync({
        name: warehouseName.trim(),
        location: warehouseLocation.trim(),
        type: warehouseType,
      });
      setIsWarehouseModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al guardar la bodega.');
    }
  };

  // Supplier Submit
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierRut.trim() || !supplierName.trim()) {
      setErrorMsg('RUT y Razón Social son obligatorios.');
      return;
    }
    try {
      await createSupplierMutation.mutateAsync({
        rut: supplierRut.trim().toUpperCase(),
        businessName: supplierName.trim(),
        contactName: supplierContact.trim() || undefined,
        contactPhone: supplierPhone.trim() || undefined,
        contactEmail: supplierEmail.trim() || undefined,
        address: supplierAddress.trim() || undefined,
      });
      setIsSupplierModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al guardar el proveedor.');
    }
  };

  // Filtered lists
  const filteredItems =
    items?.filter(
      (i) =>
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const filteredWarehouses =
    warehouses?.filter(
      (w) =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.location.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const filteredSuppliers =
    suppliers?.filter(
      (s) =>
        s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rut.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bodega y Catálogos</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestión centralizada de materiales, bodegas y proveedores
          </p>
        </div>
        <div>
          {activeTab === 'items' && (
            <Button
              onClick={() => {
                setItemCode('');
                setItemDescription('');
                setItemCategory('REPUESTO');
                setItemUnit('UN');
                setItemMinStock(0);
                setErrorMsg('');
                setIsItemModalOpen(true);
              }}
            >
              <Plus size={16} className="mr-2" /> Nuevo Material
            </Button>
          )}
          {activeTab === 'warehouses' && (
            <Button
              onClick={() => {
                setWarehouseName('');
                setWarehouseLocation('');
                setWarehouseType('CENTRAL');
                setErrorMsg('');
                setIsWarehouseModalOpen(true);
              }}
            >
              <Plus size={16} className="mr-2" /> Nueva Bodega
            </Button>
          )}
          {activeTab === 'suppliers' && (
            <Button
              onClick={() => {
                setSupplierRut('');
                setSupplierName('');
                setSupplierContact('');
                setSupplierPhone('');
                setSupplierEmail('');
                setSupplierAddress('');
                setErrorMsg('');
                setIsSupplierModalOpen(true);
              }}
            >
              <Plus size={16} className="mr-2" /> Nuevo Proveedor
            </Button>
          )}
        </div>
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
          Materiales e Insumos ({items?.length || 0})
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
          Bodegas ({warehouses?.length || 0})
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
          Proveedores ({suppliers?.length || 0})
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <Input
          placeholder={`Buscar en ${
            activeTab === 'items'
              ? 'materiales...'
              : activeTab === 'warehouses'
              ? 'bodegas...'
              : 'proveedores...'
          }`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search size={18} />}
        />
      </div>

      {/* Tab: Items */}
      {activeTab === 'items' && (
        <DataTable
          data={filteredItems}
          columns={[
            {
              header: 'Código',
              cell: (i: Item) => (
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                  {i.code}
                </span>
              ),
            },
            {
              header: 'Descripción',
              cell: (i: Item) => <span className="font-medium text-slate-800">{i.description}</span>,
            },
            {
              header: 'Categoría',
              cell: (i: Item) => (
                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                  {i.category}
                </span>
              ),
            },
            {
              header: 'Unidad',
              cell: (i: Item) => <span className="text-slate-600 text-sm">{i.unitOfMeasure}</span>,
            },
            {
              header: 'Stock Mínimo',
              cell: (i: Item) => <span className="text-slate-600 text-sm">{i.minimumStock}</span>,
            },
          ]}
          isLoading={loadingItems}
          emptyMessage="No hay materiales o insumos registrados"
        />
      )}

      {/* Tab: Warehouses */}
      {activeTab === 'warehouses' && (
        <DataTable
          data={filteredWarehouses}
          columns={[
            {
              header: 'Nombre de Bodega',
              cell: (w: Warehouse) => <span className="font-semibold text-slate-900">{w.name}</span>,
            },
            {
              header: 'Tipo',
              cell: (w: Warehouse) => (
                <span
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    w.type === 'CENTRAL'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {w.type === 'CENTRAL' ? 'Central' : 'En Faena'}
                </span>
              ),
            },
            {
              header: 'Ubicación',
              cell: (w: Warehouse) => <span className="text-slate-600 text-sm">{w.location}</span>,
            },
          ]}
          isLoading={loadingWarehouses}
          emptyMessage="No hay bodegas registradas"
        />
      )}

      {/* Tab: Suppliers */}
      {activeTab === 'suppliers' && (
        <DataTable
          data={filteredSuppliers}
          columns={[
            {
              header: 'RUT',
              cell: (s: Supplier) => (
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                  {s.rut}
                </span>
              ),
            },
            {
              header: 'Razón Social',
              cell: (s: Supplier) => <span className="font-medium text-slate-900">{s.businessName}</span>,
            },
            {
              header: 'Contacto',
              cell: (s: Supplier) => (
                <div className="text-xs text-slate-700">
                  <p className="font-medium">{s.contactName || 'N/A'}</p>
                  <p className="text-slate-500">{s.contactEmail}</p>
                </div>
              ),
            },
            {
              header: 'Teléfono',
              cell: (s: Supplier) => <span className="text-slate-600 text-sm">{s.contactPhone || 'N/A'}</span>,
            },
          ]}
          isLoading={loadingSuppliers}
          emptyMessage="No hay proveedores registrados"
        />
      )}

      {/* Modal: Item */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Nuevo Material">
        <form onSubmit={handleItemSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código *"
              placeholder="Ej: ITM-006"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              required
            />
            <Input
              label="Categoría *"
              placeholder="Ej: REPUESTO, LUBRICANTE, etc."
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
              required
            />
          </div>

          <Input
            label="Descripción *"
            placeholder="Ej: Filtro de Petróleo Primario"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Unidad de Medida *</label>
              <select
                value={itemUnit}
                onChange={(e) => setItemUnit(e.target.value)}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UN">UN (Unidad)</option>
                <option value="L">L (Litros)</option>
                <option value="KG">KG (Kilogramos)</option>
                <option value="MT">MT (Metros)</option>
                <option value="GL">GL (Galones)</option>
              </select>
            </div>
            <Input
              label="Stock Mínimo"
              type="number"
              value={itemMinStock}
              onChange={(e) => setItemMinStock(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createItemMutation.isPending}>
              Guardar Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Warehouse */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title="Nueva Bodega"
      >
        <form onSubmit={handleWarehouseSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <Input
            label="Nombre de Bodega *"
            placeholder="Ej: Bodega Faena Pelambres"
            value={warehouseName}
            onChange={(e) => setWarehouseName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Tipo *</label>
              <select
                value={warehouseType}
                onChange={(e) => setWarehouseType(e.target.value as WarehouseType)}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CENTRAL">Central</option>
                <option value="FAENA">En Faena</option>
              </select>
            </div>
            <Input
              label="Ubicación *"
              placeholder="Ej: Salamanca, Región de Coquimbo"
              value={warehouseLocation}
              onChange={(e) => setWarehouseLocation(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsWarehouseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createWarehouseMutation.isPending}>
              Guardar Bodega
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Supplier */}
      <Modal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title="Nuevo Proveedor"
      >
        <form onSubmit={handleSupplierSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="RUT *"
              placeholder="Ej: 76.123.456-7"
              value={supplierRut}
              onChange={(e) => setSupplierRut(e.target.value)}
              required
            />
            <Input
              label="Razón Social *"
              placeholder="Ej: Distribuidora Lubricantes SPA"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre de Contacto"
              placeholder="Ej: Juan Pérez"
              value={supplierContact}
              onChange={(e) => setSupplierContact(e.target.value)}
            />
            <Input
              label="Teléfono"
              placeholder="Ej: +56 9 1234 5678"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email de Contacto"
              type="email"
              placeholder="Ej: ventas@proveedor.cl"
              value={supplierEmail}
              onChange={(e) => setSupplierEmail(e.target.value)}
            />
            <Input
              label="Dirección"
              placeholder="Ej: Av. Industrial 1234"
              value={supplierAddress}
              onChange={(e) => setSupplierAddress(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsSupplierModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createSupplierMutation.isPending}>
              Guardar Proveedor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
