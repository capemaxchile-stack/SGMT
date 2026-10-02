import { useState } from 'react';
import { WorkOrdersTab } from './WorkOrdersTab';
import { PlansTab } from './PlansTab';
import { AlertsRadarTab } from './AlertsRadarTab';
import { Wrench, BookOpen, AlertTriangle } from 'lucide-react';

export function MantenimientoPage() {
  const [activeTab, setActiveTab] = useState<'work-orders' | 'plans' | 'radar'>('work-orders');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Wrench className="text-blue-600 dark:text-blue-400" size={26} />
            Mantenimiento y Control de Flota
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de Órdenes de Trabajo (OT), pautas preventivas por horómetro/km y alertas de servicio
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('work-orders')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'work-orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Wrench size={18} />
          Órdenes de Trabajo (OT)
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'plans'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen size={18} />
          Pautas y Checklists
        </button>

        <button
          onClick={() => setActiveTab('radar')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'radar'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle size={18} />
          Radar de Alertas y Vencimientos
        </button>
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'work-orders' && <WorkOrdersTab />}
        {activeTab === 'plans' && <PlansTab />}
        {activeTab === 'radar' && <AlertsRadarTab />}
      </div>
    </div>
  );
}
