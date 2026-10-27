import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTenants,
  useTenantUsage,
  useCreateTenant,
  useUpdateTenant,
  useImpersonateTenant,
  useBackendAdmins,
  useCreateBackendAdmin,
  Tenant,
} from '../../api/tenants';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../stores/auth.store';
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
  Eye,
  ShieldCheck,
  ExternalLink,
  Crown,
  KeyRound,
  Send,
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

export function MasterPortalPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, impersonateTenant } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'empresas' | 'admins' | 'metricas'>('empresas');

  // Queries
  const { data: tenants, isLoading: loadingTenants } = useTenants();
  const { data: backendAdmins, isLoading: loadingAdmins } = useBackendAdmins();
  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();
  const impersonateMutation = useImpersonateTenant();
  const createAdminMutation = useCreateBackendAdmin();

  // Modals
  const [selectedTenantForUsage, setSelectedTenantForUsage] = useState<string | null>(null);
  const [isCreateTenantModalOpen, setIsCreateTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // Tenant Form
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
  // Initial Admin User Provisioning
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminName, setFormAdminName] = useState('');
  const [formAdminPassword, setFormAdminPassword] = useState('');
  const [formSendWelcomeEmail, setFormSendWelcomeEmail] = useState(true);

  // Admin Form
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormName, setAdminFormName] = useState('');
  const [adminFormPassword, setAdminFormPassword] = useState('');

  const { data: usageData, isLoading: loadingUsage } = useTenantUsage(
    selectedTenantForUsage || undefined,
  );

  const openCreateTenantModal = () => {
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
    setFormAdminEmail('');
    setFormAdminName('');
    setFormAdminPassword('');
    setFormSendWelcomeEmail(true);
    setIsCreateTenantModalOpen(true);
  };

  const openEditTenantModal = (t: Tenant) => {
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
    setFormAdminEmail('');
    setFormAdminName('');
    setFormAdminPassword('');
    setFormSendWelcomeEmail(false);
    setIsCreateTenantModalOpen(true);
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
        toast.success('Empresa cliente actualizada correctamente');
      } else {
        const res = await createTenantMutation.mutateAsync({
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
          adminEmail: formAdminEmail.trim() || undefined,
          adminName: formAdminName.trim() || undefined,
          adminInitialPassword: formAdminPassword.trim() || undefined,
          sendWelcomeEmail: formSendWelcomeEmail,
        });

        if (res.initialUser?.tempPassword) {
          toast.success(
            `Empresa creada con admin inicial: ${res.initialUser.email} (Clave: ${res.initialUser.tempPassword})`,
          );
        } else {
          toast.success('Nueva empresa cliente creada exitosamente');
        }
      }
      setIsCreateTenantModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar empresa');
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      const res = await impersonateMutation.mutateAsync(tenant.id);
      impersonateTenant(res);
      toast.success(`Accediendo a workspace de ${tenant.name}`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al ingresar al workspace del cliente');
    }
  };

  const handleCreateBackendAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFormEmail.trim() || !adminFormName.trim() || !adminFormPassword.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    try {
      await createAdminMutation.mutateAsync({
        email: adminFormEmail.trim(),
        name: adminFormName.trim(),
        password: adminFormPassword.trim(),
      });
      toast.success('Administrador maestro KATEI creado con éxito');
      setIsCreateAdminModalOpen(false);
      setAdminFormEmail('');
      setAdminFormName('');
      setAdminFormPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al crear administrador maestro');
    }
  };

  // Metrics summary
  const totalTenants = tenants?.length || 0;
  const activeTenants = tenants?.filter((t) => t.status === 'ACTIVO').length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top SaaS Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
            <Crown size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">KATEI &bull; Portal Maestro SaaS</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest">
                Control Plane
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Consola central de aprovisionamiento de clientes, planes comerciales, auditoría y monitoreo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <ExternalLink size={14} className="mr-1.5" />
            Ir a Plataforma Operativa
          </Button>
          <div className="text-right hidden sm:block border-l border-slate-800 pl-4">
            <div className="text-xs font-semibold text-slate-200">{user?.name}</div>
            <div className="text-[10px] text-blue-400 font-mono">SUPER_USUARIO</div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Empresas Clientes</div>
          <div className="text-2xl font-black text-white mt-1">{totalTenants}</div>
          <div className="text-[10px] text-emerald-400 mt-1">{activeTenants} activas actualmente</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Planes Enterprise</div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {tenants?.filter((t) => t.planTier === 'ENTERPRISE').length || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Suscripciones full</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Planes Pro & Básicos</div>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {(tenants?.filter((t) => t.planTier === 'PRO').length || 0) +
              (tenants?.filter((t) => t.planTier === 'BASICO').length || 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Constructoras estándar</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Staff Maestro</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{backendAdmins?.length || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Super usuarios autorizados</div>
        </div>
      </div>

      {/* Master Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('empresas')}
            className={`py-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'empresas'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 size={16} />
            <span>Empresas Clientes ({totalTenants})</span>
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'admins'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Usuarios Backend de Administración ({backendAdmins?.length || 0})</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Empresas Clientes */}
      {activeTab === 'empresas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Listado de Constructoras & Empresas Registradas</h2>
            <Button
              onClick={openCreateTenantModal}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Plus size={16} />
              Nueva Empresa Cliente
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            {loadingTenants ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando empresas clientes...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">Slug / Dominio</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Capacidad Usr / Flota</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones de Monitoreo & Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {tenants?.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <Building2 size={16} className="text-blue-400 shrink-0" />
                            <div>
                              <div className="text-sm">{t.name}</div>
                              {t.rut && <div className="text-[11px] text-slate-500 font-normal">RUT: {t.rut}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <code className="text-blue-400 bg-blue-950/40 border border-blue-900/60 px-2 py-0.5 rounded font-mono">
                            {t.slug}
                          </code>
                          {t.contactEmail && (
                            <div className="text-[10px] text-slate-500 mt-1">{t.contactEmail}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              t.planTier === 'ENTERPRISE'
                                ? 'bg-purple-900/40 text-purple-300 border border-purple-800/60'
                                : t.planTier === 'PRO'
                                ? 'bg-blue-900/40 text-blue-300 border border-blue-800/60'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            <Sparkles size={10} />
                            {t.planTier}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">
                            {t._count?.users || 0} / {t.maxUsers} usuarios
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {t._count?.assets || 0} / {t.maxAssets} maquinarias
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.status === 'ACTIVO'
                                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50'
                                : 'bg-rose-900/30 text-rose-400 border border-rose-800/50'
                            }`}
                          >
                            {t.status === 'ACTIVO' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleImpersonate(t)}
                              className="text-xs h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1"
                              title="Ingresar y visualizar plataforma exactamente como este cliente"
                            >
                              <Eye size={13} />
                              Monitorear
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTenantForUsage(t.id)}
                              className="text-xs h-7 px-2 border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1"
                            >
                              <Activity size={12} className="text-blue-400" />
                              Consumo
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditTenantModal(t)}
                              className="text-xs h-7 px-2 border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1"
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
        </div>
      )}

      {/* Tab 2: Usuarios Backend de Administración */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Administradores Maestros KATEI (Super Usuarios)</h2>
              <p className="text-xs text-slate-400">
                Usuarios con credenciales maestras para acceder a este Portal y controlar todo el ecosistema.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateAdminModalOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Plus size={16} />
              Nuevo Administrador Maestro
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            {loadingAdmins ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando administradores...</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Nombre / Administrador</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Rol Maestro</th>
                    <th className="py-3 px-4">Fecha Alta</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {backendAdmins?.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Crown size={15} className="text-amber-400 shrink-0" />
                          <span>{adm.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{adm.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[10px] font-bold">
                          SUPER_USUARIO
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(adm.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                          <CheckCircle size={10} />
                          ACTIVO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Tenant with Admin Provisioning */}
      {isCreateTenantModalOpen && (
        <Modal
          isOpen={isCreateTenantModalOpen}
          onClose={() => setIsCreateTenantModalOpen(false)}
          title={editingTenant ? `Editar Empresa: ${editingTenant.name}` : 'Aprovisionar Nueva Empresa Cliente'}
          size="xl"
        >
          <form onSubmit={handleSaveTenant} className="space-y-4 py-2 text-xs">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
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
                <label className="block text-slate-300 font-semibold mb-1">
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
                <label className="block text-slate-300 font-semibold mb-1">
                  RUT Empresa
                </label>
                <Input
                  value={formRut}
                  onChange={(e) => setFormRut(e.target.value)}
                  placeholder="76.123.456-7"
                />
              </div>
            </div>

            {/* Plan Tier */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Plan Comercial Asignado
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['BASICO', 'PRO', 'ENTERPRISE', 'PERSONALIZADO'] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => handlePlanChange(plan)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      formPlan === plan
                        ? 'border-blue-500 bg-blue-950/40 text-blue-400 font-bold'
                        : 'border-slate-800 hover:bg-slate-800 text-slate-400'
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

            {/* Modules Checkboxes */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Módulos Habilitados en este Workspace ({formSelectedModules.length} activos)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-900 rounded-lg border border-slate-800">
                {ALL_SYSTEM_MODULES.map((mod) => {
                  const isChecked = formSelectedModules.includes(mod);
                  return (
                    <label key={mod} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleModule(mod)}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[11px] font-medium">{mod}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Provision Initial Admin User (Only on Create) */}
            {!editingTenant && (
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <KeyRound size={15} />
                  <span>Primer Usuario Administrador del Cliente</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Email del Administrador *</label>
                    <Input
                      type="email"
                      value={formAdminEmail}
                      onChange={(e) => setFormAdminEmail(e.target.value)}
                      placeholder="admin@constructora.cl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nombre Completo</label>
                    <Input
                      value={formAdminName}
                      onChange={(e) => setFormAdminName(e.target.value)}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Contraseña Inicial (Opcional)</label>
                    <Input
                      type="text"
                      value={formAdminPassword}
                      onChange={(e) => setFormAdminPassword(e.target.value)}
                      placeholder="Autogenerada si se omite"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-300">
                  <input
                    type="checkbox"
                    checked={formSendWelcomeEmail}
                    onChange={(e) => setFormSendWelcomeEmail(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] flex items-center gap-1.5">
                    <Send size={12} className="text-blue-400" />
                    Enviar correo de bienvenida con instrucciones y credenciales vía Brevo
                  </span>
                </label>
              </div>
            )}

            {/* Quotas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Máx Usuarios</label>
                <Input
                  type="number"
                  value={formMaxUsers}
                  onChange={(e) => setFormMaxUsers(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Máx Flota / Equipos</label>
                <Input
                  type="number"
                  value={formMaxAssets}
                  onChange={(e) => setFormMaxAssets(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Máx Emails Mensuales</label>
                <Input
                  type="number"
                  value={formMaxEmails}
                  onChange={(e) => setFormMaxEmails(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Máx Telegram Mensual</label>
                <Input
                  type="number"
                  value={formMaxMessages}
                  onChange={(e) => setFormMaxMessages(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateTenantModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createTenantMutation.isPending || updateTenantMutation.isPending}
              >
                {editingTenant ? 'Actualizar Empresa' : 'Aprovisionar Empresa'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Create Backend Admin */}
      {isCreateAdminModalOpen && (
        <Modal
          isOpen={isCreateAdminModalOpen}
          onClose={() => setIsCreateAdminModalOpen(false)}
          title="Crear Nuevo Administrador Maestro KATEI"
          size="md"
        >
          <form onSubmit={handleCreateBackendAdmin} className="space-y-4 py-2 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
              <Input
                value={adminFormName}
                onChange={(e) => setAdminFormName(e.target.value)}
                placeholder="Ej: Marcelo Operaciones"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico *</label>
              <Input
                type="email"
                value={adminFormEmail}
                onChange={(e) => setAdminFormEmail(e.target.value)}
                placeholder="marcelo@katei.cl"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contraseña Maestra *</label>
              <Input
                type="password"
                value={adminFormPassword}
                onChange={(e) => setAdminFormPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateAdminModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createAdminMutation.isPending}
              >
                Crear Super Usuario
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Usage & Consumption */}
      {selectedTenantForUsage && (
        <Modal
          isOpen={!!selectedTenantForUsage}
          onClose={() => setSelectedTenantForUsage(null)}
          title="Auditoría de Consumo & Costos de Cliente"
          size="lg"
        >
          {loadingUsage ? (
            <div className="p-6 text-center text-sm text-slate-500">Calculando métricas...</div>
          ) : usageData ? (
            <div className="space-y-4 py-2 text-xs text-slate-300">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-sm font-bold text-white">{usageData.tenantName}</div>
                  <div className="text-slate-500">
                    Período: <strong>{usageData.billingPeriod}</strong> &bull; Plan: <strong>{usageData.planTier}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-blue-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Mail size={13} /> Brevo Emails
                    </span>
                    <span>{usageData.percentages.emailsPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {usageData.monthlyConsumption.emailsSent}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyEmails}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-sky-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={13} /> Telegram
                    </span>
                    <span>{usageData.percentages.messagesPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {usageData.monthlyConsumption.messagesSent}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyMessages}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-purple-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles size={13} /> Tokens IA
                    </span>
                    <span>{usageData.percentages.aiTokensPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {usageData.monthlyConsumption.aiTokensUsed.toLocaleString()}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyAiTokens.toLocaleString()}</span>
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
    </div>
  );
}
