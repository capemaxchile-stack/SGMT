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
  Server,
  Code2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function DocumentacionPage() {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', title: '1. Visión & Arquitectura SGMT', icon: <Server size={18} /> },
    { id: 'faenas', title: '2. Faenas & Centros de Costo', icon: <Layers size={18} /> },
    { id: 'flota', title: '3. Flota & Maquinaria Pesada', icon: <Truck size={18} /> },
    { id: 'mantenimiento', title: '4. Mantenimiento & OTs', icon: <Wrench size={18} /> },
    { id: 'combustible', title: '5. Combustible & Diésel', icon: <Fuel size={18} /> },
    { id: 'bodega', title: '6. Bodega, Kardex & PMP', icon: <Box size={18} /> },
    { id: 'compras', title: '7. Compras & Súper Usuario', icon: <ShoppingCart size={18} /> },
    { id: 'roles', title: '8. Matriz de Roles & Seguridad', icon: <ShieldCheck size={18} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="text-blue-600 dark:text-blue-400" size={26} />
            Manual y Documentación Operativa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Guía completa de arquitectura, flujos operativos, procedimientos estándar y roles del sistema SGMT
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Index */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
              Índice de Módulos
            </div>
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                  activeSection === sec.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {sec.icon}
                <span>{sec.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Section 1: General & Architecture */}
          {activeSection === 'general' && (
            <div className="space-y-4">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Server className="text-blue-600" size={22} />
                    Arquitectura y Principios de Diseño
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p>
                    <strong>SGMT (Sistema de Gestión de Movimiento de Tierra)</strong> está construido bajo una arquitectura limpia y desacoplada para garantizar alta concurrencia, tolerancia a fallos e integridad transaccional en operaciones de faena.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                        <Code2 size={16} className="text-blue-500" /> Backend NestJS + Prisma
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Modularizado por dominios (Faenas, Flota, Bodega, Compras, Mantenimiento, Combustible, Auditoría). Base de datos PostgreSQL 16 con transacciones ACID.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                        <ShieldCheck size={16} className="text-emerald-500" /> Bitácora de Auditoría Inmutable
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Trigger nativo de PostgreSQL (<code>trg_audit_log_immutable</code>) que prohíbe cualquier mutación o borrado de registros de auditoría forense.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section 2: Faenas */}
          {activeSection === 'faenas' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="text-blue-600" size={22} />
                  Gestión de Faenas, Contratos y Centros de Costo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Las faenas representan los frentes de trabajo operativos de movimiento de tierra (ej: faenas mineras, viales o excavaciones urbanas).
                </p>
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Ciclo de Vida de una Faena:</h4>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <li><strong>EN FORMACIÓN:</strong> Faena creada, asignación preliminar de jefe de faena y contratos.</li>
                    <li><strong>ACTIVA:</strong> Operación plena con recepción de maquinaria, consumo de diésel y pedidos de compras.</li>
                    <li><strong>EN CIERRE / CERRADA:</strong> Desmovilización de flota y liquidación final de inventarios.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Flota */}
          {activeSection === 'flota' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Truck className="text-blue-600" size={22} />
                  Control de Flota y Maquinaria Pesada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  El módulo de flota centraliza el inventario físico de maquinaria pesada (Excavadoras, Bulldozers, Camiones Tolva, Motoniveladoras, Camionetas).
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/50 text-xs">
                  <strong>Horómetro y Kilometraje:</strong> Son los dos odómetros base que alimentan las alertas de mantenimiento y el cálculo de rendimiento de combustible en tiempo real.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Mantenimiento */}
          {activeSection === 'mantenimiento' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wrench className="text-blue-600" size={22} />
                  Mantenimiento Preventivo, Correctivo y OTs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Estandariza los protocolos de servicio mecánico y la rebaja de repuestos de bodega.
                </p>
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Flujo de Trabajo de una OT:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                    <li>Detección por <strong>Radar de Vencimientos</strong> o reporte de falla de terreno.</li>
                    <li>Generación de la <strong>Orden de Trabajo</strong> y asignación a taller o mecánico.</li>
                    <li>Carga de repuestos (filtros, aceites, pernos) con rebaja automática de inventario en Kardex.</li>
                    <li>Cierre técnico de la OT con ingreso de horómetro final y retorno automático del equipo a <strong>OPERATIVO</strong>.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 5: Combustible */}
          {activeSection === 'combustible' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Fuel className="text-amber-500" size={22} />
                  Control de Combustible y Rendimiento (Diésel)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Monitoreo de consumos de petróleo por camión aljibe o estanque fijo.
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50 text-xs">
                  <strong>Fórmula de Rendimiento:</strong>
                  <br />
                  <code>Litros por Hora (L/h) = Litros Cargados / (Horómetro Actual - Horómetro Anterior)</code>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 6: Bodega */}
          {activeSection === 'bodega' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Box className="text-blue-600" size={22} />
                  Bodega, Kardex Físico y Precio Medio Ponderado (PMP)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Administración de almacenes centrales y de faena con valorización continua de inventario mediante PMP.
                </p>
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Tipos de Movimientos:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>INGRESO:</strong> Recepción de compras con actualización del costo medio ponderado.</li>
                    <li><strong>SALIDA:</strong> Consumo en faena, mantención o carga de combustible (valida stock disponible).</li>
                    <li><strong>TRANSFER:</strong> Traslado atómico entre bodegas.</li>
                    <li><strong>AJUSTE:</strong> Corrección de inventario físico.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 7: Compras */}
          {activeSection === 'compras' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="text-blue-600" size={22} />
                  Ciclo de Compras y Excepción Súper Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Flujo de abastecimiento desde la solicitud en terreno hasta la recepción conforme en bodega.
                </p>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-900/50 text-xs">
                  <strong>Aprobación por Excepción (Doble Autenticación):</strong>
                  <br />
                  Los usuarios con rol <code>SUPER_USUARIO</code> pueden desbloquear órdenes de compra extraordinarias ingresando su clave maestra especial de seguridad (<code>superKey</code>).
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 8: Roles */}
          {activeSection === 'roles' && (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" size={22} />
                  Matriz de Roles y Atribuciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="p-2.5">Rol</th>
                        <th className="p-2.5">Nivel</th>
                        <th className="p-2.5">Límite Aprobación</th>
                        <th className="p-2.5">Alcance Operativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="p-2 font-bold">SOLICITANTE_TERRENO</td>
                        <td className="p-2">1</td>
                        <td className="p-2">Sin monto</td>
                        <td className="p-2">Crea solicitudes de compra para su faena</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">BODEGUERO</td>
                        <td className="p-2">1</td>
                        <td className="p-2">Sin monto</td>
                        <td className="p-2">Recepciona OCs, realiza movimientos y despachos de diésel</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">JEFE_FAENA</td>
                        <td className="p-2">3</td>
                        <td className="p-2">$1.000.000</td>
                        <td className="p-2">Aprueba compras operativas y gestiona OTs en terreno</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">GERENTE_OPERACIONES</td>
                        <td className="p-2">4</td>
                        <td className="p-2">$5.000.000</td>
                        <td className="p-2">Supervisa asignaciones de flota, compras mayores y pautas</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">SUPER_USUARIO</td>
                        <td className="p-2">99</td>
                        <td className="p-2">Ilimitado</td>
                        <td className="p-2">Aprobaciones extraordinarias por excepción con clave maestra</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">ADMIN_SISTEMA</td>
                        <td className="p-2">100</td>
                        <td className="p-2">Ilimitado</td>
                        <td className="p-2">Gestión de usuarios, auditoría forense y configuración</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
