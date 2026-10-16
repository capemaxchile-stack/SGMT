import { useState, useEffect } from 'react';
import {
  Send,
  Building,
  CheckCircle,
  Copy,
  Printer,
  Package,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSuppliers } from '../../api/bodega';
import { useCreateQuotation } from '../../api/compras';
import { useToast } from '../ui/Toast';
import { PurchaseRequest } from '../../types/compras';

interface RfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PurchaseRequest | null;
  onSuccess?: () => void;
}

export function RfqModal({ isOpen, onClose, request, onSuccess }: RfqModalProps) {
  const toast = useToast();
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const createQuotationMutation = useCreateQuotation();

  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [validUntil, setValidUntil] = useState<string>('');
  const [rfqNotes, setRfqNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    count: number;
    supplierNames: string[];
  } | null>(null);

  // Set default validUntil (5 business days) when request changes
  useEffect(() => {
    if (request) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setValidUntil(defaultDate.toISOString().split('T')[0]);
      setRfqNotes(
        `Solicitud de cotización oficial para repuestos requeridos en ${request.faena?.name || 'Faena'}. Indicar plazo de entrega y validez de la propuesta.`
      );
      setSelectedSupplierIds([]);
      setSuccessResult(null);
    }
  }, [request, isOpen]);

  const toggleSupplier = (supplierId: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId]
    );
  };

  const selectAllSuppliers = () => {
    if (selectedSupplierIds.length === suppliers.length) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(suppliers.map((s) => s.id));
    }
  };

  const handleGenerateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (selectedSupplierIds.length === 0) {
      toast.warning('Debe seleccionar al menos un proveedor para invitar a cotizar.');
      return;
    }

    if (!request.lines || request.lines.length === 0) {
      toast.error('La solicitud no contiene repuestos para cotizar.');
      return;
    }

    setIsSubmitting(true);
    const chosenSuppliers = suppliers.filter((s) => selectedSupplierIds.includes(s.id));

    try {
      for (const supplierId of selectedSupplierIds) {
        await createQuotationMutation.mutateAsync({
          purchaseRequestId: request.id,
          supplierId,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          notes: rfqNotes.trim() || undefined,
          lines: request.lines.map((line) => ({
            itemId: line.itemId,
            quantity: Number(line.quantity),
            unitPrice: 0,
            availabilityDays: 2,
            comments: line.notes || undefined,
          })),
        });
      }

      setSuccessResult({
        count: selectedSupplierIds.length,
        supplierNames: chosenSuppliers.map((s) => s.businessName),
      });

      toast.success(
        `Se generaron ${selectedSupplierIds.length} solicitudes de cotización (RFQ) en estado SOLICITADA.`
      );
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Error al emitir solicitudes de cotización.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildFormattedEmailText = () => {
    if (!request) return '';
    const linesList =
      request.lines
        ?.map(
          (l, i) =>
            `${i + 1}. [${l.item?.code || 'N/A'}] ${l.item?.description || 'Repuesto'} - Cantidad: ${Number(
              l.quantity
            )} ${l.item?.unitOfMeasure || 'UN'}${
              l.targetAsset?.internalNumber ? ` (Para equipo: ${l.targetAsset.internalNumber})` : ''
            }${l.notes ? ` - Obs: ${l.notes}` : ''}`
        )
        .join('\n') || '';

    return `ESTIMADO PROVEEDOR,

Junto con saludar, solicitamos cotización formal para el siguiente requerimiento técnico:

• N° Requerimiento: ${request.requestNumber}
• Faena de Destino: ${request.faena?.name || 'Faena Terreno'}
• Justificación / Motivo: ${request.justification}
• Plazo límite para recepción de oferta: ${validUntil ? new Date(validUntil).toLocaleDateString('es-CL') : 'A la brevedad'}

DETALLE DE REPUESTOS REQUERIDOS:
${linesList}

CONDICIONES REQUERIDAS:
- Indicar precio unitario neto (CLP o USD).
- Indicar plazo de entrega en días corridos en faena o bodega central.
- Indicar condiciones de pago y vigencia de la propuesta.

Atentamente,
Departamento de Adquisiciones & Abastecimiento
SGMT PRO - Sistema de Gestión Movimiento de Tierra
comprador@sgmt.local`;
  };

  const handleCopyEmailText = () => {
    const text = buildFormattedEmailText();
    navigator.clipboard.writeText(text);
    toast.success('¡Texto formal para correo/WhatsApp copiado al portapapeles!');
  };

  const handlePrintRfq = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !request) return;

    const itemsRows =
      request.lines
        ?.map(
          (l, i) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${
            l.item?.code || '-'
          }</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${l.item?.description || ''}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${Number(
            l.quantity
          )} ${l.item?.unitOfMeasure || 'UN'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${
            l.targetAsset?.internalNumber
              ? `${l.targetAsset.internalNumber} (${l.targetAsset.type || ''})`
              : 'Stock Faena'
          }</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">${l.notes || '-'}</td>
        </tr>
      `
        )
        .join('') || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Solicitud de Cotización RFQ - ${request.requestNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; }
            h1 { font-size: 18px; margin-bottom: 4px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
            .header-box { border: 1px solid #e2e8f0; background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px;">
            <div>
              <h1>SOLICITUD DE COTIZACIÓN (RFQ)</h1>
              <p style="margin: 0; font-size: 12px; color: #64748b;">SGMT PRO — Sistema de Gestión Movimiento de Tierra</p>
            </div>
            <div style="text-align: right; font-size: 12px;">
              <strong>Folio Requerimiento:</strong> ${request.requestNumber}<br>
              <strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-CL')}
            </div>
          </div>

          <div class="header-box">
            <p><strong>Faena Requerida:</strong> ${request.faena?.name || 'Faena Terreno'}</p>
            <p><strong>Plazo Límite Recepción Ofertas:</strong> ${
              validUntil ? new Date(validUntil).toLocaleDateString('es-CL') : 'A convenir'
            }</p>
            <p><strong>Justificación Operacional:</strong> ${request.justification}</p>
            <p><strong>Condiciones Generales:</strong> ${rfqNotes || 'Cotizar precio neto unitario y plazo de entrega.'}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="width: 120px;">Código Ítem</th>
                <th>Descripción del Repuesto / Insumo</th>
                <th style="width: 100px; text-align: center;">Cantidad</th>
                <th style="width: 150px;">Equipo Destino</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b;">
            Documento emitido para cotización formal de adquisiciones. Favor remitir su propuesta comercial detallada a comprador@sgmt.local.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Proceso de Cotización (RFQ) — ${request.requestNumber}`}
      size="2xl"
    >
      {successResult ? (
        <div className="space-y-4 py-2">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold">¡Solicitudes de Cotización emitidas con éxito!</h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">
              Se crearon <strong>{successResult.count}</strong> registros en estado{' '}
              <span className="font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                SOLICITADA
              </span>{' '}
              vinculados a la solicitud <strong>{request.requestNumber}</strong> para los siguientes proveedores:
            </p>
            <ul className="mt-2 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
              {successResult.supplierNames.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Herramientas de Envío al Proveedor:
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyEmailText}
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy size={14} />
                <span>Copiar Texto Correo / WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintRfq}
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Imprimir / Descargar Ficha RFQ</span>
              </Button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-300">
            💡 <strong>Paso siguiente:</strong> Una vez que los proveedores respondan con sus ofertas por correo o teléfono, ve a la pestaña <strong>Cotizaciones</strong> y presiona <strong>"Cargar Precios Proveedor"</strong> en la tarjeta correspondiente para ingresar los valores finales y adjudicar.
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={onClose}>Listo / Cerrar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerateRfq} className="space-y-4">
          {/* Header Summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                Faena: {request.faena?.name}
              </span>
              <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">
                {request.requestNumber}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Solicitante: <strong>{request.requester?.name}</strong> • Motivo: <em>"{request.justification}"</em>
            </p>
          </div>

          {/* Repuestos a Cotizar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Package size={14} className="text-primary-600" />
                Repuestos a Solicitar ({request.lines?.length || 0}):
              </label>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
              {request.lines?.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      [{line.item?.code || 'N/A'}] {line.item?.description}
                    </span>
                    {line.targetAsset?.internalNumber && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 ml-2 font-medium">
                        (Equipo: {line.targetAsset.internalNumber})
                      </span>
                    )}
                  </div>
                  <span className="font-black text-slate-900 dark:text-white shrink-0 ml-2">
                    {Number(line.quantity)} {line.item?.unitOfMeasure || 'UN'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selección de Proveedores */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building size={14} className="text-primary-600" />
                Seleccionar Proveedores a Invitar ({selectedSupplierIds.length} seleccionados):
              </label>
              <button
                type="button"
                onClick={selectAllSuppliers}
                className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold hover:underline"
              >
                {selectedSupplierIds.length === suppliers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            {loadingSuppliers ? (
              <div className="text-xs text-slate-400 py-3 text-center">Cargando directorio de proveedores...</div>
            ) : suppliers.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 rounded-lg text-xs text-amber-800">
                No hay proveedores registrados en el catálogo maestro.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900">
                {suppliers.map((sup) => {
                  const isChecked = selectedSupplierIds.includes(sup.id);
                  return (
                    <label
                      key={sup.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30 text-slate-900 dark:text-white font-medium'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSupplier(sup.id)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{sup.businessName}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {sup.rut} {sup.contactEmail ? `• ${sup.contactEmail}` : ''}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Configuración de Fechas y Condiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Plazo Límite de Recepción de Cotización
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Instrucciones / Condiciones de Entrega
              </label>
              <input
                type="text"
                value={rfqNotes}
                onChange={(e) => setRfqNotes(e.target.value)}
                placeholder="Ej. Despacho directo a faena; cotizar repuestos originales o alternativos calificados."
                className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedSupplierIds.length === 0}>
              <Send size={14} className="mr-1.5" />
              {isSubmitting
                ? 'Emitiendo RFQs...'
                : `Emitir ${selectedSupplierIds.length} Solicitud(es) de Cotización`}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
