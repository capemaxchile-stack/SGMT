/**
 * KATEI Data Export & Reporting Utilities
 */

export interface ExportColumn<T> {
  header: string;
  key: keyof T | ((item: T) => string | number | null | undefined);
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
) {
  if (!data || data.length === 0) return;

  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(';');
  const rows = data.map((item) =>
    columns
      .map((col) => {
        let val: any;
        if (typeof col.key === 'function') {
          val = col.key(item);
        } else {
          val = item[col.key];
        }
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(';')
  );

  // Add BOM for Excel UTF-8 recognition
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printElement(
  elementId: string,
  title: string,
  subtitle?: string,
  companyName?: string
) {
  const content = document.getElementById(elementId);
  if (!content) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const cleanTitle = title.replace(/_/g, ' ');
  const clientCompany = companyName || '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${cleanTitle}${clientCompany ? ` - ${clientCompany}` : ''} | KATEI</title>
        <style>
          @page {
            size: letter;
            margin: 1.2cm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .brand-badge {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #2563eb;
            margin-bottom: 2px;
          }
          .company-title {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.02em;
          }
          .doc-title {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            margin-top: 2px;
          }
          .doc-subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .meta {
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
          }
          .meta-item {
            margin-bottom: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
            margin-top: 10px;
            margin-bottom: 10px;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
            padding: 7px 10px;
            border: 1px solid #cbd5e1;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-emerald { color: #059669; font-weight: 600; }
          .text-rose { color: #e11d48; font-weight: 600; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          .badge-ingreso { background: #dcfce7; color: #166534; }
          .badge-salida { background: #fee2e2; color: #991b1b; }
          .badge-ajuste { background: #fef9c3; color: #854d0e; }
          .signature-section {
            page-break-inside: avoid;
            margin-top: 30px;
          }
          .footer-note {
            margin-top: 25px;
            padding-top: 10px;
            border-top: 1px dashed #cbd5e1;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-badge">KATEI &bull; GESTIÓN OPERATIVA &bull; SISTEMA MULTI-TENANT</div>
            <div class="company-title">${clientCompany ? clientCompany.toUpperCase() : 'EMPRESA REGISTRADA'}</div>
            <div class="doc-title">${cleanTitle}</div>
            ${subtitle ? `<div class="doc-subtitle">${subtitle}</div>` : ''}
          </div>
          <div class="meta text-right">
            ${clientCompany ? `<div class="meta-item"><strong>Titular:</strong> ${clientCompany}</div>` : ''}
            <div class="meta-item"><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-CL')}</div>
            <div class="meta-item"><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="meta-item"><strong>Documento Oficial</strong></div>
          </div>
        </div>
        ${content.innerHTML}
        <div class="footer-note">
          Documento emitido formalmente a través de la plataforma KATEI para <strong>${clientCompany || 'la empresa'}</strong>. Información protegida y sujeta a trazabilidad operativa.
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}
