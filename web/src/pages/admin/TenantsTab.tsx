import React, { useState } from 'react';
import {
  useTenants,
  useTenantUsage,
  useCreateTenant,
  useUpdateTenant,
  Tenant,
} from '../../api/tenants';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import {
  Building2,
  Plus,
  Activity,
  Sparkles,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Edit2,
} from 'lucide-react';

const ALL_SYSTEM_MODULES = [
  'DASHBOARD',
  'FAENAS',
  'FLOTA',
  'CERTIFICACIONES',
  'MANTENIMIENTO',
  'COMBUSTIBLE',
  'BODEGA',
  'COMPRAS',
  'REPORTES',
  'TERRENO',
  'COPILOT',
  'DOCUMENTACION',
  'ADMINISTRACION',
];

const PRESET_MODULES: Record<string, string[]> = {
  BASICO: ['DASHBOARD', 'FAENAS', 'FLOTA', 'CERTIFICACIONES', 'REPORTES'],
  PRO: [
    'DASHBOARD',
    'FAENAS',
    'FLOTA',
    'CERTIFICACIONES',
    'MANTENIMIENTO',
    'COMBUSTIBLE',
    'BODEGA',
    'REPORTES',
    'TERRENO',
  ],
  ENTERPRISE: [
    'DASHBOARD',
    'FAENAS',
    'FLOTA',
    'CERTIFICACIONES',
    'MANTENIMIENTO',
    'COMBUSTIBLE',
    'BODEGA',
    'COMPRAS',
    'REPORTES',
    'TERRENO',
    'COPILOT',
    'ADMINISTRACION',
  ],
  PERSONALIZADO: [],
};

