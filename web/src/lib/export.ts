/**
 * SGMT Data Export & Reporting Utilities
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

export function printElement(elementId: string, title: string) {
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

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - SGMT</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 20px;
            color: #1e293b;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #1e3a8a;
          }
          .meta {
            font-size: 12px;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 600;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
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
            font-size: 11px;
            font-weight: bold;
          }
          .badge-ingreso { background: #dcfce7; color: #166534; }
          .badge-salida { background: #fee2e2; color: #991b1b; }
          .badge-ajuste { background: #fef9c3; color: #854d0e; }
          @page { margin: 1.5cm; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SGMT — ${title}</div>
            <div class="meta">Sistema de Gestión de Movimiento de Tierra</div>
          </div>
          <div class="meta text-right">
            <div>Fecha de emisión: ${new Date().toLocaleString('es-CL')}</div>
            <div>Documento oficial generado</div>
          </div>
        </div>
        ${content.innerHTML}
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
