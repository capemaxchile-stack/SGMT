import React, { useState } from 'react';
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
import { useToast } from '../../../components/ui/Toast';
import { exportToCSV, printElement } from '../../../lib/export';
import { Plus, Search, FileSpreadsheet, AlertCircle, Trash2, Download, Printer } from 'lucide-react';

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
  const toast = useToast();

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
      const msg = 'Debe seleccionar una bodega válida.';
      setErrorMsg(msg);
      toast.error(msg);
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
      const msg = 'Debe agregar al menos un material con cantidad mayor a 0.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    try {
      await createMovementMutation.mutateAsync({
        type: movementType,
        warehouseId: targetWarehouseId,
        faenaId: faenaId || undefined,
        assetId: assetId || undefined,
        notes: notes.trim() || undefined,
        lines: validLines,
      });
      setIsModalOpen(false);
      toast.success('Movimiento de bodega registrado exitosamente');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al registrar el movimiento';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const filteredMovements = movements?.filter((m) => {
    const search = searchTerm.toLowerCase();
    const matchesNum = m.movementNumber?.toLowerCase().includes(search);
    const matchesWarehouse = m.warehouse?.name?.toLowerCase().includes(search);
    const matchesNotes = m.notes?.toLowerCase().includes(search);
    const matchesItem = m.lines?.some((l) =>
      l.item?.description?.toLowerCase().includes(search)
    );
    return matchesNum || matchesWarehouse || matchesNotes || matchesItem;
  }) || [];

  const handleExportMovements = () => {
    if (filteredMovements.length === 0) {
      toast.info('No hay movimientos para exportar');
      return;
    }
    exportToCSV(
      filteredMovements,
      [
        { header: 'N° Movimiento', key: 'movementNumber' },
        { header: 'Tipo', key: 'type' },
        { header: 'Bodega', key: (m) => m.warehouse?.name || '' },
        { header: 'Faena Imputada', key: (m) => m.faena?.name || 'N/A' },
        { header: 'Equipo Imputado', key: (m) => m.asset ? `${m.asset.internalNumber} (${m.asset.brand} ${m.asset.model})` : 'N/A' },
        {
          header: 'Detalle Materiales',
          key: (m) =>
            m.lines
              ?.map((l) => `${l.item?.description} x ${Number(l.quantity)} ${l.item?.unitOfMeasure}`)
              .join(' | ') || '',
        },
        { header: 'Usuario', key: (m) => m.user?.name || '' },
        { header: 'Fecha', key: (m) => m.createdAt ? new Date(m.createdAt).toLocaleString('es-CL') : '' },
        { header: 'Notas', key: (m) => m.notes || '' },
      ],
      'SGMT_Movimientos_Bodega'
    );
    toast.success('Movimientos exportados a Excel/CSV');
  };

  const handleExportKardex = () => {
    if (!kardexData || kardexData.length === 0) {
      toast.info('No hay registros de Kardex para exportar');
      return;
    }
    const selectedItemObj = items?.find((i) => i.id === selectedKardexItemId);
    const itemName = selectedItemObj ? `${selectedItemObj.code}_${selectedItemObj.description}` : 'Item';

    exportToCSV(
      kardexData,
      [
        { header: 'Fecha', key: (k) => k.movement?.createdAt ? new Date(k.movement.createdAt).toLocaleDateString('es-CL') : (k.date ? new Date(k.date).toLocaleDateString('es-CL') : '') },
        { header: 'N° Movimiento', key: (k) => k.movement?.movementNumber || k.movementNumber || '' },
        { header: 'Tipo', key: (k) => k.movement?.type || k.type || '' },
        { header: 'Bodega', key: (k) => k.movement?.warehouse?.name || k.warehouseName || '' },
        { header: 'Cantidad Entrada (+)', key: (k) => (k.movement?.type || k.type) === 'INGRESO' ? Number(k.quantity) : 0 },
        { header: 'Cantidad Salida (-)', key: (k) => (k.movement?.type || k.type) === 'SALIDA' ? Number(k.quantity) : 0 },
        { header: 'Costo Unitario ($ CLP)', key: (k) => Number(k.unitCost || 0) },
        { header: 'Saldo Stock', key: (k) => Number(k.balance || 0) },
      ],
      `SGMT_Kardex_${itemName.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    );
    toast.success('Kardex exportado a Excel/CSV');
  };

  const handlePrintKardex = () => {
    const selectedItemObj = items?.find((i) => i.id === selectedKardexItemId);
    const title = selectedItemObj ? `Kardex Valorizado: ${selectedItemObj.code} - ${selectedItemObj.description}` : 'Kardex Valorizado';
    printElement('kardex-printable-table', title);
  };

  const columns = [
    {
      header: 'N° Movimiento',
      cell: (item: Movement) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
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
      cell: (item: Movement) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.warehouse?.name}</span>
      ),
    },
    {
      header: 'Destino / Imputación',
      cell: (item: Movement) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {item.faena && <p className="font-medium text-slate-700 dark:text-slate-300">Faena: {item.faena.name}</p>}
          {item.asset && (
            <p className="text-blue-600 dark:text-blue-400 font-mono">
              Equipo: {item.asset.internalNumber} ({item.asset.brand} {item.asset.model})
            </p>
          )}
          {!item.faena && !item.asset && <span className="text-slate-400 dark:text-slate-500">Bodega General</span>}
        </div>
      ),
    },
    {
      header: 'Materiales & Cantidad',
      cell: (item: Movement) => (
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
          {item.lines?.map((l, idx) => (
            <div key={idx}>
              {l.item?.description} x <strong className="font-bold text-slate-900 dark:text-white">{Number(l.quantity)}</strong> {l.item?.unitOfMeasure}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Usuario / Fecha',
      cell: (item: Movement) => (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p className="text-slate-800 dark:text-slate-200 font-medium">{item.user?.name}</p>
          <p>{item.createdAt ? new Date(item.createdAt).toLocaleString('es-CL') : ''}</p>
        </div>
      ),
    },
  ];

  const selectedItemDetails = items?.find((i) => i.id === selectedKardexItemId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Movimientos de Bodega y Control de Stock</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Registro de ingresos, salidas de materiales a faena/equipo y ajustes contables
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportMovements}
            className="flex items-center gap-1.5"
            title="Descargar lista de movimientos en Excel/CSV"
          >
            <Download size={15} />
            Exportar Movimientos
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedKardexItemId(items?.[0]?.id || '');
              setIsKardexModalOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} />
            Ver Kardex
          </Button>
          <Button onClick={handleOpenModal} className="flex items-center gap-1.5">
            <Plus size={16} />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex-1">
          <Input
            placeholder="Buscar por N° movimiento, bodega, material o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        emptyMessage="No se encontraron movimientos registrados"
      />

      {/* Modal: Nuevo Movimiento */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Movimiento de Bodega"
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tipo de Movimiento *
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as MovementType)}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INGRESO">Ingreso a Bodega (+)</option>
                <option value="SALIDA">Salida / Consumo (-)</option>
                <option value="AJUSTE">Ajuste de Inventario</option>
              </select>
            </div>

            <div className="flex flex-col w-full">
              <label className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Bodega Destino / Origen *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col w-full">
                <label className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Imputar a Faena
                </label>
                <select
                  value={faenaId}
                  onChange={(e) => setFaenaId(e.target.value)}
                  className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Imputar a Equipo / Maquinaria
                </label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Detalle de Materiales
              </label>
              <Button variant="ghost" size="sm" type="button" onClick={handleAddLine} className="text-blue-600 dark:text-blue-400">
                <Plus size={14} className="mr-1" /> Agregar Fila
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                      <select
                        value={line.itemId}
                        onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Seleccione Material --</option>
                        {items?.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.code} - {i.description} ({i.unitOfMeasure})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="Cant."
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>

                    {movementType === 'INGRESO' && (
                      <div className="w-28">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Costo Unit."
                          value={line.unitCost}
                          onChange={(e) => handleLineChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div className="w-8 flex justify-center">
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
                ))}
            </div>
          </div>

          <Input
            label="Notas / Observaciones"
            placeholder="Ej: Entrega de filtros para mantenimiento programado"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMovementMutation.isPending}>
              Registrar Movimiento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Kardex por Item con Exportación e Impresión */}
      <Modal
        isOpen={isKardexModalOpen}
        onClose={() => setIsKardexModalOpen(false)}
        title="Kardex Valorizado de Inventario"
        size="5xl"
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Seleccionar Material / Repuesto
              </label>
              <select
                value={selectedKardexItemId}
                onChange={(e) => setSelectedKardexItemId(e.target.value)}
                className="flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {items?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.description} ({i.unitOfMeasure})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportKardex}
                className="flex items-center gap-1.5"
                title="Descargar este Kardex en formato Excel/CSV"
              >
                <Download size={14} />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintKardex}
                className="flex items-center gap-1.5"
                title="Imprimir informe contable o guardar en PDF"
              >
                <Printer size={14} />
                Imprimir / PDF
              </Button>
            </div>
          </div>

          {selectedItemDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Código:</span>{' '}
                <strong className="font-mono text-blue-700 dark:text-blue-300">{selectedItemDetails.code}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Categoría:</span>{' '}
                <strong>{selectedItemDetails.category}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Unidad:</span>{' '}
                <strong>{selectedItemDetails.unitOfMeasure}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Stock Mínimo:</span>{' '}
                <strong>{selectedItemDetails.minimumStock}</strong>
              </div>
            </div>
          )}

          <div id="kardex-printable-table" className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {loadingKardex ? (
              <p className="text-center py-8 text-slate-500 text-xs">Cargando movimientos del kardex...</p>
            ) : !kardexData || kardexData.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-xs">No hay movimientos registrados para este item.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">N° Movimiento</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Bodega</th>
                    <th className="p-2.5 text-right">Entrada (+)</th>
                    <th className="p-2.5 text-right">Salida (-)</th>
                    <th className="p-2.5 text-right">Costo Unit.</th>
                    <th className="p-2.5 text-right">Saldo Físico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {kardexData.map((k, idx: number) => {
                    const mov = k.movement || {};
                    const isIngreso = (mov.type || k.type) === 'INGRESO';
                    const isSalida = (mov.type || k.type) === 'SALIDA';
                    return (
                      <tr key={k.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {mov.createdAt ? new Date(mov.createdAt).toLocaleDateString('es-CL') : (k.date ? new Date(k.date).toLocaleDateString('es-CL') : '-')}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {mov.movementNumber || k.movementNumber || '-'}
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={mov.type || k.type || 'INFO'} />
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {mov.warehouse?.name || k.warehouseName || '-'}
                        </td>
                        <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                          {isIngreso ? `+${Number(k.quantity)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right text-red-600 dark:text-red-400 font-bold">
                          {isSalida ? `-${Number(k.quantity)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right text-slate-700 dark:text-slate-300 font-mono">
                          ${Number(k.unitCost || 0).toLocaleString('es-CL')}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/40">
                          {Number(k.balance || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsKardexModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
