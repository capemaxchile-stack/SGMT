import { useState, useEffect } from 'react';
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
  FileCheck,
  Smartphone,
  ShieldAlert,
  Send,
  FileBadge,
  MapPin,
  WifiOff,
  Bell,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/auth.store';

export function DocumentacionPage() {
  const { isModuleEnabled } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'flujos' | 'guias' | 'modulos' | 'faq' | 'roles'>('flujos');
  const [selectedFlow, setSelectedFlow] = useState<
    'compras' | 'terreno' | 'mantenimiento' | 'combustible' | 'bodega' | 'antifraude'
  >('compras');

  // Ajustar flujo seleccionado por defecto si compras no está en el plan
  useEffect(() => {
    if (!isModuleEnabled('COMPRAS')) {
      if (isModuleEnabled('MANTENIMIENTO')) setSelectedFlow('mantenimiento');
      else if (isModuleEnabled('COMBUSTIBLE')) setSelectedFlow('combustible');
      else if (isModuleEnabled('BODEGA')) setSelectedFlow('bodega');
      else if (isModuleEnabled('TERRENO')) setSelectedFlow('terreno');
      else setSelectedFlow('antifraude');
    }
  }, [isModuleEnabled]);

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
              Guía de Usuario Final & Terreno
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <BookOpen className="text-blue-400" size={30} />
            Centro de Ayuda y Procedimientos KATEI
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Manual interactivo con diagramas de flujo operativos, guías paso a paso para terreno y compras, y procedimientos estándar para faenas mineras y maquinaria pesada.
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {isModuleEnabled('COMPRAS') && (
              <button
                onClick={() => setSelectedFlow('compras')}
                className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                  selectedFlow === 'compras'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <ShoppingCart size={18} className="text-blue-500 shrink-0" />
                <span>1. Compras & Cotizaciones</span>
              </button>
            )}

            {isModuleEnabled('TERRENO') && (
              <button
                onClick={() => setSelectedFlow('terreno')}
                className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                  selectedFlow === 'terreno'
                    ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Smartphone size={18} className="text-cyan-500 shrink-0" />
                <span>2. App Terreno (Offline)</span>
              </button>
            )}

            {isModuleEnabled('MANTENIMIENTO') && (
              <button
                onClick={() => setSelectedFlow('mantenimiento')}
                className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                  selectedFlow === 'mantenimiento'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Wrench size={18} className="text-indigo-500 shrink-0" />
                <span>3. Mantenimiento & OTs</span>
              </button>
            )}

            {isModuleEnabled('COMBUSTIBLE') && (
              <button
                onClick={() => setSelectedFlow('combustible')}
                className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                  selectedFlow === 'combustible'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Fuel size={18} className="text-amber-500 shrink-0" />
                <span>4. Control de Diésel</span>
              </button>
            )}

            {isModuleEnabled('BODEGA') && (
              <button
                onClick={() => setSelectedFlow('bodega')}
                className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                  selectedFlow === 'bodega'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Box size={18} className="text-emerald-500 shrink-0" />
                <span>5. Bodega & Inventario / Stock</span>
              </button>
            )}

            <button
              onClick={() => setSelectedFlow('antifraude')}
              className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                selectedFlow === 'antifraude'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <ShieldAlert size={18} className="text-rose-500 shrink-0" />
              <span>6. Radar Antifraude & Alertas</span>
            </button>
          </div>

          {/* Flow 1: Compras & Cotizaciones */}
          {selectedFlow === 'compras' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="text-blue-600" size={22} />
                  Flujo del Proceso: Abastecimiento, Cotizaciones y Compras
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ciclo de vida completo: Requerimiento en faena &rarr; Cotización comparativa &rarr; Aprobación &rarr; OC &rarr; Notificación &rarr; Recepción multicanal
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-2">1</span>
                      <h4 className="font-bold text-xs text-blue-950 dark:text-blue-200">Solicitud de Pedido</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Desde el ERP o la App Móvil de terreno (con soporte offline). Al crearse, despacha alerta por Telegram y Email.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-3 block">Estado: PENDIENTE</span>
                  </div>

                  <div className="p-4 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center mb-2">2</span>
                      <h4 className="font-bold text-xs text-cyan-950 dark:text-cyan-200">Cotizaciones & Historial</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        El comprador revisa compras anteriores (última OC / Nubox), valida stock en bodega para evitar duplicados y asigna cotizaciones.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 mt-3 block">Regla: Mínimo 2 o Exclusivo</span>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center mb-2">3</span>
                      <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200">Aprobación Jerárquica</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Jefe Faena (&le;$1M), Gerente Op (&le;$5M) o Gerente Finanzas (&le;$10M). Se valida contra el presupuesto disponible de faena.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-3 block">Estado: APROBADA</span>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-2">4</span>
                      <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">Emisión de OC</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Se emite la Orden de Compra formal al proveedor adjudicado y se notifica la fecha comprometida de entrega.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-3 block">Estado: EMITIDA</span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">5</span>
                      <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">Recepción Multicanal</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Ingreso en: <strong>Bodega Central</strong>, <strong>Garita de Entrada</strong> o <strong>Directo a Máquina</strong> en terreno.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-3 block">3 Canales Físicos</span>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 relative flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center mb-2">6</span>
                      <h4 className="font-bold text-xs text-rose-950 dark:text-rose-200">Control de Tránsito</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        El radar alerta automáticamente sobre compras recepcionadas en Garita que no han ingresado a Bodega en &gt;48h.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-3 block">Alerta: TRANSITO_GARITA</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flow 2: App Terreno Móvil */}
          {selectedFlow === 'terreno' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Smartphone className="text-cyan-600" size={22} />
                  Flujo del Proceso: Aplicación Móvil Terreno (Offline-First)
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Operación sin interrupciones en zonas sin cobertura celular o WiFi (Ruta directa: /terreno o Acceso desde Login)
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center mb-2">1</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Carga de Pedido en Terreno</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        El mecánico o supervisor accede desde el teléfono, selecciona la faena, máquina, urgencia (Normal, Urgente o Máquina Detenida) y describe los repuestos.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 mt-3 flex items-center gap-1">
                      <WifiOff size={12} /> Soporte 100% Offline
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center mb-2">2</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Almacenamiento Local Seguro</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Si no hay conectividad a Internet, la orden se guarda localmente en el almacenamiento del navegador (LocalStorage / IndexedDB) sin perder datos.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-3">Estado: GUARDADO_LOCAL</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center mb-2">3</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Autosincronización al Conectar</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Tan pronto el móvil ingresa a garita, campamento o detecta señal celular, el sistema despacha los pedidos pendientes automáticamente al servidor.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-3">Sincronización en Segundo Plano</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center mb-2">4</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">Despacho de Alertas</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        El servidor procesa el pedido y dispara de inmediato un mensaje a Telegram del equipo de Compras y un correo electrónico formal con el detalle técnico.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-3 flex items-center gap-1">
                      <Send size={12} /> Telegram & Brevo Email
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flow 3: Mantenimiento */}
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

          {/* Flow 4: Combustible */}
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

          {/* Flow 5: Bodega */}
          {selectedFlow === 'bodega' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Box className="text-emerald-600" size={22} />
                  Flujo del Proceso: Control de Bodegas e Inventario / Stock
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control de stock físico, traslados entre faenas, valorización PMP y sugerencia de compra con IA
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                    <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 mb-1">Entrada (INGRESO)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Recepción de compras con número de guía/factura. Aumenta stock disponible y recalcula costo medio ponderado (PMP).
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                    <h4 className="font-bold text-xs text-blue-900 dark:text-blue-200 mb-1">Salida a Terreno (SALIDA)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Consumo en faena o taller de mantención. Requiere existencia física comprobada para evitar inventarios negativos.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                    <h4 className="font-bold text-xs text-purple-900 dark:text-purple-200 mb-1">Traslado (TRANSFER)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Movimiento entre Bodega Central y Bodegas periféricas de Faena con trazabilidad de despacho y recepción.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 mb-1">Sugerencia IA de Reorden</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      El algoritmo analiza la tasa de consumo de los últimos 30 días y el stock crítico para sugerir compras preventivas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flow 6: Radar Antifraude */}
          {selectedFlow === 'antifraude' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="text-rose-600" size={22} />
                  Flujo del Proceso: Radar Antifraude & Indicadores de Mal Uso
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detección preventiva basada en experiencias de control operacional minero (patrones de fraude y control de desvíos)
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center mb-2">1</span>
                    <h4 className="font-bold text-xs text-rose-950 dark:text-rose-200">Sobreprecios Anómalos</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Compara el precio unitario cotizado contra la última compra registrada (OC o Nubox). Si supera el +15%, activa bandera de revisión.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center mb-2">2</span>
                    <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200">Retención en Garita</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Identifica compras recepcionadas por guardia en garita que no ingresan a custodia de bodega en &gt;48 horas, evitando mermas o pérdidas.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-2">3</span>
                    <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-200">Fraccionamiento de OCs</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Detecta múltiples solicitudes menores al mismo proveedor en menos de 7 días diseñadas para eludir el umbral de aprobación gerencial.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">4</span>
                    <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">Horómetros Incoherentes</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Auditoría cruzada entre horómetros registrados en OTs mecánicas y cargas de combustible, alertando horómetros menores o retrocesos.
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
          {/* Guide 1: App Terreno */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Smartphone size={18} className="text-cyan-600" />
                Cómo solicitar Repuestos desde el Celular en Terreno (Offline)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-cyan-600 shrink-0">Paso 1:</span>
                <div>
                  Abrí el navegador del teléfono e ingresá a <code>/terreno</code>, o tocá el botón <strong>Acceso Móvil / Pedidos Terreno</strong> en la pantalla de inicio de sesión.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-cyan-600 shrink-0">Paso 2:</span>
                <div>
                  Seleccioná tu <strong>Faena</strong>, la <strong>Máquina</strong> que necesita el repuesto y la <strong>Urgencia</strong> (Normal, Urgente o Máquina Detenida).
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-cyan-600 shrink-0">Paso 3:</span>
                <div>
                  Agregá los repuestos con su código o descripción y cantidad. Si no tenés señal en la mina, tocá <strong>Guardar Pedido</strong>; quedará en la cola de salida de tu teléfono.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-cyan-600 shrink-0">Paso 4:</span>
                <div>
                  Al llegar a una zona con señal celular o WiFi de garita, tocá <strong>Sincronizar</strong>. El sistema enviará el pedido al ERP y notificará instantáneamente al comprador vía Telegram.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guide 2: Cotizaciones e Historial */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-600" />
                Cómo evaluar Cotizaciones: Historial, Stock y Proveedores Exclusivos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 1:</span>
                <div>
                  Al revisar una solicitud de compra, hacé clic en <strong>Ver Historial de Cotizaciones</strong> para inspeccionar los precios pagados en compras anteriores o importados de Nubox.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 2:</span>
                <div>
                  Comprobá la columna <strong>Stock en Bodega</strong>. Si existen unidades disponibles en la bodega central o de faena, cancelá la compra para evitar stock inmovilizado.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 3:</span>
                <div>
                  Si el producto tiene la marca <strong>Proveedor Exclusivo</strong>, el sistema permite emitir la OC directamente con ese proveedor sin exigir 3 cotizaciones.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-blue-600 shrink-0">Paso 4:</span>
                <div>
                  Si sólo hay 2 proveedores disponibles en el historial, podés solicitar cotización a ambos y dejar constancia de mercado restringido en las observaciones.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guide 3: Recepción Multicanal */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" />
                Cómo recepcionar compras: Bodega, Garita o Directo a Máquina
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-emerald-600 shrink-0">Paso 1:</span>
                <div>
                  En el módulo <strong>Compras</strong>, ubicá la Orden de Compra y hacé clic en <strong>Recepcionar Insumos</strong>.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-emerald-600 shrink-0">Paso 2:</span>
                <div>
                  Seleccioná el canal de ingreso real:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li><strong>Bodega Central/Faena:</strong> Ingresa formalmente al Inventario / Stock.</li>
                    <li><strong>Garita de Entrada:</strong> Queda en tránsito bajo custodia de portería.</li>
                    <li><strong>Directo a Máquina:</strong> Se entrega de inmediato al equipo o camión en faena.</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-emerald-600 shrink-0">Paso 3:</span>
                <div>
                  Ingresá el número de Guía de Despacho del transportista y adjuntá la foto del documento o firma si está disponible.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-emerald-600 shrink-0">Paso 4:</span>
                <div>
                  Si se recepcionó en Garita, el bodeguero debe dar el ingreso a bodega dentro de 48h para cerrar la alerta preventiva de tránsito.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guide 4: Certificaciones */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileBadge size={18} className="text-purple-600" />
                Cómo gestionar Certificaciones y Acreditación de Maquinaria
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-purple-600 shrink-0">Paso 1:</span>
                <div>
                  Ingresá al menú <strong>Control & Reportes &rarr; Certificaciones Flota</strong>.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-purple-600 shrink-0">Paso 2:</span>
                <div>
                  Hacé clic en <strong>Nuevo Documento</strong> y seleccioná el equipo (excavadora, camión tolva, etc.) y tipo de documento (Revisión Técnica, SOAP, Permiso de Circulación, Homologación Minera).
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-purple-600 shrink-0">Paso 3:</span>
                <div>
                  Completá la fecha de emisión y vencimiento. El sistema aplicará el semáforo automático: Verde (&gt;30 días), Amarillo (&le;30 días) o Rojo (Vencido).
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-purple-600 shrink-0">Paso 4:</span>
                <div>
                  En la pestaña <strong>Certificaciones de Operadores</strong>, podés acreditar licencias municipales, exámenes de altura física e inducciones para auditorías de mandantes.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guide 5: Mantenimiento y Repuestos */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench size={18} className="text-indigo-600" />
                Cómo gestionar Mantenimientos y Consumo de Repuestos
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

          {/* Guide 6: Canales Telegram y Brevo */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell size={18} className="text-amber-600" />
                Configuración de Notificaciones (Telegram Bot y Brevo Email)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 shrink-0">Paso 1:</span>
                <div>
                  En el módulo <strong>Administración</strong>, abrí la pestaña de Canales de Notificación para revisar el estado del Bot de Telegram y la API de Brevo.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 shrink-0">Paso 2:</span>
                <div>
                  Ingresá el <code>TELEGRAM_BOT_TOKEN</code> y el <code>TELEGRAM_CHAT_ID</code> del grupo operativo de faena o abastecimiento.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 shrink-0">Paso 3:</span>
                <div>
                  Definí los correos receptores para avisos de compras urgentes o detención de máquinas en terreno.
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 shrink-0">Paso 4:</span>
                <div>
                  Hacé clic en <strong>Probar Envío</strong>; recibirás un mensaje de verificación con formato enriquecido en tu Telegram y correo.
                </div>
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
              <p>Control de centros de costos, contratos con mandantes mineros, presupuestos asignados y asignación territorial de maquinaria pesada.</p>
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
              <p>Inventario de excavadoras, camiones tolva, motoniveladoras y camionetas de apoyo, con control de horómetros y odómetros.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Smartphone size={18} className="text-cyan-500" />
                App Terreno Móvil (PWA)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Acceso directo y ultra rápido para operadores y mecánicos. Diseñada para funcionar sin conexión y sincronizar pedidos automáticamente al reconectar.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-purple-500" />
                Compras & Abastecimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Gestión de cotizaciones comparativas, historial de compras (última OC / Nubox), proveedores exclusivos, aprobación multinivel y emisión de OCs.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Box size={18} className="text-emerald-500" />
                Bodega & Inventario / Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Control de stock físico en bodegas centrales y faenas, movimientos de Inventario / Stock, valorización PMP, traslados y sugerencias predictivas de reorden con IA.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileBadge size={18} className="text-indigo-500" />
                Certificaciones & Acreditación
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Control documental obligatorio de maquinaria (revisión técnica, SOAP, permiso, gases) y personal (licencias y exámenes), con alertas preventivas por semáforo.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench size={18} className="text-blue-600" />
                Mantenimiento & OTs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Pautas preventivas de 250h y 500h, órdenes de trabajo correctivas, rebaja automática de repuestos desde bodega y cálculo de costos mecánicos.</p>
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
              <p>Despachos de petróleo diésel desde camiones aljibe y estanques, auditoría de L/h por equipo y detección temprana de sobreconsumos o desvíos.</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-500" />
                Radar Antifraude & Presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>Detección automática de sobreprecios, compras retenidas en garita sin ingresar a bodega, saltos de horómetro y control de presupuesto gastado en tiempo real.</p>
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
                    <td className="p-3 font-bold text-cyan-600">Operador Terreno</td>
                    <td className="p-3">1</td>
                    <td className="p-3">Sin aprobación</td>
                    <td className="p-3">Genera pedidos de repuestos vía PWA móvil (online/offline) e informa lecturas de horómetros.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-emerald-600">Bodeguero / Garita</td>
                    <td className="p-3">1</td>
                    <td className="p-3">Sin aprobación</td>
                    <td className="p-3">Recepciona compras físicamente, registra movimientos de Inventario / Stock, traslados y despachos de combustible.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-indigo-600">Comprador</td>
                    <td className="p-3">2</td>
                    <td className="p-3">Sin aprobación</td>
                    <td className="p-3">Compara cotizaciones, revisa historial de compras y stock en bodega, y emite órdenes de compra.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-amber-600">Jefe de Faena</td>
                    <td className="p-3">3</td>
                    <td className="p-3">Hasta $1.000.000</td>
                    <td className="p-3">Supervisa operación en terreno, aprueba compras menores y autoriza órdenes de trabajo mecánicas.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-orange-600">Gerente Operaciones</td>
                    <td className="p-3">4</td>
                    <td className="p-3">Hasta $5.000.000</td>
                    <td className="p-3">Asignación de maquinaria pesada entre faenas, control de mantenimientos críticos y compras medianas.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-purple-600">Gerente Admin Finanzas</td>
                    <td className="p-3">5</td>
                    <td className="p-3">Hasta $10.000.000</td>
                    <td className="p-3">Control presupuestario, flujo de caja, autorizaciones mayores e integración contable (Nubox).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-rose-600">Súper Usuario</td>
                    <td className="p-3">99</td>
                    <td className="p-3">Ilimitado</td>
                    <td className="p-3">Aprobación extraordinaria por excepción ante urgencias fuera de presupuesto mediante clave maestra.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Administrador Sistema</td>
                    <td className="p-3">100</td>
                    <td className="p-3">Ilimitado</td>
                    <td className="p-3">Gestión de usuarios, auditoría forense inmutable y configuración de integraciones (Telegram, Brevo).</td>
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
                  <HelpCircle size={16} className="text-cyan-500" />
                  ¿Qué ocurre si el operador en terreno no tiene señal de celular ni WiFi?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6 leading-relaxed">
                  La aplicación móvil de pedidos está optimizada con tecnología PWA y almacenamiento local seguro (LocalStorage / IndexedDB). El operador puede cargar su requerimiento de repuestos con normalidad. Los pedidos quedan en la cola de salida y se despachan automáticamente tan pronto el dispositivo recupera señal al acercarse a garita, campamento o zona 4G.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-500" />
                  ¿Qué hacer si un repuesto sólo tiene 2 proveedores en el historial?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6 leading-relaxed">
                  El sistema permite cotizar con los 2 proveedores disponibles. Si el repuesto es de un fabricante exclusivo (como un repuesto original de marca), se marca como <strong>Proveedor Exclusivo</strong> para habilitar la compra directa. Si no es exclusivo pero el mercado está restringido, se adjunta la justificación comercial en las observaciones de la cotización para autorizar la OC.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-emerald-500" />
                  ¿Cómo funciona la alerta de repuestos en Garita de Entrada?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6 leading-relaxed">
                  Muchos repuestos llegan en camión a la garita de acceso a faena y son recibidos por el personal de portería. Cuando se registra como &ldquo;Recepción Garita&rdquo;, el sistema inicia un temporizador de custodia. Si en 48 horas el repuesto no ha sido trasladado a Bodega Central o entregado formalmente al mecánico de la máquina, el Radar Antifraude levanta una alerta para evitar extravíos o mermas.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-amber-500" />
                  ¿Cómo llegan las notificaciones por Telegram y Correo Electrónico?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6 leading-relaxed">
                  Al crearse un pedido desde terreno o emitirse una orden de compra, el servidor ejecuta una notificación en tiempo real: un mensaje con formato Markdown enriquecido al bot y canal de Telegram del equipo de Compras, y un correo HTML formateado vía el servicio transaccional Brevo, detallando la máquina, faena, nivel de urgencia y lista de insumos.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-indigo-500" />
                  ¿Por qué el sistema no me permite cargar un repuesto a una Orden de Trabajo?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6 leading-relaxed">
                  El sistema valida la existencia física en la bodega seleccionada. Si no hay suficiente cantidad disponible, el sistema bloqueará la salida para evitar descuadres de inventario. Es necesario recepcionar stock mediante una compra o realizar un traslado desde Bodega Central.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle size={16} className="text-rose-500" />
                  ¿Cómo se controla el presupuesto gastado por Faena?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 pl-6 leading-relaxed">
                  Cada faena tiene asignado un presupuesto mensual en el módulo Faenas. El sistema consolida en tiempo real las compras ejecutadas (OC aprobadas y recibidas) más las cotizaciones comprometidas en tránsito, mostrando el porcentaje de ejecución presupuestaria e impidiendo la sobreasignación de recursos no autorizados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