export function TenantsTab() {
  const { data: tenants, isLoading, error } = useTenants();
  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();
  const toast = useToast();

  const [selectedTenantForUsage, setSelectedTenantForUsage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formRut, setFormRut] = useState('');
  const [formPlan, setFormPlan] = useState<'BASICO' | 'PRO' | 'ENTERPRISE' | 'PERSONALIZADO'>('PRO');
  const [formSelectedModules, setFormSelectedModules] = useState<string[]>(PRESET_MODULES.PRO);
  const [formMaxUsers, setFormMaxUsers] = useState(20);
  const [formMaxAssets, setFormMaxAssets] = useState(50);
  const [formMaxEmails, setFormMaxEmails] = useState(500);
  const [formMaxMessages, setFormMaxMessages] = useState(1000);
  const [formContactName, setFormContactName] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');

  const { data: usageData, isLoading: loadingUsage } = useTenantUsage(
    selectedTenantForUsage || undefined,
  );

  const openCreateModal = () => {
    setEditingTenant(null);
    setFormName('');
    setFormSlug('');
    setFormRut('');
    setFormPlan('PRO');
    setFormSelectedModules(PRESET_MODULES.PRO);
    setFormMaxUsers(20);
    setFormMaxAssets(50);
    setFormMaxEmails(500);
    setFormMaxMessages(1000);
    setFormContactName('');
    setFormContactEmail('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setFormName(t.name);
    setFormSlug(t.slug);
    setFormRut(t.rut || '');
    setFormPlan(t.planTier);
    setFormSelectedModules(t.enabledModules || []);
    setFormMaxUsers(t.maxUsers);
    setFormMaxAssets(t.maxAssets);
    setFormMaxEmails(t.maxMonthlyEmails);
    setFormMaxMessages(t.maxMonthlyMessages);
    setFormContactName(t.contactName || '');
    setFormContactEmail(t.contactEmail || '');
    setIsCreateModalOpen(true);
  };

  const handlePlanChange = (plan: 'BASICO' | 'PRO' | 'ENTERPRISE' | 'PERSONALIZADO') => {
    setFormPlan(plan);
    if (plan !== 'PERSONALIZADO') {
      setFormSelectedModules(PRESET_MODULES[plan]);
    }
  };

  const toggleModule = (mod: string) => {
    setFormPlan('PERSONALIZADO');
    if (formSelectedModules.includes(mod)) {
      setFormSelectedModules(formSelectedModules.filter((m) => m !== mod));
    } else {
      setFormSelectedModules([...formSelectedModules, mod]);
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      toast.error('El nombre y el slug de la empresa son obligatorios');
      return;
    }

    try {
      if (editingTenant) {
        await updateTenantMutation.mutateAsync({
          id: editingTenant.id,
          data: {
            name: formName.trim(),
            slug: formSlug.trim(),
            rut: formRut.trim() || undefined,
            planTier: formPlan,
            enabledModules: formSelectedModules,
            maxUsers: Number(formMaxUsers),
            maxAssets: Number(formMaxAssets),
            maxMonthlyEmails: Number(formMaxEmails),
            maxMonthlyMessages: Number(formMaxMessages),
            contactName: formContactName.trim() || undefined,
            contactEmail: formContactEmail.trim() || undefined,
          },
        });
        toast.success('Empresa actualizada correctamente');
      } else {
        await createTenantMutation.mutateAsync({
          name: formName.trim(),
          slug: formSlug.trim(),
          rut: formRut.trim() || undefined,
          planTier: formPlan,
          enabledModules: formSelectedModules,
          maxUsers: Number(formMaxUsers),
          maxAssets: Number(formMaxAssets),
          maxMonthlyEmails: Number(formMaxEmails),
          maxMonthlyMessages: Number(formMaxMessages),
          contactName: formContactName.trim() || undefined,
          contactEmail: formContactEmail.trim() || undefined,
        });
        toast.success('Nueva empresa cliente creada exitosamente');
      }
      setIsCreateModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar empresa');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-white">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="text-blue-400 w-5 h-5" />
            <h2 className="text-base font-bold text-slate-100">Gestión Multi-Empresa & Planes KATEI</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Administración centralizada de clientes, planes contratados, control de módulos y métricas de consumo.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={16} />
          Nueva Empresa Cliente
        </Button>
      </div>

      {/* Tenants Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Empresas Registradas ({tenants?.length || 0})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Cargando empresas clientes...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">Error al cargar listado de empresas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Identificador / RUT</th>
                  <th className="py-3 px-4">Plan Actual</th>
                  <th className="py-3 px-4">Módulos Activos</th>
                  <th className="py-3 px-4 text-center">Usuarios / Flota</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {tenants?.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400 shrink-0" />
                        <div>
                          <div>{t.name}</div>
                          {t.contactEmail && (
                            <div className="text-[10px] text-slate-400 font-normal">{t.contactEmail}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">
                        {t.slug}
                      </code>
                      {t.rut && <div className="text-[10px] text-slate-400 mt-0.5">{t.rut}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.planTier === 'ENTERPRISE'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : t.planTier === 'PRO'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : t.planTier === 'BASICO'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}
                      >
                        <Sparkles size={10} />
                        {t.planTier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {t.enabledModules?.slice(0, 4).map((mod) => (
                          <span
                            key={mod}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-medium"
                          >
                            {mod}
                          </span>
                        ))}
                        {(t.enabledModules?.length || 0) > 4 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold">
                            +{(t.enabledModules?.length || 0) - 4} más
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-xs font-semibold">
                        {t._count?.users || 0} / {t.maxUsers} usr
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t._count?.assets || 0} / {t.maxAssets} eq
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.status === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}
                      >
                        {t.status === 'ACTIVO' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTenantForUsage(t.id)}
                          className="text-xs h-7 px-2 flex items-center gap-1"
                          title="Ver Consumo & Costos"
                        >
                          <Activity size={12} className="text-blue-500" />
                          Consumo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(t)}
                          className="text-xs h-7 px-2 flex items-center gap-1"
                          title="Editar Plan y Límites"
                        >
                          <Edit2 size={12} />
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage & Consumption Modal */}
      {selectedTenantForUsage && (
        <Modal
          isOpen={!!selectedTenantForUsage}
          onClose={() => setSelectedTenantForUsage(null)}
          title="Control de Consumo & Auditoría de Costos"
          size="lg"
        >
          {loadingUsage ? (
            <div className="p-6 text-center text-sm text-slate-500">Calculando consumo mensual...</div>
          ) : usageData ? (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {usageData.tenantName}
                  </div>
                  <div className="text-slate-500">
                    Período de Facturación: <strong>{usageData.billingPeriod}</strong> &bull; Plan: <strong>{usageData.planTier}</strong>
                  </div>
                </div>
              </div>

              {/* Consumption Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Mail size={14} /> Correos Brevo
                    </span>
                    <span>{usageData.percentages.emailsPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {usageData.monthlyConsumption.emailsSent}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyEmails}</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/40 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, Number(usageData.percentages.emailsPercent))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40">
                  <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} /> Telegram
                    </span>
                    <span>{usageData.percentages.messagesPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {usageData.monthlyConsumption.messagesSent}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyMessages}</span>
                  </div>
                  <div className="w-full bg-sky-200 dark:bg-sky-900/40 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-sky-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, Number(usageData.percentages.messagesPercent))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40">
                  <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles size={14} /> Tokens Copilot AI
                    </span>
                    <span>{usageData.percentages.aiTokensPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {usageData.monthlyConsumption.aiTokensUsed.toLocaleString()}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyAiTokens.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-900/40 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, Number(usageData.percentages.aiTokensPercent))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Resource Capacity */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Capacidad de Operación
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 text-[10px]">Usuarios Activos</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {usageData.currentCounts.users} / {usageData.limits.maxUsers}
                    </div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 text-[10px]">Flota / Maquinaria</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {usageData.currentCounts.assets} / {usageData.limits.maxAssets}
                    </div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 text-[10px]">Faenas Activas</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {usageData.currentCounts.faenas} / {usageData.limits.maxFaenas}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setSelectedTenantForUsage(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* Create / Edit Tenant Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={editingTenant ? `Editar Empresa: ${editingTenant.name}` : 'Crear Nueva Empresa Cliente'}
          size="xl"
        >
          <form onSubmit={handleSaveTenant} className="space-y-4 py-2 text-xs">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nombre Empresa *
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Constructora Austral SpA"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Slug (Identificador URL) *
                </label>
                <Input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="ej: austral"
                  disabled={!!editingTenant}
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  RUT Empresa
                </label>
                <Input
                  value={formRut}
                  onChange={(e) => setFormRut(e.target.value)}
                  placeholder="76.123.456-7"
                />
              </div>
            </div>

            {/* Plan Tier Selector */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Plan de Suscripción KATEI
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['BASICO', 'PRO', 'ENTERPRISE', 'PERSONALIZADO'] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => handlePlanChange(plan)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      formPlan === plan
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{plan}</span>
                      {formPlan === plan && <CheckCircle size={14} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configurable Modules */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Módulos Habilitados ({formSelectedModules.length} activos)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                {ALL_SYSTEM_MODULES.map((mod) => {
                  const isChecked = formSelectedModules.includes(mod);
                  return (
                    <label
                      key={mod}
                      className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-blue-500"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleModule(mod)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[11px] font-medium">{mod}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Quotas & Capacity Limits */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Límites de Capacidad y Recursos
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Máx Usuarios</label>
                  <Input
                    type="number"
                    value={formMaxUsers}
                    onChange={(e) => setFormMaxUsers(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Máx Flota / Equipos</label>
                  <Input
                    type="number"
                    value={formMaxAssets}
                    onChange={(e) => setFormMaxAssets(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Máx Emails Mensuales</label>
                  <Input
                    type="number"
                    value={formMaxEmails}
                    onChange={(e) => setFormMaxEmails(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Máx Mensajes Telegram</label>
                  <Input
                    type="number"
                    value={formMaxMessages}
                    onChange={(e) => setFormMaxMessages(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Contacto Comercial / Técnico
                </label>
                <Input
                  value={formContactName}
                  onChange={(e) => setFormContactName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Email de Facturación / Notificaciones
                </label>
                <Input
                  type="email"
                  value={formContactEmail}
                  onChange={(e) => setFormContactEmail(e.target.value)}
                  placeholder="juan.perez@empresa.cl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createTenantMutation.isPending || updateTenantMutation.isPending}
              >
                {editingTenant ? 'Actualizar Empresa' : 'Crear Empresa'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
