import { useState } from 'react';
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdateOrderStatus,
  useReceivePurchaseOrder,
} from '../../../api/compras';
import { useSuppliers, useItems, useWarehouses } from '../../../api/bodega';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DataTable } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { PurchaseOrder } from '../../../types/compras';
import { Plus, Search, CheckCircle, XCircle, PackageCheck, AlertCircle, Trash2 } from 'lucide-react';

interface OrderLineForm {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export function PurchaseOrdersTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSuperUserModalOpen, setIsSuperUserModalOpen] = useState(false);
  const [superOrderId, setSuperOrderId] = useState<string>('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [superKey, setSuperKey] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form: Create OC
  const [supplierId, setSupplierId] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('30 dias contra factura');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [lines, setLines] = useState<OrderLineForm[]>([
    { itemId: '', quantity: 1, unitPrice: 0 },
  ]);

  const { data: orders, isLoading } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: items } = useItems();
  const { data: warehouses } = useWarehouses();

  const createOrderMutation = useCreatePurchaseOrder();
  const updateStatusMutation = useUpdateOrderStatus();
  const receiveOrderMutation = useReceivePurchaseOrder();

  const handleOpenCreateModal = () => {
    setSupplierId(suppliers?.[0]?.id || '');
    setDeliveryTerms('30 dias contra factura');
    setEstimatedDeliveryDate('');
    setLines([{ itemId: items?.[0]?.id || '', quantity: 1, unitPrice: 0 }]);
    setErrorMsg('');
    setIsCreateModalOpen(true);
  };

  const handleOpenReceiveModal = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setReceiveWarehouseId(warehouses?.[0]?.id || '');
    setErrorMsg('');
    setIsReceiveModalOpen(true);
  };

  const handleAddLine = () => {
    setLines([...lines, { itemId: items?.[0]?.id || '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof OrderLineForm, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const totalCalculated = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSupplierId = supplierId || (suppliers && suppliers.length > 0 ? suppliers[0].id : '');
    if (!targetSupplierId) {
      setErrorMsg('Debe seleccionar un proveedor válido.');
      return;
    }
    const validLines = lines
      .map((l) => ({
        itemId: l.itemId || (items && items.length > 0 ? items[0].id : ''),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice) || 0,
      }))
      .filter((l) => l.itemId && l.quantity > 0);

    if (validLines.length === 0) {
      setErrorMsg('Debe ingresar al menos una línea válida con cantidad mayor a 0.');
      return;
    }

    try {
      await createOrderMutation.mutateAsync({
        supplierId: targetSupplierId,
        deliveryTerms: deliveryTerms.trim() || undefined,
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : undefined,
        lines: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice) || 0,
        })),
      });
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al emitir la orden de compra.');
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, action: 'APROBADA', level: 1, comments: 'Aprobación estándar' });
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, action: 'RECHAZADA', level: 1, comments: 'Rechazado' });
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleSuperApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionReason || !superKey) {
      setErrorMsg('Debe ingresar motivo y clave de autorización.');
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({ 
        id: superOrderId, 
        action: 'EXCEPCION', 
        level: 1, 
        comments: 'Aprobación por excepción de Súper Usuario',
        exceptionReason,
        superKey 
      });
      setIsSuperUserModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error en la autorización.');
    }
  };

  const handleOpenSuperApprove = (orderId: string) => {
    setSuperOrderId(orderId);
    setExceptionReason('');
    setSuperKey('');
    setErrorMsg('');
    setIsSuperUserModalOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !receiveWarehouseId) return;

    try {
      await receiveOrderMutation.mutateAsync({
        id: selectedOrder.id,
        warehouseId: receiveWarehouseId,
        notes: 'Recepcion completa de OC ' + selectedOrder.orderNumber,
      });
      setIsReceiveModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al recepcionar la orden.');
    }
  };

  // Metrics
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === 'PENDIENTE_APROBACION').length || 0;
  const approvedOrders = orders?.filter((o) => o.status === 'APROBADA' || o.status === 'EMITIDA').length || 0;
  const receivedOrders = orders?.filter((o) => o.status === 'RECEPCION_TOTAL').length || 0;

  const filteredOrders =
    orders?.filter((o) => {
      const matchSearch =
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplier?.businessName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'TODOS' || o.status === statusFilter;
      return matchSearch && matchStatus;
    }) || [];

  const columns = [
    {
      header: 'N° Orden',
      cell: (item: PurchaseOrder) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {item.orderNumber}
        </span>
      ),
    },
    {
      header: 'Proveedor',
      cell: (item: PurchaseOrder) => (
        <div>
          <p className="font-semibold text-slate-800">{item.supplier?.businessName}</p>
          <p className="text-xs text-slate-500 font-mono">{item.supplier?.rut}</p>
        </div>
      ),
    },
    {
      header: 'Total ($ CLP)',
      cell: (item: PurchaseOrder) => (
        <span className="font-bold text-slate-900">${Number(item.totalAmount).toLocaleString('es-CL')}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (item: PurchaseOrder) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Fecha Emision',
      cell: (item: PurchaseOrder) => (
        <span className="text-xs text-slate-600">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Acciones',
      cell: (item: PurchaseOrder) => (
        <div className="flex gap-1 items-center">
          {item.status === 'PENDIENTE_APROBACION' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700"
                title="Aprobar OC"
                onClick={() => handleApprove(item.id)}
              >
                <CheckCircle size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                title="Rechazar OC"
                onClick={() => handleReject(item.id)}
              >
                <XCircle size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-600 hover:text-amber-700"
                title="Súper Usuario (Aprobar por Excepción)"
                onClick={() => handleOpenSuperApprove(item.id)}
              >
                <AlertCircle size={16} />
              </Button>
            </>
          )}
          {(item.status === 'APROBADA' || item.status === 'EMITIDA') && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-blue-700 border-blue-300"
              onClick={() => handleOpenReceiveModal(item)}
            >
              <PackageCheck size={14} className="mr-1" /> Recepcionar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ordenes de Compra (OC)</h2>
          <p className="text-slate-500 text-sm">Gestion del ciclo de compras, aprobacion jerarquica y recepcion</p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <Plus size={16} className="mr-2" />
          Nueva Orden de Compra
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 uppercase font-bold">Total OCs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-amber-600 uppercase font-bold">Por Aprobar</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-blue-600 uppercase font-bold">Aprobadas</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{approvedOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-emerald-600 uppercase font-bold">Recepcionadas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{receivedOrders}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex-1">
          <Input
            placeholder="Buscar por N° OC o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="PENDIENTE_APROBACION">Pendiente Aprobacion</option>
            <option value="APROBADA">Aprobada</option>
            <option value="RECEPCION_TOTAL">Recepcion Total</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </div>
      </div>

      <DataTable
        data={filteredOrders}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No hay ordenes de compra registradas"
      />

      {/* Modal: Nueva OC */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nueva Orden de Compra">
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Proveedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.businessName} (RUT: {s.rut})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Condiciones de Entrega / Pago"
              placeholder="Ej: 30 dias contra factura"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
            />
            <Input
              label="Fecha Estimada Entrega"
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-800">Lineas de Compra</label>
              <Button variant="ghost" size="sm" type="button" onClick={handleAddLine}>
                <Plus size={14} className="mr-1" /> Agregar Fila
              </Button>
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex-1">
                  <select
                    value={line.itemId}
                    onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                    required
                    className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {items?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    value={line.quantity}
                    onChange={(e) => handleLineChange(idx, 'quantity', Number(e.target.value))}
                    required
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    step="100"
                    placeholder="Precio Unit."
                    value={line.unitPrice}
                    onChange={(e) => handleLineChange(idx, 'unitPrice', Number(e.target.value))}
                    required
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="text-red-500"
                  onClick={() => handleRemoveLine(idx)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}

            <div className="text-right font-bold text-slate-900 text-sm pt-2">
              Total OC: ${totalCalculated.toLocaleString('es-CL')} CLP
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createOrderMutation.isPending}>
              Emitir Orden de Compra
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Recepcionar en Bodega */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title={`Recepcionar Orden: ${selectedOrder?.orderNumber || ''}`}
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded text-sm text-slate-700">
            <p>
              <strong>Proveedor:</strong> {selectedOrder?.supplier?.businessName}
            </p>
            <p>
              <strong>Monto Total:</strong> ${Number(selectedOrder?.totalAmount || 0).toLocaleString('es-CL')} CLP
            </p>
          </div>

          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Bodega de Destino *</label>
            <select
              value={receiveWarehouseId}
              onChange={(e) => setReceiveWarehouseId(e.target.value)}
              required
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {warehouses?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.location})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Al confirmar la recepcion, el sistema creara automaticamente un movimiento de ingreso en bodega y aumentara el stock disponible de todos los materiales incluidos en la orden.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsReceiveModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={receiveOrderMutation.isPending}>
              Confirmar Recepcion e Ingresar Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Aprobación Súper Usuario */}
      <Modal isOpen={isSuperUserModalOpen} onClose={() => setIsSuperUserModalOpen(false)} title="Aprobación Súper Usuario">
        <form onSubmit={handleSuperApprove} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}
          <Input 
            label="Motivo de la excepción *" 
            placeholder="Ej: Aprobación urgente fuera de flujo" 
            value={exceptionReason} 
            onChange={(e) => setExceptionReason(e.target.value)} 
            required 
          />
          <Input 
            label="Clave Doble Autenticación *" 
            type="password"
            placeholder="Ingrese llave del súper usuario" 
            value={superKey} 
            onChange={(e) => setSuperKey(e.target.value)} 
            required 
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsSuperUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={updateStatusMutation.isPending}>
              Aprobar por Excepción
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
