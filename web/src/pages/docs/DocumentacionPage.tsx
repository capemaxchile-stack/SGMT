import { useState } from 'react';
import {
  BookOpen,
  Layers,
  Truck,
  Wrench,
  Fuel,
  Box,
  ShoppingCart,
  ShieldCheck,
  HelpCircle,
  Key,
  FileCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function DocumentacionPage() {
  const [activeTab, setActiveTab] = useState<'flujos' | 'guias' | 'modulos' | 'faq' | 'roles'>('flujos');
  const [selectedFlow, setSelectedFlow] = useState<'compras' | 'mantenimiento' | 'combustible' | 'bodega'>('compras');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-300 text-xs font-bold tracking-wider uppercase">
              Manual Oficial de Operación
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              Guía de Usuario Final
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <BookOpen className="text-blue-400" size={30} />
            Centro de Ayuda y Procedimientos SGMT PRO
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Manual interactivo con diagramas de flujo de trabajo, guías paso a paso para terreno y administración, y procedimientos estándar de operación para maquinaria y abastecimiento.
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('flujos')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'flujos'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers size={18} />
          Diagramas de Procesos
        </button>

        <button
          onClick={() => setActiveTab('guias')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'guias'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck size={18} />
          Guías Paso a Paso
        </button>

        <button
          onClick={() => setActiveTab('modulos')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'modulos'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Box size={18} />
          Módulos del Sistema
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'roles'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={18} />
          Roles y Atribuciones
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'faq'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <HelpCircle size={18} />
          Preguntas Frecuentes (FAQ)
        </button>
      </div>

      {/* 1. TAB: DIAGRAMAS DE FLUJO INTERACTIVOS */}
      {activeTab === 'flujos' && (
        <div className="space-y-6">
          {/* Flow selector buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setSelectedFlow('compras')}
              className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                selectedFlow === 'compras'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <ShoppingCart size={18} className="text-blue-500 shrink-0" />
              <span>1. Compras & Aprobaciones</span>
            </button>

            <button
              onClick={() => setSelectedFlow('mantenimiento')}
              className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                selectedFlow === 'mantenimiento'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <Wrench size={18} className="text-indigo-500 shrink-0" />
              <span>2. Mantenimiento & OTs</span>
            </button>

            <button
              onClick={() => setSelectedFlow('combustible')}
              className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                selectedFlow === 'combustible'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <Fuel size={18} className="text-amber-500 shrink-0" />
              <span>3. Control de Diésel</span>
            </button>

            <button
              onClick={() => setSelectedFlow('bodega')}
              className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                selectedFlow === 'bodega'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <Box size={18} className="text-emerald-500 shrink-0" />
              <span>4. Bodega & Kardex</span>
            </button>
          </div>

          {/* Flow 1: Compras */}
          {selectedFlow === 'compras' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="text-blue-600" size={22} />
                  Flujo del Proceso: Abastecimiento y Compras
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Desde el requerimiento en terreno hasta la valorización en Kardex y bodega central
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Visual Flow Steps */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-2">1</span>
                      <h4 className="font-bold text-xs text-blue-950 dark:text-blue-200">Solicitud de Terreno</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">El Solicitante o Jefe de Faena levanta la necesidad de materiales o repuestos.</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-3 block">Estado: BORRADOR / PENDIENTE</span>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-2">2</span>
                      <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">Emisión de OC</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">El Comprador cotiza con proveedores y genera la Orden de Compra formal.</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-3 block">Estado: PENDIENTE_APROBACIÓN</span>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center mb-2">3</span>
                      <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200">Aprobación Jerárquica</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Jefes de Faena (&le;$1M) o Gerencias (&le;$10M) revisan y autorizan la OC.</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-3 block">Filtro por Monto Máximo</span>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center mb-2">4</span>
                      <h4 className="font-bold text-xs text-purple-950 dark:text-purple-200">Excepción Súper Usuario</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">En emergencias fuera de presupuesto, se desbloquea con clave maestra.</p>
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-3 block">Estado: APROBADA_EXCEPCION</span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">5</span>
                      <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">Recepción en Bodega</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">El Bodeguero ingresa los ítems físicos, sumando stock y recalculando PMP.</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-3 block">Estado: RECEPCION_TOTAL</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flow 2: Mantenimiento */}
          {selectedFlow === 'mantenimiento' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wrench className="text-indigo-600" size={22} />
                  Flujo del Proceso: Mantenimiento de Flota y Órdenes de Trabajo (OT)
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detección preventiva por horómetro, apertura de OT, rebaja de repuestos y cierre técnico
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-2">1</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Alerta de Radar o Falla</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        El sistema detecta que una máquina alcanzó su pauta (ej: 250 o 500 hrs) o el operador reporta una avería en terreno.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-3">Alerta: PRÓXIMO / VENCIDO</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-2">2</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Apertura y Asignación de OT</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Se crea la OT con su nivel de prioridad. Si es crítica, la máquina pasa a estado <strong>EN MANTENCIÓN</strong>.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-3">Estado OT: ABIERTA / EN PROGRESO</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-2">3</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Consumo de Insumos</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Se cargan los filtros y aceites utilizados, rebajando el stock de bodega y calculando el costo del servicio.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-3">Movimiento: SALIDA Automática</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">4</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Cierre y Habilitación</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        El mecánico ingresa el horómetro final y observaciones. La máquina retorna a estado <strong>OPERATIVO</strong>.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-3">Estado OT: COMPLETADA</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flow 3: Combustible */}
          {selectedFlow === 'combustible' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Fuel className="text-amber-500" size={22} />
                  Flujo del Proceso: Abastecimiento y Rendimiento de Combustible
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control de camiones aljibe, cargas por horómetro y detección de anomalías de consumo
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center mb-2">1</span>
                    <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200">Lectura de Tablero</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      El operador o rigger anota el horómetro y kilometraje exacto del equipo antes de realizar la carga.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center mb-2">2</span>
                    <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200">Despacho y Rebaja</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Se registran los litros suministrados. Si proviene de un estanque de faena, se rebaja automáticamente el stock.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">3</span>
                    <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">Auditoría de Rendimiento</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      El sistema calcula los <strong>L/h</strong> trabajados y alerta a jefatura si el consumo supera el promedio histórico de la flota.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flow 4: Bodega */}
          {selectedFlow === 'bodega' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Box className="text-emerald-600" size={22} />
                  Flujo del Proceso: Control de Bodegas y Movimientos Kardex
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control de stock físico, traslados entre faenas y valorización PMP
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                    <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 mb-1">Entrada (INGRESO)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Recepción de materiales comprados a proveedores. Aumenta stock e impacta costo medio.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                    <h4 className="font-bold text-xs text-blue-900 dark:text-blue-200 mb-1">Salida a Terreno (SALIDA)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Consumo en faena o taller de mantención. Requiere existencia física disponible.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                    <h4 className="font-bold text-xs text-purple-900 dark:text-purple-200 mb-1">Traslado (TRANSFER)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Movimiento seguro de insumos entre Bodega Central y Bodegas de Faena.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 mb-1">Ajuste de Inventario (AJUSTE)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Alineación tras inventario físico cíclico con registro auditable.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 2. TAB: GUÍAS PASO A PASO */}
      {activeTab === 'guias' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-600" />
                Cómo emitir y tramitar una Orden de Compra (OC)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 1:</span>
                <div>Ingresá al módulo <strong>Compras</strong> y hacé clic en <strong>Nueva Orden de Compra</strong>.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 2:</span>
                <div>Seleccioná el <strong>Proveedor</strong>, la fecha estimada de entrega y agregá las líneas de materiales con sus cantidades y precios unitarios acordados.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 3:</span>
                <div>Al guardar, la OC quedará en estado <code>PENDIENTE_APROBACION</code>. El responsable según el monto (Jefe de Faena o Gerente) podrá aprobarla desde la <strong>Bandeja de Aprobaciones</strong> en Administración.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 4:</span>
                <div>Cuando el camión del proveedor llegue a faena, el bodeguero hace clic en <strong>Recepcionar en Bodega</strong> para ingresar el stock al inventario.</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench size={18} className="text-indigo-600" />
                Cómo gestionar un Mantenimiento y Cargar Repuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">Paso 1:</span>
                <div>Revisá el <strong>Radar de Alertas</strong> en Mantenimiento para ver qué máquinas están próximas a su pauta de 250h o 500h.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">Paso 2:</span>
                <div>Hacé clic en <strong>Generar OT Preventiva</strong> o <strong>Nueva OT</strong> detallando el trabajo mecánico requerido.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">Paso 3:</span>
                <div>En el detalle de la OT, hacé clic en <strong>Cargar Repuesto</strong> para seleccionar los filtros o aceites utilizados; el sistema descontará el stock de bodega en tiempo real.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">Paso 4:</span>
                <div>Hacé clic en <strong>Finalizar OT</strong> para registrar el horómetro de entrega y reactivar el equipo a estado <code>OPERATIVO</code>.</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Fuel size={18} className="text-amber-600" />
                Cómo registrar cargas de Combustible y auditar Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 shrink-0">Paso 1:</span>
                <div>Ingresá al módulo <strong>Combustible</strong> y hacé clic en <strong>Nueva Carga de Combustible</strong>.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 shrink-0">Paso 2:</span>
                <div>Seleccioná la máquina. El sistema te mostrará el horómetro anterior como referencia para verificar la coherencia del nuevo valor.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 shrink-0">Paso 3:</span>
                <div>Ingresá los litros cargados y el nuevo horómetro del tablero; vas a ver el cálculo instantáneo de <strong>L/hora</strong> en pantalla antes de confirmar.</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key size={18} className="text-purple-600" />
                Aprobación por Excepción de Súper Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-purple-600 shrink-0">Paso 1:</span>
                <div>Ingresá con tu usuario con rol <code>SUPER_USUARIO</code> a la pestaña <strong>Bandeja de Aprobaciones</strong> en Administración.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-purple-600 shrink-0">Paso 2:</span>
                <div>En la orden pendiente extraordinaria, seleccioná <strong>Aprobación Especial Súper Usuario</strong>.</div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-purple-600 shrink-0">Paso 3:</span>
                <div>Ingresá el motivo de la excepción y tu <strong>Clave Maestra de Seguridad</strong> (doble factor) para autorizar la compra de manera inmutable.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. TAB: MÓDULOS DEL SISTEMA */}
      {activeTab === 'modulos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers size={18} className="text-blue-500" />
                Faenas & Contratos
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Control de centros de costos, contratos con mandantes y asignación territorial de maquinaria pesada.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Truck size={18} className="text-amber-500" />
                Flota de Maquinaria
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Inventario de excavadoras, camiones tolva, bulldozers y camionetas con odómetros de horómetro y kilometraje.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench size={18} className="text-indigo-500" />
                Mantenimiento & OTs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Pautas de servicio preventivo, checklists mecánicos, radar de vencimientos y consumo de repuestos desde bodega.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Fuel size={18} className="text-amber-600" />
                Control de Combustible
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Despachos de petróleo diésel, camiones aljibe, cálculo automático de L/hora y detección de sobreconsumos.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Box size={18} className="text-emerald-500" />
                Bodega & Kardex
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Administración de almacenes, movimientos de entrada/salida, control de stock mínimo y valorización PMP.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-purple-500" />
                Compras & Proveedores
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Catálogo de proveedores (RUT chileno), solicitudes de compra de faena, emisión de OCs y flujo de autorizaciones.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. TAB: ROLES Y ATRIBUCIONES */}
      {activeTab === 'roles' && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={20} />
              Matriz de Permisos y Perfiles de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3">Perfil / Rol</th>
                    <th className="p-3">Nivel</th>
                    <th className="p-3">Límite Aprobación</th>
                    <th className="p-3">Responsabilidades Clave</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-blue-600">Solicitante Terreno</td>
                    <td className="p-3">1</td>
                    <td className="p-3">Sin aprobación</td>
                    <td className="p-3">Genera solicitudes de compra de insumos para su faena operativa.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-emerald-600">Bodeguero</td>
                    <td className="p-3">1</td>
                    <td className="p-3">Sin aprobación</td>
                    <td className="p-3">Recepciona compras, registra movimientos de bodega y despachos de diésel.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-indigo-600">Comprador</td>
                    <td className="p-3">2</td>
                    <td className="p-3">Sin aprobación</td>
                    <td className="p-3">Gestiona proveedores, cotiza y emite órdenes de compra formales.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-amber-600">Jefe de Faena</td>
                    <td className="p-3">3</td>
                    <td className="p-3">Hasta $1.000.000</td>
                    <td className="p-3">Supervisa operación en terreno, aprueba compras menores y gestiona OTs.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-orange-600">Gerente Operaciones</td>
                    <td className="p-3">4</td>
                    <td className="p-3">Hasta $5.000.000</td>
                    <td className="p-3">Asignación estratégica de maquinaria, compras mayores y pautas de flota.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-purple-600">Gerente Admin Finanzas</td>
                    <td className="p-3">5</td>
                    <td className="p-3">Hasta $10.000.000</td>
                    <td className="p-3">Control presupuestario, flujo de caja y contratos de proyectos.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-rose-600">Súper Usuario</td>
                    <td className="p-3">99</td>
                    <td className="p-3">Ilimitado</td>
                    <td className="p-3">Aprobación extraordinaria por excepción mediante doble clave maestra.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Administrador Sistema</td>
                    <td className="p-3">100</td>
                    <td className="p-3">Ilimitado</td>
                    <td className="p-3">Gestión de usuarios, auditoría forense inmutable y configuraciones globales.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. TAB: PREGUNTAS FRECUENTES (FAQ) */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-500" />
                  ¿Por qué el sistema no me permite cargar un repuesto a una Orden de Trabajo?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6">
                  El sistema valida la existencia física en la bodega seleccionada. Si no hay suficiente cantidad disponible, el sistema bloqueará la salida para evitar descuadres de inventario. Es necesario recepcionar stock mediante una compra o realizar un traslado desde Bodega Central.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-500" />
                  ¿Cómo calcula el sistema el rendimiento de combustible (L/h)?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6">
                  El sistema resta el horómetro de la carga anterior al horómetro actual ingresado para obtener las horas efectivas de trabajo, y luego divide los litros suministrados entre esas horas trabajadas.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-500" />
                  ¿Qué ocurre cuando se completa una Orden de Trabajo en taller?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6">
                  Al finalizar la OT, si no existen otras órdenes críticas abiertas para ese equipo, su estado operativo pasa automáticamente de <code>EN_MANTENCION</code> a <code>OPERATIVO</code>, quedando disponible de inmediato para ser asignado en faena.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-500" />
                  ¿Se pueden modificar los registros de la bitácora de auditoría?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6">
                  No. Por seguridad y cumplimiento de auditoría contable, la bitácora es 100% inmutable. Cualquier intento de modificación o borrado es bloqueado a nivel de base de datos.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
