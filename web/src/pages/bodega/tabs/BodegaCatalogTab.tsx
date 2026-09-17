import { useState } from 'react';
import {
  useItems,
  useWarehouses,
  useSuppliers,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '../../../api/bodega';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { Item, Warehouse, Supplier, WarehouseType, ITEM_CATEGORIES } from '../../../types/models';
import { Search, Plus, Edit2, Trash2, AlertCircle, Filter } from 'lucide-react';

interface BodegaCatalogTabProps {
  type: 'items' | 'warehouses' | 'suppliers';
}

export function BodegaCatalogTab({ type }: BodegaCatalogTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODOS');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected for Edit / Delete
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

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
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();

  const createWarehouseMutation = useCreateWarehouse();
  const updateWarehouseMutation = useUpdateWarehouse();
  const deleteWarehouseMutation = useDeleteWarehouse();

  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Handlers: Open Create
  const handleOpenCreate = () => {
    setErrorMsg('');
    if (type === 'items') {
      setItemCode('');
      setItemDescription('');
      setItemCategory('REPUESTO');
      setItemUnit('UN');
      setItemMinStock(0);
    } else if (type === 'warehouses') {
      setWarehouseName('');
      setWarehouseLocation('');
      setWarehouseType('CENTRAL');
    } else {
      setSupplierRut('');
      setSupplierName('');
      setSupplierContact('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierAddress('');
    }
    setIsCreateModalOpen(true);
  };

  // Handlers: Open Edit
  const handleOpenEdit = (record: any) => {
    setErrorMsg('');
    if (type === 'items') {
      setSelectedItem(record);
      setItemCode(record.code);
      setItemDescription(record.description);
      setItemCategory(record.category);
      setItemUnit(record.unitOfMeasure);
      setItemMinStock(record.minimumStock);
    } else if (type === 'warehouses') {
      setSelectedWarehouse(record);
      setWarehouseName(record.name);
      setWarehouseLocation(record.location);
      setWarehouseType(record.type);
    } else {
      setSelectedSupplier(record);
      setSupplierRut(record.rut);
      setSupplierName(record.businessName);
      setSupplierContact(record.contactName || '');
      setSupplierPhone(record.contactPhone || '');
      setSupplierEmail(record.contactEmail || '');
      setSupplierAddress(record.address || '');
    }
    setIsEditModalOpen(true);
  };

  // Handlers: Open Delete
  const handleOpenDelete = (record: any) => {
    setErrorMsg('');
    if (type === 'items') setSelectedItem(record);
    if (type === 'warehouses') setSelectedWarehouse(record);
    if (type === 'suppliers') setSelectedSupplier(record);
    setIsDeleteModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type === 'items') {
        await createItemMutation.mutateAsync({
          code: itemCode.trim().toUpperCase(),
          description: itemDescription.trim(),
          category: itemCategory.trim().toUpperCase(),
          unitOfMeasure: itemUnit,
          minimumStock: Number(itemMinStock) || 0,
        });
      } else if (type === 'warehouses') {
        await createWarehouseMutation.mutateAsync({
          name: warehouseName.trim(),
          location: warehouseLocation.trim(),
          type: warehouseType,
        });
      } else {
        await createSupplierMutation.mutateAsync({
          rut: supplierRut.trim().toUpperCase(),
          businessName: supplierName.trim(),
          contactName: supplierContact.trim() || undefined,
          contactPhone: supplierPhone.trim() || undefined,
          contactEmail: supplierEmail.trim() || undefined,
          address: supplierAddress.trim() || undefined,
        });
      }
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al crear el registro.');
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type === 'items' && selectedItem) {
        await updateItemMutation.mutateAsync({
          id: selectedItem.id,
          payload: {
            code: itemCode.trim().toUpperCase(),
            description: itemDescription.trim(),
            category: itemCategory.trim().toUpperCase(),
            unitOfMeasure: itemUnit,
            minimumStock: Number(itemMinStock) || 0,
          },
        });
      } else if (type === 'warehouses' && selectedWarehouse) {
        await updateWarehouseMutation.mutateAsync({
          id: selectedWarehouse.id,
          payload: {
            name: warehouseName.trim(),
            location: warehouseLocation.trim(),
            type: warehouseType,
          },
        });
      } else if (type === 'suppliers' && selectedSupplier) {
        await updateSupplierMutation.mutateAsync({
          id: selectedSupplier.id,
          payload: {
            rut: supplierRut.trim().toUpperCase(),
            businessName: supplierName.trim(),
            contactName: supplierContact.trim() || undefined,
            contactPhone: supplierPhone.trim() || undefined,
            contactEmail: supplierEmail.trim() || undefined,
            address: supplierAddress.trim() || undefined,
          },
        });
      }
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al actualizar el registro.');
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    try {
      if (type === 'items' && selectedItem) {
        await deleteItemMutation.mutateAsync(selectedItem.id);
      } else if (type === 'warehouses' && selectedWarehouse) {
        await deleteWarehouseMutation.mutateAsync(selectedWarehouse.id);
      } else if (type === 'suppliers' && selectedSupplier) {
        await deleteSupplierMutation.mutateAsync(selectedSupplier.id);
      }
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al eliminar el registro.');
    }
  };

  // Filtered
  const filteredItems = (items || []).filter(
    (i) => {
      const matchesSearch = i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'TODOS' || i.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }
  );

  const filteredWarehouses = (warehouses || []).filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = (suppliers || []).filter(
    (s) =>
      s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {type === 'items' ? 'Catalogo de Materiales e Insumos' : type === 'warehouses' ? 'Listado de Bodegas' : 'Directorio de Proveedores'}
          </h2>
          <p className="text-slate-500 text-sm">
            {type === 'items'
              ? 'Administracion de repuestos, lubricantes y combustibles'
              : type === 'warehouses'
              ? 'Bodegas centrales y de faena'
              : 'Proveedores autorizados con RUT'}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus size={16} className="mr-2" />
          {type === 'items' ? 'Nuevo Material' : type === 'warehouses' ? 'Nueva Bodega' : 'Nuevo Proveedor'}
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        {type === 'items' && (
          <div className="w-full sm:w-64">
            <div className="flex items-center gap-2 mb-1">
              <Filter size={16} className="text-slate-500" />
              <label className="text-sm font-medium text-slate-700">Filtrar por Categoria</label>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todas las Categorías</option>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {type === 'items' && (
        <DataTable
          data={filteredItems}
          columns={[
            {
              header: 'Codigo',
              cell: (i: Item) => (
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                  {i.code}
                </span>
              ),
            },
            {
              header: 'Descripcion',
              cell: (i: Item) => <span className="font-medium text-slate-800">{i.description}</span>,
            },
            {
              header: 'Categoria',
              cell: (i: Item) => <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">{i.category}</span>,
            },
            {
              header: 'Unidad',
              cell: (i: Item) => <span className="text-slate-600 text-sm">{i.unitOfMeasure}</span>,
            },
            {
              header: 'Stock Minimo',
              cell: (i: Item) => <span className="text-slate-600 text-sm">{i.minimumStock}</span>,
            },
            {
              header: 'Acciones',
              cell: (i: Item) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(i)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleOpenDelete(i)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ),
            },
          ]}
          isLoading={loadingItems}
          emptyMessage="No hay materiales registrados"
        />
      )}

      {type === 'warehouses' && (
        <DataTable
          data={filteredWarehouses}
          columns={[
            {
              header: 'Nombre',
              cell: (w: Warehouse) => <span className="font-semibold text-slate-900">{w.name}</span>,
            },
            {
              header: 'Tipo',
              cell: (w: Warehouse) => (
                <span className={`text-xs px-2.5 py-1 rounded font-medium ${w.type === 'CENTRAL' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {w.type === 'CENTRAL' ? 'Central' : 'En Faena'}
                </span>
              ),
            },
            {
              header: 'Ubicacion',
              cell: (w: Warehouse) => <span className="text-slate-600 text-sm">{w.location}</span>,
            },
            {
              header: 'Acciones',
              cell: (w: Warehouse) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(w)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleOpenDelete(w)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ),
            },
          ]}
          isLoading={loadingWarehouses}
          emptyMessage="No hay bodegas registradas"
        />
      )}

      {type === 'suppliers' && (
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
              header: 'Razon Social',
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
              header: 'Telefono',
              cell: (s: Supplier) => <span className="text-slate-600 text-sm">{s.contactPhone || 'N/A'}</span>,
            },
            {
              header: 'Acciones',
              cell: (s: Supplier) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(s)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleOpenDelete(s)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ),
            },
          ]}
          isLoading={loadingSuppliers}
          emptyMessage="No hay proveedores registrados"
        />
      )}

      {/* Modal: Crear / Editar Item */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={type === 'items' ? (isEditModalOpen ? 'Editar Material' : 'Nuevo Material') : type === 'warehouses' ? (isEditModalOpen ? 'Editar Bodega' : 'Nueva Bodega') : isEditModalOpen ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      >
        <form onSubmit={isEditModalOpen ? handleEditSubmit : handleCreateSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          {type === 'items' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Codigo *" placeholder="Ej: ITM-006" value={itemCode} onChange={(e) => setItemCode(e.target.value)} required />
                <div className="flex flex-col w-full">
                  <label className="mb-1 text-sm font-medium text-slate-700">Categoria *</label>
                  <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Input label="Descripcion *" placeholder="Ej: Filtro de Petroleo" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col w-full">
                  <label className="mb-1 text-sm font-medium text-slate-700">Unidad de Medida *</label>
                  <select value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="UN">UN (Unidad)</option>
                    <option value="L">L (Litros)</option>
                    <option value="KG">KG (Kilogramos)</option>
                    <option value="MT">MT (Metros)</option>
                    <option value="GL">GL (Galones)</option>
                  </select>
                </div>
                <Input label="Stock Minimo" type="number" value={itemMinStock} onChange={(e) => setItemMinStock(Number(e.target.value))} />
              </div>
            </>
          )}

          {type === 'warehouses' && (
            <>
              <Input label="Nombre de Bodega *" placeholder="Ej: Bodega Faena Pelambres" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col w-full">
                  <label className="mb-1 text-sm font-medium text-slate-700">Tipo *</label>
                  <select value={warehouseType} onChange={(e) => setWarehouseType(e.target.value as WarehouseType)} className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="CENTRAL">Central</option>
                    <option value="FAENA">En Faena</option>
                  </select>
                </div>
                <Input label="Ubicacion *" placeholder="Ej: Salamanca" value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} required />
              </div>
            </>
          )}

          {type === 'suppliers' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="RUT *" placeholder="Ej: 76.123.456-7" value={supplierRut} onChange={(e) => setSupplierRut(e.target.value)} required />
                <Input label="Razon Social *" placeholder="Ej: Comercializadora SPA" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Contacto" placeholder="Ej: Juan Perez" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} />
                <Input label="Telefono" placeholder="Ej: +56912345678" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
              </div>
              <Input label="Email" type="email" placeholder="Ej: ventas@proveedor.cl" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} />
              <Input label="Direccion" placeholder="Ej: Av. Industrial 1234" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} />
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditModalOpen ? 'Guardar Cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Eliminacion */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminacion">
        <div className="space-y-4 pt-2">
          {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{errorMsg}</div>}
          <p className="text-slate-700 text-sm">
            ¿Estas seguro de que deseas eliminar este registro? Esta accion no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteSubmit}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
