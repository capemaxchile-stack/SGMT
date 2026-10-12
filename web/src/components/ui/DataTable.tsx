import React from 'react';
import { cn } from '../../lib/utils';

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
    <div className={cn("w-full overflow-x-auto border border-slate-200 rounded-lg bg-white dark:border-slate-800 dark:bg-slate-900", className)}>
      <table className="w-full min-w-[700px] text-sm text-left">
        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-800">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 font-semibold", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, rIndex) => (
              <tr key={`skeleton-${rIndex}`} className="animate-pulse">
                {columns.map((_, cIndex) => (
                  <td key={`skeleton-cell-${cIndex}`} className="px-4 py-3.5">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr key={(item as { id?: string | number })?.id ?? rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={cn("px-4 py-3 text-slate-700 dark:text-slate-200", col.className)}>
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
