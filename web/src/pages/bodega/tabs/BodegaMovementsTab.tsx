import { useState } from 'react';
import { useMovements, useCreateMovement, useItemKardex } from '../../../api/movements';
import { useItems, useWarehouses } from '../../../api/bodega';
import { useFaenas } from '../../../api/faenas';
import { useFlota } from '../../../api/flota';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DataTable } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { Movement, MovementType } from '../../../types/movements';
import { Plus, Search, FileSpreadsheet, AlertCircle, Trash2 } from 'lucide-react';

interface MovementLineForm {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export function BodegaMovementsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
  const [selectedKardexItemId, setSelectedKardexItemId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [movementType, setMovementType] = useState<MovementType>('INGRESO');
  const [warehouseId, setWarehouseId] = useState('');
  const [faenaId, setFaenaId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<MovementLineForm[]>([
    { itemId: '', quantity: 1, unitCost: 0 },
  ]);

  const { data: movements, isLoading } = useMovements({
    type: typeFilter === 'TODOS' ? undefined : typeFilter,
  });

  const { data: items } = useItems();
  const { data: warehouses } = useWarehouses();
  const { data: faenas } = useFaenas();
  const { data: assets } = useFlota();
  const { data: kardexData, isLoading: loadingKardex } = useItemKardex(selectedKardexItemId);

  const createMovementMutation = useCreateMovement();

  const handleOpenModal = () => {
    setMovementType('INGRESO');
    setWarehouseId(warehouses?.[0]?.id || '');
    setFaenaId('');
    setAssetId('');
    setNotes('');
    setLines([{ itemId: items?.[0]?.id || '', quantity: 1, unitCost: 0 }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleAddLine = () => {
    setLines([...lines, { itemId: items?.[0]?.id || '', quantity: 1, unitCost: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof MovementLineForm, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetWarehouseId = warehouseId || (warehouses && warehouses.length > 0 ? warehouses[0].id : '');
    if (!targetWarehouseId) {
      setErrorMsg('Debe seleccionar una bodega válida.');
      return;
    }

    const validLines = lines
      .map((l) => ({
        itemId: l.itemId || (items && items.length > 0 ? items[0].id : ''),
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost) || 0,
      }))
      .filter((l) => l.itemId && l.quantity > 0);

    if (validLines.length === 0) {
      setErrorMsg('Debe agregar al menos un material con cantidad mayor a 0.');
      return;
    }

    try {
      await createMovementMutation.mutateAsync({
        type: movementType,
        warehouseId: targetWarehouseId,
        faenaId: faenaId || undefined,
        assetId: assetId || undefined,
        notes: notes.trim() || undefined,
        lines: validLines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost) || 0,
        })),
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error?.response?.data?.message || 'Error al registrar el movimiento.');
    }
  };

  const filteredMovements =
    movements?.filter(
      (m) =>
        m.movementNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.warehouse?.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const columns = [
    {
      header: 'N° Movimiento',
      cell: (item: Movement) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {item.movementNumber}
        </span>
      ),
    },
    {
      header: 'Tipo',
      cell: (item: Movement) => <StatusBadge status={item.type} />,
    },
    {
      header: 'Bodega',
      cell: (item: Movement) => <span className="font-medium text-slate-800">{item.warehouse?.name}</span>,
    },
    {
      header: 'Destino / Imputacion',
      cell: (item: Movement) => (
        <div className="text-xs text-slate-700">
          {item.faena && <p className="font-medium">Faena: {item.faena.name}</p>}
          {item.asset && (
            <p className="text-slate-500">
              Equipo: {item.asset.brand} {item.asset.model} ({item.asset.internalNumber})
            </p>
          )}
          {!item.faena && !item.asset && <span className="text-slate-400 italic">Movimiento interno</span>}
        </div>
      ),
    },
    {
      header: 'Lineas e Items',
      cell: (item: Movement) => (
        <div className="text-xs text-slate-600">
          {item.lines?.map((l, idx) => (
            <div key={idx}>
              {l.item?.description} x <strong>{Number(l.quantity)}</strong> {l.item?.unitOfMeasure}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Usuario / Fecha',
      cell: (item: Movement) => (
        <div className="text-xs text-slate-500">
          <p className="text-slate-800 font-medium">{item.user?.name}</p>
          <p>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Movimientos de Bodega y Control de Stock</h2>
          <p className="text-slate-500 text-sm">Registro de ingresos, salidas de materiales a faena/equipo y ajustes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedKardexItemId(items?.[0]?.id || '');
              setIsKardexModalOpen(true);
            }}
          >
            <FileSpreadsheet size={16} className="mr-2" />
            Ver Kardex
          </Button>
          <Button onClick={handleOpenModal}>
            <Plus size={16} className="mr-2" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex-1">
          <Input
            placeholder="Buscar por N° movimiento, bodega o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los Tipos</option>
            <option value="INGRESO">Ingresos (+)</option>
            <option value="SALIDA">Salidas (-)</option>
            <option value="AJUSTE">Ajustes</option>
          </select>
        </div>
      </div>

      <DataTable
        data={filteredMovements}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No hay movimientos registrados en bodega"
      />

      {/* Modal: Nuevo Movimiento */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Movimiento de Bodega">
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Tipo de Movimiento *</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as MovementType)}
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INGRESO">Ingreso a Bodega (+)</option>
                <option value="SALIDA">Salida / Consumo (-)</option>
                <option value="AJUSTE">Ajuste de Inventario</option>
              </select>
            </div>

            <div className="flex flex-col w-full">
              <label className="mb-1 text-sm font-medium text-slate-700">Bodega Destino/Origen *</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccione Bodega --</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {movementType === 'SALIDA' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex flex-col w-full">
                <label className="mb-1 text-sm font-medium text-slate-700">Imputar a Faena</label>
                <select
                  value={faenaId}
                  onChange={(e) => setFaenaId(e.target.value)}
                  className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sin imputar a Faena --</option>
                  {faenas?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col w-full">
                <label className="mb-1 text-sm font-medium text-slate-700">Imputar a Equipo/Activo</label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sin imputar a Equipo --</option>
                  {assets?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.internalNumber} ({a.brand} {a.model})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-800">Detalle de Materiales</label>
              <Button variant="ghost" size="sm" type="button" onClick={handleAddLine}>
                <Plus size={14} className="mr-1" /> Agregar Fila
              </Button>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-2 pb-1 border-b border-slate-200">
              <div className={movementType === 'INGRESO' ? 'col-span-5' : 'col-span-8'}>Material / Insumo</div>
              <div className="col-span-3 text-center">Cantidad</div>
              {movementType === 'INGRESO' && <div className="col-span-3 text-center">Costo Unit. ($)</div>}
              <div className="col-span-1 text-center"></div>
            </div>

            {lines.map((line, idx) => {
              const selectedItem = items?.find((i) => i.id === line.itemId);
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200">
                  <div className={movementType === 'INGRESO' ? 'col-span-5' : 'col-span-8'}>
                    <select
                      value={line.itemId}
                      onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                      required
                      className="flex w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar Material --</option>
                      {items?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} - {item.description} ({item.unitOfMeasure})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Cant."
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, 'quantity', Number(e.target.value))}
                      required
                      className="text-center font-medium"
                    />
                    {selectedItem && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-1 rounded whitespace-nowrap">
                        {selectedItem.unitOfMeasure}
                      </span>
                    )}
                  </div>
                  {movementType === 'INGRESO' && (
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="1"
                        placeholder="$ Costo Unit."
                        value={line.unitCost}
                        onChange={(e) => handleLineChange(idx, 'unitCost', Number(e.target.value))}
                        className="text-right"
                      />
                    </div>
                  )}
                  <div className="col-span-1 flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-red-500 hover:text-red-700 p-1 h-auto"
                      onClick={() => handleRemoveLine(idx)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Input
            label="Notas / Observaciones"
            placeholder="Ej: Entrega de filtros para mantenimiento programado"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMovementMutation.isPending}>
              Registrar Movimiento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Kardex por Item */}
      <Modal
        isOpen={isKardexModalOpen}
        onClose={() => setIsKardexModalOpen(false)}
        title="Kardex de Inventario"
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-col w-full">
            <label className="mb-1 text-sm font-medium text-slate-700">Seleccionar Material</label>
            <select
              value={selectedKardexItemId}
              onChange={(e) => setSelectedKardexItemId(e.target.value)}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {items?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} - {i.description}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingKardex ? (
              <p className="text-center py-6 text-slate-500 text-sm">Cargando movimientos del kardex...</p>
            ) : !kardexData || kardexData.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm">No hay movimientos registrados para este item.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Movimiento</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Bodega</th>
                    <th className="p-2 text-right">Entrada</th>
                    <th className="p-2 text-right">Salida</th>
                    <th className="p-2 text-right">Costo Unit.</th>
                    <th className="p-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {kardexData.map((k: any, idx: number) => {
                    const mov = k.movement || {};
                    const isIngreso = mov.type === 'INGRESO';
                    const isSalida = mov.type === 'SALIDA';
                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 text-slate-600">
                          {mov.createdAt ? new Date(mov.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-800">
                          {mov.movementNumber || '-'}
                        </td>
                        <td className="p-2">
                          <StatusBadge status={mov.type} />
                        </td>
                        <td className="p-2 text-slate-600">
                          {mov.warehouse?.name || '-'}
                        </td>
                        <td className="p-2 text-right text-emerald-600 font-bold">
                          {isIngreso ? `+${Number(k.quantity)}` : '-'}
                        </td>
                        <td className="p-2 text-right text-red-600 font-bold">
                          {isSalida ? `-${Number(k.quantity)}` : '-'}
                        </td>
                        <td className="p-2 text-right text-slate-700">
                          ${Number(k.unitCost || 0).toLocaleString('es-CL')}
                        </td>
                        <td className="p-2 text-right font-extrabold text-slate-900 bg-slate-50/50">
                          {Number(k.balance || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setIsKardexModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
