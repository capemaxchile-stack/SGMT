import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTenants,
  useTenantUsage,
  useCreateTenant,
  useUpdateTenant,
  useImpersonateTenant,
  useBackendAdmins,
  useCreateBackendAdmin,
  useCommercialPlans,
  useSaveCommercialPlans,
  useResetBackendAdminPassword,
  useTenantBusinessProfile,
  downloadTenantBackup,
  Tenant,
  CommercialPlanConfig,
} from '../../api/tenants';
import { useAuditLogs, AuditLog } from '../../api/audit';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore } from '../../stores/theme.store';
import { exportToCSV } from '../../lib/export';
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
  Download,
  AlertTriangle,
  Sun,
  Moon,
  PauseCircle,
  PlayCircle,
  CheckSquare,
  Square,
  BookOpen,
  Layers,
  FileText,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
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
    'DOCUMENTACION',
    'ADMINISTRACION',
  ],
  PERSONALIZADO: [],
};

export function MasterPortalPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, impersonateTenant } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'empresas' | 'planes' | 'auditoria' | 'guia_alta' | 'admins'>('empresas');

  // Queries
  const { data: tenants, isLoading: loadingTenants } = useTenants();
  const { data: backendAdmins, isLoading: loadingAdmins } = useBackendAdmins();
  const { data: commercialPlans, isLoading: loadingPlans } = useCommercialPlans();
  const { data: auditLogs, isLoading: loadingAudit } = useAuditLogs();

  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();
  const impersonateMutation = useImpersonateTenant();
  const createAdminMutation = useCreateBackendAdmin();
  const savePlansMutation = useSaveCommercialPlans();
  const resetAdminPassMutation = useResetBackendAdminPassword();

  // Modals & State
  const [selectedTenantForUsage, setSelectedTenantForUsage] = useState<string | null>(null);
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState<string | null>(null);
  const [isCreateTenantModalOpen, setIsCreateTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [exportingTenantId, setExportingTenantId] = useState<string | null>(null);

  // Admin Password Reset Modal State
  const [resetAdminUser, setResetAdminUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Plans Edit Modal State
  const [isEditPlansModalOpen, setIsEditPlansModalOpen] = useState(false);
  const [editingPlansList, setEditingPlansList] = useState<CommercialPlanConfig[]>([]);

  // Audit Detail Modal State
  const [selectedLogDetail, setSelectedLogDetail] = useState<AuditLog | null>(null);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditTenantFilter, setAuditTenantFilter] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('');

  // Tenant Form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formRut, setFormRut] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVO' | 'SUSPENDIDO' | 'EN_PRUEBA' | 'CANCELADO'>('ACTIVO');
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

  // Checklist state for Onboarding Guide
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    chk1: false,
    chk2: false,
    chk3: false,
    chk4: false,
    chk5: false,
  });

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: usageData, isLoading: loadingUsage } = useTenantUsage(
    selectedTenantForUsage || undefined,
  );

  const { data: businessProfile, isLoading: loadingProfile } = useTenantBusinessProfile(
    selectedTenantForProfile,
  );

  const openCreateTenantModal = (preselectedPlan?: 'BASICO' | 'PRO' | 'ENTERPRISE') => {
    const targetPlan = preselectedPlan || 'PRO';
    setEditingTenant(null);
    setFormName('');
    setFormSlug('');
    setFormRut('');
    setFormStatus('ACTIVO');
    setFormPlan(targetPlan);
    setFormSelectedModules(PRESET_MODULES[targetPlan] || PRESET_MODULES.PRO);
    setFormMaxUsers(targetPlan === 'BASICO' ? 5 : targetPlan === 'ENTERPRISE' ? 999 : 20);
    setFormMaxAssets(targetPlan === 'BASICO' ? 10 : targetPlan === 'ENTERPRISE' ? 999 : 50);
    setFormMaxEmails(targetPlan === 'BASICO' ? 200 : targetPlan === 'ENTERPRISE' ? 10000 : 500);
    setFormMaxMessages(targetPlan === 'BASICO' ? 500 : targetPlan === 'ENTERPRISE' ? 20000 : 1000);
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
    setFormStatus(t.status);
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
      const matchConfig = commercialPlans?.find((p) => p.tier === plan);
      if (matchConfig) {
        setFormSelectedModules(matchConfig.enabledModules);
        setFormMaxUsers(matchConfig.maxUsers);
        setFormMaxAssets(matchConfig.maxAssets);
        setFormMaxEmails(matchConfig.maxMonthlyEmails);
        setFormMaxMessages(matchConfig.maxMonthlyMessages);
      } else {
        setFormSelectedModules(PRESET_MODULES[plan] || []);
        if (plan === 'BASICO') {
          setFormMaxUsers(5);
          setFormMaxAssets(10);
        } else if (plan === 'PRO') {
          setFormMaxUsers(20);
          setFormMaxAssets(50);
        } else if (plan === 'ENTERPRISE') {
          setFormMaxUsers(999);
          setFormMaxAssets(999);
        }
      }
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
            status: formStatus,
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
          status: formStatus,
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

  const handleToggleStatus = async (tenant: Tenant, targetStatus: 'ACTIVO' | 'SUSPENDIDO' | 'CANCELADO') => {
    try {
      await updateTenantMutation.mutateAsync({
        id: tenant.id,
        data: { status: targetStatus },
      });
      if (targetStatus === 'SUSPENDIDO') {
        toast.warning(`Empresa "${tenant.name}" suspendida por regularización comercial`);
      } else if (targetStatus === 'ACTIVO') {
        toast.success(`Empresa "${tenant.name}" reactivada exitosamente`);
      } else {
        toast.info(`Empresa "${tenant.name}" cancelada/inactiva`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado de la empresa');
    }
  };

  const handleExportBackup = async (tenant: Tenant) => {
    try {
      setExportingTenantId(tenant.id);
      toast.info(`Generando exportación de datos para ${tenant.name}...`);
      await downloadTenantBackup(tenant.id, tenant.slug);
      toast.success(`Backup descargado con éxito`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al exportar datos de la empresa');
    } finally {
      setExportingTenantId(null);
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

  const handleResetAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAdminUser || !newAdminPassword || newAdminPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      const res = await resetAdminPassMutation.mutateAsync({
        id: resetAdminUser.id,
        newPassword: newAdminPassword,
      });
      toast.success(res.message);
      setResetAdminUser(null);
      setNewAdminPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al reestablecer contraseña');
    }
  };

  const handleOpenEditPlans = () => {
    if (commercialPlans) {
      setEditingPlansList(JSON.parse(JSON.stringify(commercialPlans)));
    }
    setIsEditPlansModalOpen(true);
  };

  const handleSavePlansSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePlansMutation.mutateAsync(editingPlansList);
      toast.success('Catálogo de planes comerciales actualizado correctamente');
      setIsEditPlansModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar catálogo de planes');
    }
  };

  // Filtered Audit Logs
  const uniqueEntities = useMemo(() => {
    if (!auditLogs) return [];
    const set = new Set<string>();
    auditLogs.forEach((l) => {
      if (l.entity) set.add(l.entity);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs.filter((log) => {
      if (auditTenantFilter) {
        const tId = log.user?.tenantId || (log.user?.tenant as any)?.id;
        if (tId !== auditTenantFilter) return false;
      }
      if (auditEntityFilter && log.entity !== auditEntityFilter) {
        return false;
      }
      if (auditSearchTerm.trim()) {
        const term = auditSearchTerm.toLowerCase();
        const userStr = (log.user?.name || log.userId || '').toLowerCase();
        const tenantStr = (log.user?.tenant?.name || '').toLowerCase();
        const entityStr = (log.entity || '').toLowerCase();
        const actionStr = (log.action || '').toLowerCase();
        const ipStr = (log.ipAddress || '').toLowerCase();
        const detailStr = JSON.stringify(log.detail ?? log.details ?? '').toLowerCase();
        return (
          userStr.includes(term) ||
          tenantStr.includes(term) ||
          entityStr.includes(term) ||
          actionStr.includes(term) ||
          ipStr.includes(term) ||
          detailStr.includes(term)
        );
      }
      return true;
    });
  }, [auditLogs, auditTenantFilter, auditEntityFilter, auditSearchTerm]);

  const handleExportAuditLogs = () => {
    if (!filteredAuditLogs || filteredAuditLogs.length === 0) {
      toast.info('No hay registros para exportar');
      return;
    }
    exportToCSV(
      filteredAuditLogs,
      [
        { header: 'ID', key: 'id' },
        { header: 'Fecha', key: (l) => l.timestamp || l.createdAt || '-' },
        { header: 'Empresa', key: (l) => l.user?.tenant?.name || 'Sistema / Staff' },
        { header: 'Usuario', key: (l) => l.user?.name || l.userId || 'Sistema' },
        { header: 'Acción', key: 'action' },
        { header: 'Entidad', key: 'entity' },
        { header: 'IP', key: (l) => l.ipAddress || '' },
        { header: 'Detalle', key: (l) => JSON.stringify(l.detail ?? l.details ?? '') },
      ],
      'KATEI_Auditoria_Global_SaaS',
    );
    toast.success('Bitácora global de SaaS exportada');
  };

  // Metrics summary
  const totalTenants = tenants?.length || 0;
  const activeTenants = tenants?.filter((t) => t.status === 'ACTIVO').length || 0;
  const suspendedTenants = tenants?.filter((t) => t.status === 'SUSPENDIDO').length || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 space-y-6 transition-colors">
      {/* Top SaaS Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 rounded-xl">
            <Crown size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                KATEI &bull; Portal Maestro SaaS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 uppercase tracking-widest">
                Control Plane
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Consola central de aprovisionamiento de clientes, planes comerciales, auditoría y monitoreo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <ExternalLink size={14} className="mr-1.5" />
            Ir a Plataforma Operativa
          </Button>

          <div className="text-right hidden sm:block border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user?.name}</div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">SUPER_USUARIO</div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Empresas Clientes
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalTenants}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
            {activeTenants} activas {suspendedTenants > 0 && `• ${suspendedTenants} suspendidas`}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Planes Enterprise
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {tenants?.filter((t) => t.planTier === 'ENTERPRISE').length || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Suscripciones corporativas full</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Planes Pro & Básicos
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {(tenants?.filter((t) => t.planTier === 'PRO').length || 0) +
              (tenants?.filter((t) => t.planTier === 'BASICO').length || 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Constructoras estándar</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Staff Maestro
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{backendAdmins?.length || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Super usuarios autorizados</div>
        </div>
      </div>

      {/* Master Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6 text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('empresas')}
            className={`py-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'empresas'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 size={16} />
            <span>Empresas Clientes ({totalTenants})</span>
          </button>
          <button
            onClick={() => setActiveTab('planes')}
            className={`py-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'planes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={16} />
            <span>Planes Comerciales ({commercialPlans?.length || 3})</span>
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`py-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'auditoria'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity size={16} />
            <span>Auditoría & Actividad Global</span>
          </button>
          <button
            onClick={() => setActiveTab('guia_alta')}
            className={`py-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'guia_alta'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen size={16} />
            <span>Instructivo & Checklist de Alta</span>
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'admins'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Usuarios Backend ({backendAdmins?.length || 0})</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Empresas Clientes */}
      {activeTab === 'empresas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Directorio Central de Constructoras & Empresas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Administrá suscripciones, visualizá fichas de negocio, monitoreá workspaces o exportá copias de seguridad.
              </p>
            </div>
            <Button
              onClick={() => openCreateTenantModal()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shrink-0"
            >
              <Plus size={16} />
              Nueva Empresa Cliente
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loadingTenants ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando empresas clientes...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">Slug / Acceso</th>
                      <th className="py-3 px-4">Plan Asignado</th>
                      <th className="py-3 px-4">Capacidad Usr / Flota</th>
                      <th className="py-3 px-4 text-center">Estado Comercial</th>
                      <th className="py-3 px-4 text-right">Acciones de Monitoreo & Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {tenants?.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <Building2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                            <div>
                              <div className="text-sm">{t.name}</div>
                              {t.rut && (
                                <div className="text-[11px] text-slate-500 font-mono font-normal">RUT: {t.rut}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <code className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-2 py-0.5 rounded font-mono">
                            {t.slug}
                          </code>
                          {t.contactEmail && (
                            <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]">
                              {t.contactEmail}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              t.planTier === 'ENTERPRISE'
                                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                                : t.planTier === 'PRO'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Sparkles size={10} />
                            {t.planTier}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {t._count?.users || 0} / {t.maxUsers} usuarios
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {t._count?.assets || 0} / {t.maxAssets} maquinarias
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {t.status === 'ACTIVO' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle size={11} />
                              ACTIVO
                            </span>
                          )}
                          {t.status === 'SUSPENDIDO' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                              <PauseCircle size={11} />
                              SUSPENDIDO (PAGO)
                            </span>
                          )}
                          {t.status === 'CANCELADO' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                              <XCircle size={11} />
                              CANCELADO
                            </span>
                          )}
                          {t.status === 'EN_PRUEBA' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                              DEMO / PRUEBA
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => handleImpersonate(t)}
                              className="text-xs h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1 shadow-sm"
                              title="Ingresar y monitorear workspace"
                            >
                              <Eye size={13} />
                              Monitorear
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTenantForProfile(t.id)}
                              className="text-xs h-7 px-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                              title="Ver ficha comercial y antigüedad del cliente"
                            >
                              <FileText size={12} className="text-purple-500" />
                              Ficha
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTenantForUsage(t.id)}
                              className="text-xs h-7 px-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                              title="Ver métricas de consumo de correos, mensajes e IA"
                            >
                              <Activity size={12} className="text-blue-500" />
                              Consumo
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportBackup(t)}
                              disabled={exportingTenantId === t.id}
                              className="text-xs h-7 px-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                              title="Descargar copia de seguridad en JSON"
                            >
                              <Download size={12} className="text-emerald-500" />
                              Backup
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditTenantModal(t)}
                              className="text-xs h-7 px-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                              title="Editar empresa y plan"
                            >
                              <Edit2 size={12} />
                              Editar
                            </Button>

                            {/* Quick status toggle */}
                            {t.status === 'ACTIVO' ? (
                              <button
                                onClick={() => handleToggleStatus(t, 'SUSPENDIDO')}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                                title="Suspender acceso por falta de pago"
                              >
                                <PauseCircle size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(t, 'ACTIVO')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                                title="Reactivar acceso al workspace"
                              >
                                <PlayCircle size={15} />
                              </button>
                            )}
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

      {/* Tab 2: Planes Comerciales Dinámicos */}
      {activeTab === 'planes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Catálogo de Planes Comerciales KATEI SaaS
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configurá precios, cuotas operativas y módulos habilitados por suscripción. Los cambios aplican de inmediato.
              </p>
            </div>
            <Button
              onClick={handleOpenEditPlans}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shrink-0"
            >
              <Edit2 size={15} />
              Editar Catálogo & Precios
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loadingPlans ? (
              <div className="col-span-3 p-8 text-center text-slate-500">Cargando catálogo comercial...</div>
            ) : (
              commercialPlans?.map((plan) => (
                <div
                  key={plan.id || plan.tier}
                  className={`rounded-2xl border p-6 flex flex-col justify-between shadow-sm relative transition-all bg-white dark:bg-slate-900 ${
                    plan.popular
                      ? 'border-blue-500/60 dark:border-blue-500/40 shadow-blue-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white shadow">
                      Más Vendido
                    </span>
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          plan.tier === 'ENTERPRISE'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : plan.tier === 'PRO'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {plan.tier}
                      </span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {plan.priceMonthly}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>

                    <div className="my-4 py-3 border-y border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Máx Usuarios:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {plan.maxUsers === 999 ? 'Ilimitados' : plan.maxUsers}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Máx Flota:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {plan.maxAssets === 999 ? 'Ilimitada' : `${plan.maxAssets} equipos`}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Emails Brevo:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{plan.maxMonthlyEmails} / mes</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Telegram:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{plan.maxMonthlyMessages} / mes</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Módulos Habilitados ({plan.enabledModules.length}):
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {plan.enabledModules.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button
                      onClick={() => openCreateTenantModal(plan.tier as any)}
                      className="w-full text-xs font-bold py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      Aprovisionar con {plan.tier}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Auditoría & Actividad Global SaaS */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Activity size={18} className="text-blue-600 dark:text-blue-400" />
                Bitácora de Auditoría & Trazabilidad Multicliente (Control Plane)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitoreo en tiempo real de eventos, transacciones de compras, altas de flota y sesiones en todos los clientes.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAuditLogs}
              className="flex items-center gap-1.5 text-xs shrink-0"
            >
              <Download size={14} />
              Exportar CSV
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            <div className="flex flex-1 flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por usuario, acción, empresa, entidad, IP o payload..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Tenant Filter */}
              <select
                value={auditTenantFilter}
                onChange={(e) => setAuditTenantFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              >
                <option value="">Todas las empresas clientes ({tenants?.length || 0})</option>
                {tenants?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Entity Filter */}
              <select
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              >
                <option value="">Todos los módulos ({uniqueEntities.length})</option>
                {uniqueEntities.map((ent) => (
                  <option key={ent} value={ent}>
                    {ent}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loadingAudit ? (
              <div className="p-8 text-center text-xs text-slate-500">Cargando bitácora de actividad global...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Fecha y Hora</th>
                      <th className="py-3 px-4">Empresa Cliente</th>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Entidad</th>
                      <th className="py-3 px-4">Operación</th>
                      <th className="py-3 px-4">IP</th>
                      <th className="py-3 px-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No se encontraron registros de auditoría coincidentes con los filtros
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => {
                        const actionUpper = (log.action || '').toUpperCase();
                        let badgeColor =
                          'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                        if (actionUpper.includes('DELETE') || actionUpper.includes('RECHAZ')) {
                          badgeColor =
                            'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
                        } else if (actionUpper.includes('CREATE') || actionUpper.includes('POST')) {
                          badgeColor =
                            'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                        } else if (actionUpper.includes('UPDATE') || actionUpper.includes('PATCH')) {
                          badgeColor =
                            'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                        }
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp || log.createdAt || '').toLocaleString('es-CL')}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {log.user?.tenant?.name ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[11px]">
                                  <Building2 size={12} />
                                  {log.user.tenant.name}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Staff Maestro KATEI</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {log.user?.name || log.userId || 'Sistema'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{log.user?.email}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {log.entity}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${badgeColor}`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{log.ipAddress || '-'}</td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLogDetail(log)}
                                className="text-xs h-6 px-2 text-blue-600 dark:text-blue-400"
                              >
                                <Eye size={12} className="mr-1" />
                                Detalle
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Instructivo & Checklist de Alta */}
      {activeTab === 'guia_alta' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
              Protocolo Estándar de Onboarding & Aprovisionamiento de Clientes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Guía paso a paso para dar de alta una nueva empresa constructora asegurando aislamiento de datos y entrega limpia de credenciales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Step 1 */}
              <div
                onClick={() => toggleCheck('chk1')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  checklist.chk1
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 text-emerald-600">
                    {checklist.chk1 ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-400" />}
                  </button>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Paso 1: Recopilación de Información Legal y Comercial
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Solicitar Razón Social, RUT de la empresa, nombre y correo del Administrador General, y faenas iniciales a gestionar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                onClick={() => toggleCheck('chk2')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  checklist.chk2
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 text-emerald-600">
                    {checklist.chk2 ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-400" />}
                  </button>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Paso 2: Selección de Plan y Capacidad Operativa
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Definir si requiere <strong>Básico</strong> (solo flota y faenas), <strong>Pro</strong> (con bodega, mantenimiento y terreno) o <strong>Enterprise</strong> (abastecimiento completo con IA Copilot).
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                onClick={() => toggleCheck('chk3')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  checklist.chk3
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 text-emerald-600">
                    {checklist.chk3 ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-400" />}
                  </button>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Paso 3: Creación en el Portal Maestro (Generación de Slug)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Ingresar a "Nueva Empresa Cliente", asignar el slug corto en minúsculas (ej: <code className="text-blue-600 font-mono">andes</code>), definir cuotas y datos del admin inicial.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div
                onClick={() => toggleCheck('chk4')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  checklist.chk4
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 text-emerald-600">
                    {checklist.chk4 ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-400" />}
                  </button>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Paso 4: Notificación y Despacho de Credenciales vía Brevo
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Mantener activado el switch <em>"Enviar correo de bienvenida"</em> para que el sistema envíe un email formal con URL, usuario y contraseña temporal al administrador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div
                onClick={() => toggleCheck('chk5')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  checklist.chk5
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 text-emerald-600">
                    {checklist.chk5 ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-400" />}
                  </button>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Paso 5: Monitoreo & Verificación de Workspace
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Hacer clic en <strong>"Monitorear"</strong> en la lista de empresas. Comprobar que en la cabecera aparezca el banner ámbar y que el menú lateral exhiba únicamente el nombre de la empresa y sus módulos contratados.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Practical Advice Card */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Buenas Prácticas de Operación SaaS
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
                  <li>
                    <strong>Suspensión en lugar de eliminación:</strong> Si un cliente presenta morosidad, utilizá el botón de suspender. Sus datos quedarán congelados y no podrán ingresar hasta regularizar.
                  </li>
                  <li>
                    <strong>Backups periódicos:</strong> Podés descargar el archivo JSON completo de cualquier cliente haciendo clic en el botón "Backup".
                  </li>
                  <li>
                    <strong>Auditoría Global:</strong> Revisá periódicamente la pestaña "Auditoría & Actividad Global" para fiscalizar operaciones sensibles o logins.
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Transición a Producción con Dominio Propio
                </h4>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Para producción, podés configurar un subdominio administrativo independiente (ej: <code className="text-blue-600 font-mono">admin.katei.cl</code>) y ruteo automático por subdominio o slug para cada constructora cliente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Usuarios Backend de Administración */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Administradores Maestros KATEI (Super Usuarios)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Usuarios con credenciales maestras para acceder a este Portal y controlar todo el ecosistema.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateAdminModalOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shrink-0"
            >
              <Plus size={16} />
              Nuevo Administrador Maestro
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loadingAdmins ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando administradores...</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Nombre / Administrador</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Rol Maestro</th>
                    <th className="py-3 px-4">Fecha Alta</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {backendAdmins?.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Crown size={15} className="text-amber-500 shrink-0" />
                          <span>{adm.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">{adm.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                          SUPER_USUARIO
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(adm.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                          Activo
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResetAdminUser(adm);
                            setNewAdminPassword('');
                          }}
                          className="text-xs h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          title="Restablecer contraseña de administrador maestro"
                        >
                          <KeyRound size={13} className="mr-1" />
                          Reset Clave
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Tenant with Admin Provisioning (SIZE 4XL) */}
      {isCreateTenantModalOpen && (
        <Modal
          isOpen={isCreateTenantModalOpen}
          onClose={() => setIsCreateTenantModalOpen(false)}
          title={editingTenant ? `Editar Empresa: ${editingTenant.name}` : 'Aprovisionar Nueva Empresa Cliente'}
          size="4xl"
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
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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

            {/* Status (If editing or setting state) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Estado Comercial del Cliente
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ACTIVO">ACTIVO — Habilitado para operar</option>
                  <option value="SUSPENDIDO">SUSPENDIDO — Bloqueo de acceso por regularización de pago</option>
                  <option value="EN_PRUEBA">EN_PRUEBA — Período de evaluación</option>
                  <option value="CANCELADO">CANCELADO — Servicio concluido</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Email de Contacto Comercial
                </label>
                <Input
                  type="email"
                  value={formContactEmail}
                  onChange={(e) => setFormContactEmail(e.target.value)}
                  placeholder="contacto@constructora.cl"
                />
              </div>
            </div>

            {/* Plan Tier */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
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
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
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
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Módulos Habilitados en este Workspace ({formSelectedModules.length} activos)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                {ALL_SYSTEM_MODULES.map((mod) => {
                  const isChecked = formSelectedModules.includes(mod);
                  return (
                    <label
                      key={mod}
                      className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleModule(mod)}
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[11px] font-medium">{mod}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Provision Initial Admin User (Only on Create) */}
            {!editingTenant && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
                  <KeyRound size={15} />
                  <span>Primer Usuario Administrador del Cliente</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      Email del Administrador *
                    </label>
                    <Input
                      type="email"
                      value={formAdminEmail}
                      onChange={(e) => setFormAdminEmail(e.target.value)}
                      placeholder="admin@constructora.cl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      Nombre Completo
                    </label>
                    <Input
                      value={formAdminName}
                      onChange={(e) => setFormAdminName(e.target.value)}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      Contraseña Inicial (Opcional)
                    </label>
                    <Input
                      type="text"
                      value={formAdminPassword}
                      onChange={(e) => setFormAdminPassword(e.target.value)}
                      placeholder="Autogenerada si se omite"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formSendWelcomeEmail}
                    onChange={(e) => setFormSendWelcomeEmail(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] flex items-center gap-1.5 font-medium">
                    <Send size={12} className="text-blue-600 dark:text-blue-400" />
                    Enviar correo de bienvenida con instrucciones y credenciales vía Brevo
                  </span>
                </label>
              </div>
            )}

            {/* Quotas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Máx Usuarios</label>
                <Input
                  type="number"
                  value={formMaxUsers}
                  onChange={(e) => setFormMaxUsers(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Máx Flota / Equipos</label>
                <Input
                  type="number"
                  value={formMaxAssets}
                  onChange={(e) => setFormMaxAssets(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Máx Emails Mensuales</label>
                <Input
                  type="number"
                  value={formMaxEmails}
                  onChange={(e) => setFormMaxEmails(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Máx Telegram Mensual</label>
                <Input
                  type="number"
                  value={formMaxMessages}
                  onChange={(e) => setFormMaxMessages(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
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

      {/* Modal: Ficha Comercial & Operativa del Cliente (Business Profile) */}
      {selectedTenantForProfile && (
        <Modal
          isOpen={!!selectedTenantForProfile}
          onClose={() => setSelectedTenantForProfile(null)}
          title="Ficha Comercial & Operativa del Cliente"
          size="4xl"
        >
          {loadingProfile ? (
            <div className="p-8 text-center text-xs text-slate-500">Cargando ficha de negocio...</div>
          ) : businessProfile ? (
            <div className="space-y-5 py-2 text-xs">
              {/* Header Card */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {businessProfile.tenant.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                      <span>Slug: <strong className="font-mono text-blue-600">{businessProfile.tenant.slug}</strong></span>
                      {businessProfile.tenant.rut && <span>&bull; RUT: {businessProfile.tenant.rut}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      businessProfile.tenant.planTier === 'ENTERPRISE'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : businessProfile.tenant.planTier === 'PRO'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Plan {businessProfile.tenant.planTier}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportBackup(businessProfile.tenant)}
                    className="text-xs flex items-center gap-1"
                  >
                    <Download size={12} className="text-emerald-500" />
                    Backup JSON
                  </Button>
                </div>
              </div>

              {/* Business Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Clock size={13} className="text-blue-500" />
                    Inicio de Operaciones
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {new Date(businessProfile.businessMetrics.createdAt).toLocaleDateString('es-CL')}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                    {businessProfile.businessMetrics.monthsActive} meses de servicio activo
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <TrendingUp size={13} className="text-purple-500" />
                    Volumen Compras (CLP)
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    ${businessProfile.businessMetrics.totalPurchasesAmount.toLocaleString('es-CL')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {businessProfile.businessMetrics.counts.purchaseOrders} órdenes aprobadas
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-500" />
                    Flota & Maquinaria
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {businessProfile.businessMetrics.counts.assets} equipos
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Límite plan: {businessProfile.tenant.maxAssets}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <DollarSign size={13} className="text-amber-500" />
                    Faenas Activas
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {businessProfile.businessMetrics.counts.faenas} faenas
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {businessProfile.businessMetrics.counts.warehouses} bodegas registradas
                  </div>
                </div>
              </div>

              {/* Detailed Operational Breakdown */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Métricas de Actividad & Tracción en Plataforma
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-[10px]">Usuarios en Sistema:</span>
                    <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {businessProfile.businessMetrics.counts.users} / {businessProfile.tenant.maxUsers}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-[10px]">Órdenes de Trabajo (OTs):</span>
                    <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {businessProfile.businessMetrics.counts.workOrders}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-[10px]">Cargas de Combustible:</span>
                    <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {businessProfile.businessMetrics.counts.fuelLogs}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 block text-[10px]">Estado Operativo:</span>
                    <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {businessProfile.tenant.status}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button size="sm" onClick={() => setSelectedTenantForProfile(null)}>
                  Cerrar Ficha
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* Modal: Edit Commercial Plans Catalog */}
      {isEditPlansModalOpen && (
        <Modal
          isOpen={isEditPlansModalOpen}
          onClose={() => setIsEditPlansModalOpen(false)}
          title="Editar Catálogo de Planes Comerciales & Precios"
          size="4xl"
        >
          <form onSubmit={handleSavePlansSubmit} className="space-y-4 py-2 text-xs">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Modificá los precios en UF/CLP, descripciones, límites operacionales y módulos de cada plan. Los cambios impactarán el catálogo de suscripción.
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {editingPlansList.map((plan, idx) => (
                <div
                  key={plan.tier}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      Plan: {plan.tier}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.popular || false}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].popular = e.target.checked;
                          setEditingPlansList(updated);
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                      />
                      <span className="text-[11px] font-semibold">Destacado (Más Vendido)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Nombre Comercial *
                      </label>
                      <Input
                        value={plan.name}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].name = e.target.value;
                          setEditingPlansList(updated);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Precio Mensual (UF o Texto) *
                      </label>
                      <Input
                        value={plan.priceMonthly}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].priceMonthly = e.target.value;
                          setEditingPlansList(updated);
                        }}
                        placeholder="Ej: 28 UF / mes"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Perfil de Cliente Objetivo
                      </label>
                      <Input
                        value={plan.target}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].target = e.target.value;
                          setEditingPlansList(updated);
                        }}
                        placeholder="Ej: Constructoras medianas"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Descripción del Plan
                    </label>
                    <Input
                      value={plan.description}
                      onChange={(e) => {
                        const updated = [...editingPlansList];
                        updated[idx].description = e.target.value;
                        setEditingPlansList(updated);
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Máx Usuarios</label>
                      <Input
                        type="number"
                        value={plan.maxUsers}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].maxUsers = Number(e.target.value);
                          setEditingPlansList(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Máx Flota / Equipos</label>
                      <Input
                        type="number"
                        value={plan.maxAssets}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].maxAssets = Number(e.target.value);
                          setEditingPlansList(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Emails Brevo / mes</label>
                      <Input
                        type="number"
                        value={plan.maxMonthlyEmails}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].maxMonthlyEmails = Number(e.target.value);
                          setEditingPlansList(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Telegram / mes</label>
                      <Input
                        type="number"
                        value={plan.maxMonthlyMessages}
                        onChange={(e) => {
                          const updated = [...editingPlansList];
                          updated[idx].maxMonthlyMessages = Number(e.target.value);
                          setEditingPlansList(updated);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditPlansModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={savePlansMutation.isPending}
              >
                Guardar Cambios de Catálogo
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Reset Backend Admin Password */}
      {resetAdminUser && (
        <Modal
          isOpen={!!resetAdminUser}
          onClose={() => setResetAdminUser(null)}
          title={`Restablecer Contraseña: ${resetAdminUser.name}`}
          size="md"
        >
          <form onSubmit={handleResetAdminPasswordSubmit} className="space-y-4 py-2 text-xs">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Ingresá una nueva contraseña para el administrador maestro <strong>{resetAdminUser.email}</strong>.
            </p>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Nueva Contraseña Maestra *
              </label>
              <Input
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetAdminUser(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={resetAdminPassMutation.isPending}
              >
                Actualizar Contraseña
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
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Nombre Completo *
              </label>
              <Input
                value={adminFormName}
                onChange={(e) => setAdminFormName(e.target.value)}
                placeholder="Ej: Marcelo Operaciones"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Correo Electrónico *
              </label>
              <Input
                type="email"
                value={adminFormEmail}
                onChange={(e) => setAdminFormEmail(e.target.value)}
                placeholder="marcelo@katei.cl"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Contraseña Maestra *
              </label>
              <Input
                type="password"
                value={adminFormPassword}
                onChange={(e) => setAdminFormPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
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

      {/* Modal: Audit Log Detail Inspection */}
      {selectedLogDetail && (
        <Modal
          isOpen={!!selectedLogDetail}
          onClose={() => setSelectedLogDetail(null)}
          title="Inspección de Registro de Auditoría"
          size="lg"
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-900 p-3 rounded-lg">
              <div>
                <span className="text-slate-500 block text-[10px]">Fecha:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {new Date(selectedLogDetail.timestamp || selectedLogDetail.createdAt || '').toLocaleString('es-CL')}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Empresa:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedLogDetail.user?.tenant?.name || 'Staff KATEI'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Usuario:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedLogDetail.user?.name || selectedLogDetail.userId || 'Sistema'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Operación:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedLogDetail.entity} ({selectedLogDetail.action})
                </strong>
              </div>
            </div>

            {selectedLogDetail.ipAddress && (
              <div className="text-xs text-slate-500">
                <span>Dirección IP: </span>
                <code className="font-mono text-slate-700 dark:text-slate-300">{selectedLogDetail.ipAddress}</code>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Payload / Detalle de la Operación (JSON):
              </label>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-auto max-h-72 border border-slate-800">
                {JSON.stringify(selectedLogDetail.detail ?? selectedLogDetail.details ?? {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button size="sm" onClick={() => setSelectedLogDetail(null)}>
                Cerrar
              </Button>
            </div>
          </div>
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
            <div className="space-y-4 py-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{usageData.tenantName}</div>
                  <div className="text-slate-500">
                    Período: <strong>{usageData.billingPeriod}</strong> &bull; Plan: <strong>{usageData.planTier}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Mail size={13} /> Brevo Emails
                    </span>
                    <span>{usageData.percentages.emailsPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {usageData.monthlyConsumption.emailsSent}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyEmails}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={13} /> Telegram
                    </span>
                    <span>{usageData.percentages.messagesPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {usageData.monthlyConsumption.messagesSent}
                    <span className="text-xs font-normal text-slate-500"> / {usageData.limits.maxMonthlyMessages}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles size={13} /> Tokens IA
                    </span>
                    <span>{usageData.percentages.aiTokensPercent}%</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {usageData.monthlyConsumption.aiTokensUsed.toLocaleString()}
                    <span className="text-xs font-normal text-slate-500">
                      {' '}
                      / {usageData.limits.maxMonthlyAiTokens.toLocaleString()}
                    </span>
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
