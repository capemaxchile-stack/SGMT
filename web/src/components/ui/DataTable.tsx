import React from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  isLoading, 
  emptyMessage = 'No hay datos disponibles',
  className 
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto border border-slate-200 rounded-lg bg-white", className)}>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 font-semibold", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center">
                <Spinner className="w-6 h-6 mx-auto text-primary-600 mb-2" />
                <span className="text-slate-500">Cargando datos...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={cn("px-4 py-3 text-slate-700", col.className)}>
                    {col.cell ? col.cell(item) : (col.accessorKey ? String(item[col.accessorKey] ?? '') : '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
