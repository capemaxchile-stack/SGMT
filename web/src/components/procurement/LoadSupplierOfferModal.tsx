import { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  Building,
  Package,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUpdateQuotation } from '../../api/compras';
import { useToast } from '../ui/Toast';
import { Quotation, QuotationLine } from '../../types/compras';

interface LoadSupplierOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onSuccess?: () => void;
}

interface EditableLine {
  id?: string;
  itemId: string;
  itemDescription: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  availabilityDays: number;
  comments: string;
}

export function LoadSupplierOfferModal({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}: LoadSupplierOfferModalProps) {
  const toast = useToast();
  const updateQuotationMutation = useUpdateQuotation();

  const [validUntil, setValidUntil] = useState<string>('');
  const [vendorQuoteNumber, setVendorQuoteNumber] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (quotation) {
      setValidUntil(
        quotation.validUntil
          ? new Date(quotation.validUntil).toISOString().split('T')[0]
          : ''
      );
      setGeneralNotes(quotation.notes || '');
      setVendorQuoteNumber('');

      if (quotation.lines && quotation.lines.length > 0) {
        setLines(
          quotation.lines.map((l: QuotationLine) => ({
            id: l.id,
            itemId: l.itemId,
            itemDescription: l.item?.description || 'Repuesto',
            itemCode: l.item?.code || 'N/A',
            quantity: Number(l.quantity) || 1,
            unitPrice: Number(l.unitPrice) || 0,
            availabilityDays: Number(l.availabilityDays) || 2,
            comments: l.comments || '',
          }))
        );
      } else {
        setLines([]);
      }
    }
  }, [quotation, isOpen]);

  const handleLinePriceChange = (index: number, value: number) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], unitPrice: Math.max(0, value) };
      return copy;
    });
  };

  const handleLineDaysChange = (index: number, value: number) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], availabilityDays: Math.max(1, value) };
      return copy;
    });
  };

  const handleLineCommentsChange = (index: number, value: string) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], comments: value };
      return copy;
    });
  };

  const totalCalculated = lines.reduce(
    (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    if (lines.length === 0) {
      toast.error('No hay líneas de repuestos para cotizar.');
      return;
    }

    if (totalCalculated <= 0) {
      toast.warning('Debe ingresar un precio unitario mayor a $0 en al menos un repuesto.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullNotes = vendorQuoteNumber.trim()
        ? `N° Cotización Proveedor: ${vendorQuoteNumber.trim()}${
            generalNotes.trim() ? ` • Obs: ${generalNotes.trim()}` : ''
          }`
        : generalNotes.trim();

      await updateQuotationMutation.mutateAsync({
        id: quotation.id,
        payload: {
          status: 'RECIBIDA',
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          notes: fullNotes || undefined,
          lines: lines.map((l) => ({
            id: l.id,
            itemId: l.itemId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice) || 0,
            availabilityDays: Number(l.availabilityDays) || 1,
            comments: l.comments || undefined,
          })),
        },
      });

      toast.success(
        `Oferta de ${quotation.supplier.businessName} registrada con éxito. Estado: RECIBIDA.`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Error al guardar la oferta del proveedor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!quotation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cargar Oferta Recibida — ${quotation.quotationNumber}`}
      size="2xl"
    >
      <form onSubmit={handleSubmitOffer} className="space-y-4">
        {/* Supplier & Context Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
              <Building size={16} className="text-primary-600 dark:text-primary-400" />
              <span>{quotation.supplier.businessName}</span>
              <span className="text-slate-400 font-normal">({quotation.supplier.rut})</span>
            </div>
            {quotation.purchaseRequest && (
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Requerimiento base: <strong>{quotation.purchaseRequest.requestNumber}</strong> (
                {quotation.purchaseRequest.faena?.name})
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-primary-600 dark:text-primary-400 font-bold block">
              {quotation.quotationNumber}
            </span>
            <span className="text-[10px] text-slate-400">
              Solicitada: {new Date(quotation.requestedDate).toLocaleDateString('es-CL')}
            </span>
          </div>
        </div>

        {/* Commercial details inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              N° Cotización Proveedor (Doc / Factura)
            </label>
            <input
              type="text"
              placeholder="Ej. COT-FINNING-88412"
              value={vendorQuoteNumber}
              onChange={(e) => setVendorQuoteNumber(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Oferta Válida Hasta
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones / Términos de Pago
            </label>
            <input
              type="text"
              placeholder="Ej. 30 días crédito, entrega faena"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Lines Price Entry Table */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Package size={14} className="text-primary-600" />
              Precios y Plazos Ofertados por el Proveedor ({lines.length} repuestos):
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              Precios en CLP Netos
            </span>
          </label>

          <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-white dark:bg-slate-900">
            {lines.map((line, idx) => {
              const lineSubtotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-bold text-slate-900 dark:text-white mr-2">
                        [{line.itemCode}]
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {line.itemDescription}
                      </span>
                    </div>
                    <span className="font-black text-slate-700 dark:text-slate-300 ml-2">
                      Cant: {line.quantity}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Precio Unitario ($ CLP) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={line.unitPrice || ''}
                        onChange={(e) => handleLinePriceChange(idx, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md p-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Plazo Entrega (Días Hábiles)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.availabilityDays}
                        onChange={(e) => handleLineDaysChange(idx, parseInt(e.target.value, 10) || 1)}
                        className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-md p-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col justify-end text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                        Subtotal Línea
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                        ${lineSubtotal.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Nota de línea (ej. Código de parte alternativo, procedencia, garantía)..."
                      value={line.comments}
                      onChange={(e) => handleLineCommentsChange(idx, e.target.value)}
                      className="w-full text-[11px] border border-slate-250 dark:border-slate-700/80 rounded p-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Summary Footer */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="text-emerald-600 dark:text-emerald-400" size={20} />
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Total Neto Cotizado por el Proveedor
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Al guardar, la cotización cambiará automáticamente a estado{' '}
                <strong>RECIBIDA</strong> y podrá ser adjudicada.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              ${totalCalculated.toLocaleString('es-CL')} CLP
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || totalCalculated <= 0}>
            <CheckCircle size={14} className="mr-1.5" />
            {isSubmitting ? 'Guardando...' : 'Guardar Oferta Recibida'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
