import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Printer, Package, Building } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Quotation } from '../../types/compras';

interface RfqSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
}

export function RfqSheetModal({ isOpen, onClose, quotation }: RfqSheetModalProps) {
  const toast = useToast();

  if (!quotation) return null;

  const buildEmailText = () => {
    const linesList =
      quotation.lines
        ?.map(
          (l, i) =>
            `${i + 1}. [${l.item?.code || 'N/A'}] ${l.item?.description || 'Repuesto'} - Cantidad: ${Number(
              l.quantity
            )} ${l.item?.unitOfMeasure || 'UN'}`
        )
        .join('\n') || '';

    return `ESTIMADO/A ${quotation.supplier.businessName.toUpperCase()},

Junto con saludar, solicitamos su cotización formal para el siguiente requerimiento técnico de repuestos:

• Folio RFQ SGMT: ${quotation.quotationNumber}
${quotation.purchaseRequest ? `• Solicitud de Origen: ${quotation.purchaseRequest.requestNumber}` : ''}
${quotation.purchaseRequest?.faena ? `• Faena de Destino: ${quotation.purchaseRequest.faena.name}` : ''}
• Fecha Límite de Recepción: ${
      quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CL') : 'A convenir'
    }

DETALLE DE REPUESTOS:
${linesList}

CONDICIONES DE LA SOLICITUD:
${quotation.notes || '- Indicar precios netos unitarios y plazo de entrega en días hábiles.'}

Favor enviar su cotización formal en respuesta a este correo (comprador@sgmt.local).

Atentamente,
Departamento de Adquisiciones & Abastecimiento
SGMT PRO — Sistema de Gestión Movimiento de Tierra`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildEmailText());
    toast.success('¡Texto formal copiado al portapapeles!');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows =
      quotation.lines
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
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${
          Number(l.unitPrice) > 0 ? `$${Number(l.unitPrice).toLocaleString('es-CL')}` : 'Por cotizar'
        }</td>
      </tr>
    `
        )
        .join('') || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha de Cotización - ${quotation.quotationNumber}</title>
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
              <strong>Folio:</strong> ${quotation.quotationNumber}<br>
              <strong>Fecha Emisión:</strong> ${new Date(quotation.requestedDate).toLocaleDateString('es-CL')}
            </div>
          </div>

          <div class="header-box">
            <p><strong>Proveedor Invitado:</strong> ${quotation.supplier.businessName} (${quotation.supplier.rut})</p>
            ${
              quotation.purchaseRequest
                ? `<p><strong>Requerimiento Faena:</strong> ${quotation.purchaseRequest.requestNumber} (${quotation.purchaseRequest.faena?.name})</p>`
                : ''
            }
            <p><strong>Vigencia / Plazo:</strong> ${
              quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('es-CL') : 'A convenir'
            }</p>
            <p><strong>Notas y Condiciones:</strong> ${quotation.notes || 'Especificar precio neto y días de entrega.'}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="width: 120px;">Código Ítem</th>
                <th>Descripción del Repuesto / Insumo</th>
                <th style="width: 100px; text-align: center;">Cantidad</th>
                <th style="width: 120px; text-align: right;">Precio Unitario</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b;">
            Documento emitido por SGMT PRO para gestión de compras. Enviar propuesta a comprador@sgmt.local.
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha de Cotización RFQ — ${quotation.quotationNumber}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Header Details */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Building size={14} className="text-primary-600" />
              {quotation.supplier.businessName} ({quotation.supplier.rut})
            </span>
            <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
              {quotation.quotationNumber}
            </span>
          </div>
          {quotation.purchaseRequest && (
            <p className="text-slate-500 dark:text-slate-400">
              Solicitud Faena: <strong>{quotation.purchaseRequest.requestNumber}</strong> (
              {quotation.purchaseRequest.faena?.name})
            </p>
          )}
          {quotation.notes && (
            <p className="text-slate-600 dark:text-slate-300 italic">"{quotation.notes}"</p>
          )}
        </div>

        {/* Lines */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
            <Package size={14} className="text-primary-600" />
            Líneas de Repuestos ({quotation.lines?.length || 0}):
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs">
            {quotation.lines?.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    [{line.item?.code || 'N/A'}] {line.item?.description}
                  </p>
                  {line.comments && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      • {line.comments}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {Number(line.quantity)} {line.item?.unitOfMeasure || 'UN'}
                  </span>
                  {Number(line.unitPrice) > 0 && (
                    <p className="text-[11px] text-primary-600 dark:text-primary-400 font-bold">
                      ${Number(line.unitPrice).toLocaleString('es-CL')} c/u
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Dispatch Actions */}
        <div className="p-3 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-primary-900 dark:text-primary-200">
            Opciones de Envío y Formalización:
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Copy size={14} />
              <span>Copiar Texto Formateado Correo / WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer size={14} />
              <span>Imprimir / Descargar Ficha RFQ</span>
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
