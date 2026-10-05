import React, { useState } from 'react';
import { usePurchaseOrders, useUpdateOrderStatus } from '../../api/compras';
import { useAuditLogs, AuditLog } from '../../api/audit';
import {
  useUsers,
  useRoles,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  useSetSuperKey,
} from '../../api/users';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { PurchaseOrder } from '../../types/compras';
import { User } from '../../types/models';
import { exportToCSV } from '../../lib/export';
import { NotificationChannelsTab } from './NotificationChannelsTab';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Edit2,
  KeyRound,
  Lock,
  Download,
  UserCheck,
  UserX,
  BellRing,
} from 'lucide-react';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'aprobaciones' | 'auditoria' | 'usuarios' | 'alertas'>('aprobaciones');
  const toast = useToast();

  // Queries
  const { data: orders, isLoading: loadingOrders } = usePurchaseOrders();
  const { data: auditLogs, isLoading: loadingAudit } = useAuditLogs();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: roles } = useRoles();

  // Order Mutations
  const updateStatusMutation = useUpdateOrderStatus();
  const [mutatingOrderId, setMutatingOrderId] = useState<string | null>(null);

  // Super User Order Approval Modal
  const [isSuperUserModalOpen, setIsSuperUserModalOpen] = useState(false);
  const [superOrderId, setSuperOrderId] = useState<string>('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [superKey, setSuperKey] = useState('');

  // User Management State & Mutations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const resetPasswordMutation = useResetPassword();
  const setSuperKeyMutation = useSetSuperKey();

  // User Modals
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [isSetSuperKeyModalOpen, setIsSetSuperKeyModalOpen] = useState(false);

  // Selected User
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states for user creation
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRoleIds, setNewUserRoleIds] = useState<string[]>([]);
  const [newUserSuperKey, setNewUserSuperKey] = useState('');

  // Form states for user edit
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserIsActive, setEditUserIsActive] = useState(true);
  const [editUserRoleIds, setEditUserRoleIds] = useState<string[]>([]);

  // Password reset state
  const [adminNewPassword, setAdminNewPassword] = useState('');

  // SuperKey state
  const [adminSuperKey, setAdminSuperKey] = useState('');

  const pendingOrders = orders?.filter((o) => o.status === 'PENDIENTE_APROBACION') || [];

  // =================== Orders Approvals ===================
  const handleApprove = async (orderId: string) => {
    setMutatingOrderId(orderId);
    try {
      await updateStatusMutation.mutateAsync({
        id: orderId,
        action: 'APROBADA',
        level: 1,
        comments: 'Aprobación estándar',
      });
      toast.success('Orden de compra aprobada exitosamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al aprobar la orden de compra');
    } finally {
      setMutatingOrderId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    setMutatingOrderId(orderId);
    try {
      await updateStatusMutation.mutateAsync({
        id: orderId,
        action: 'RECHAZADA',
        level: 1,
        comments: 'Rechazado',
      });
      toast.info('Orden de compra rechazada');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al rechazar la orden de compra');
    } finally {
      setMutatingOrderId(null);
    }
  };

  const handleOpenSuperApprove = (orderId: string) => {
    setSuperOrderId(orderId);
    setExceptionReason('');
    setSuperKey('');
    setIsSuperUserModalOpen(true);
  };

  const handleSuperApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionReason || !superKey) {
      toast.warning('Debe ingresar motivo y clave de autorización.');
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({
        id: superOrderId,
        action: 'EXCEPCION',
        level: 1,
        comments: 'Aprobación por excepción de Súper Usuario',
        exceptionReason,
        superKey,
      });
      setIsSuperUserModalOpen(false);
      toast.success('Orden aprobada por excepción con clave de Súper Usuario');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error en la autorización por excepción');
    }
  };

  // =================== User Management Actions ===================
  const handleOpenCreateUser = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRoleIds(roles && roles.length > 0 ? [roles[0].id] : []);
    setNewUserSuperKey('');
    setIsCreateUserModalOpen(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }
    if (newUserRoleIds.length === 0) {
      toast.error('Debe seleccionar al menos un rol');
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        roleIds: newUserRoleIds,
        superKey: newUserSuperKey.trim() || undefined,
      });
      toast.success('Usuario creado exitosamente');
      setIsCreateUserModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear usuario');
    }
  };

  const handleOpenEditUser = (u: User) => {
    setSelectedUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserIsActive(u.isActive);
    setEditUserRoleIds(
      u.roles?.map((r: any) => (typeof r === 'string' ? r : r.roleId || r.id || '')).filter(Boolean) || []
    );
    setIsEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        isActive: editUserIsActive,
        roleIds: editUserRoleIds,
      });
      toast.success('Usuario actualizado correctamente');
      setIsEditUserModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar usuario');
    }
  };

  const handleOpenResetPassword = (u: User) => {
    setSelectedUser(u);
    setAdminNewPassword('');
    setIsResetPassModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adminNewPassword) return;
    if (adminNewPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({
        id: selectedUser.id,
        newPassword: adminNewPassword,
      });
      toast.success(`Contraseña restablecida para ${selectedUser.name}`);
      setIsResetPassModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al restablecer contraseña');
    }
  };

  const handleOpenSetSuperKey = (u: User) => {
    setSelectedUser(u);
    setAdminSuperKey('');
    setIsSetSuperKeyModalOpen(true);
  };

  const handleSetSuperKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adminSuperKey) return;
    if (adminSuperKey.length < 6) {
      toast.error('La clave de súper usuario debe tener al menos 6 caracteres');
      return;
    }
    try {
      await setSuperKeyMutation.mutateAsync({
        id: selectedUser.id,
        superKey: adminSuperKey,
      });
      toast.success(`Clave de Súper Usuario configurada para ${selectedUser.name}`);
      setIsSetSuperKeyModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al configurar clave de súper usuario');
    }
  };

  const handleExportAuditLogs = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast.info('No hay registros para exportar');
      return;
    }
    exportToCSV(
      auditLogs,
      [
        { header: 'ID', key: 'id' },
        { header: 'Fecha', key: (l) => new Date(l.createdAt).toLocaleString('es-CL') },
        { header: 'Usuario', key: (l) => l.user?.name || l.userId || 'Sistema' },
        { header: 'Acción', key: 'action' },
        { header: 'Entidad', key: 'entity' },
        { header: 'IP', key: (l) => l.ipAddress || '' },
      ],
      'SGMT_Bitacora_Auditoria'
    );
    toast.success('Bitácora exportada a Excel/CSV');
  };

  const toggleRoleSelection = (roleId: string, currentList: string[], setter: (val: string[]) => void) => {
    if (currentList.includes(roleId)) {
      if (currentList.length > 1) {
        setter(currentList.filter((id) => id !== roleId));
      } else {
        toast.warning('El usuario debe tener al menos un rol');
      }
    } else {
      setter([...currentList, roleId]);
    }
  };

  // =================== Column Definitions ===================
  const ordersColumns = [
    {
      header: 'N° Orden',
      cell: (item: PurchaseOrder) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
          {item.orderNumber}
        </span>
      ),
    },
    {
      header: 'Proveedor',
      cell: (item: PurchaseOrder) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.supplier?.businessName}</span>
      ),
    },
    {
      header: 'Total ($ CLP)',
      cell: (item: PurchaseOrder) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">${Number(item.totalAmount).toLocaleString('es-CL')}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (item: PurchaseOrder) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Acciones',
      cell: (item: PurchaseOrder) => (
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            title="Aprobar OC"
            disabled={updateStatusMutation.isPending && mutatingOrderId === item.id}
            onClick={() => handleApprove(item.id)}
          >
            <CheckCircle size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 dark:text-red-400"
            title="Rechazar OC"
            disabled={updateStatusMutation.isPending && mutatingOrderId === item.id}
            onClick={() => handleReject(item.id)}
          >
            <XCircle size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700 dark:text-amber-400"
            title="Aprobación Especial Súper Usuario"
            disabled={updateStatusMutation.isPending && mutatingOrderId === item.id}
            onClick={() => handleOpenSuperApprove(item.id)}
          >
            <AlertCircle size={16} />
          </Button>
        </div>
      ),
    },
  ];

  const auditColumns = [
    {
      header: 'Fecha',
      cell: (log: AuditLog) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {new Date(log.createdAt).toLocaleString('es-CL')}
        </span>
      ),
    },
    {
      header: 'Usuario',
      cell: (log: AuditLog) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {log.user?.name || log.userId || 'Sistema'}
        </span>
      ),
    },
    {
      header: 'Acción',
      cell: (log: AuditLog) => (
        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
          {log.action}
        </span>
      ),
    },
    {
      header: 'Entidad',
      cell: (log: AuditLog) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{log.entity}</span>
      ),
    },
    {
      header: 'IP Origen',
      cell: (log: AuditLog) => (
        <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
          {log.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
  ];

  const userColumns = [
    {
      header: 'Nombre',
      cell: (u: User) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.name}</div>
          <div className="text-xs text-slate-500 font-mono">{u.email}</div>
        </div>
      ),
    },
    {
      header: 'Roles Asignados',
      cell: (u: User) => (
        <div className="flex flex-wrap gap-1">
          {u.roles?.map((r: any, i: number) => {
            const roleName = typeof r === 'string' ? r : r.role?.name || r.name;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                <Shield size={10} className="text-blue-500" />
                {roleName}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (u: User) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            u.isActive
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
          }`}
        >
          {u.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
          {u.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      header: 'Acciones',
      cell: (u: User) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditUser(u)}
            className="text-blue-600 dark:text-blue-400 p-1.5"
            title="Editar Usuario y Roles"
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenResetPassword(u)}
            className="text-amber-600 dark:text-amber-400 p-1.5"
            title="Restablecer Contraseña"
          >
            <KeyRound size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenSetSuperKey(u)}
            className="text-purple-600 dark:text-purple-400 p-1.5"
            title="Configurar Clave Súper Usuario"
          >
            <Lock size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shield className="text-blue-600 dark:text-blue-400" />
            Panel de Administración
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control de accesos, gestión de usuarios, auditoría de sistema y bandeja de aprobaciones
          </p>
        </div>

        {activeTab === 'usuarios' && (
          <Button onClick={handleOpenCreateUser} className="shrink-0 flex items-center gap-2">
            <UserPlus size={16} />
            Nuevo Usuario
          </Button>
        )}

        {activeTab === 'auditoria' && (
          <Button
            variant="outline"
            onClick={handleExportAuditLogs}
            className="shrink-0 flex items-center gap-2"
          >
            <Download size={16} />
            Exportar Auditoría (Excel)
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('aprobaciones')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'aprobaciones'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Bandeja de Aprobaciones ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'usuarios'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Gestión de Usuarios & Roles ({users?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'auditoria'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Bitácora de Auditoría
          </button>
          <button
            onClick={() => setActiveTab('alertas')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'alertas'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BellRing size={15} />
            <span>Canales de Alerta (Telegram / Brevo)</span>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'aprobaciones' && (
        <DataTable
          data={pendingOrders}
          columns={ordersColumns}
          isLoading={loadingOrders}
          emptyMessage="No hay órdenes de compra pendientes de aprobación"
        />
      )}

      {activeTab === 'usuarios' && (
        <DataTable
          data={users || []}
          columns={userColumns}
          isLoading={loadingUsers}
          emptyMessage="No hay usuarios registrados"
        />
      )}

      {activeTab === 'auditoria' && (
        <DataTable
          data={auditLogs || []}
          columns={auditColumns}
          isLoading={loadingAudit}
          emptyMessage="No hay registros de auditoría"
        />
      )}

      {activeTab === 'alertas' && <NotificationChannelsTab />}

      {/* Modal: Super User Approval */}
      <Modal
        isOpen={isSuperUserModalOpen}
        onClose={() => setIsSuperUserModalOpen(false)}
        title="Aprobación por Excepción (Súper Usuario)"
      >
        <form onSubmit={handleSuperApprove} className="space-y-4 pt-2">
          <Input
            label="Motivo Justificado de la Excepción *"
            placeholder="Ej: Aprobación urgente para faena crítica"
            value={exceptionReason}
            onChange={(e) => setExceptionReason(e.target.value)}
            required
          />
          <Input
            label="Clave de Doble Autenticación (SuperKey) *"
            type="password"
            placeholder="Ingrese la clave de súper usuario"
            value={superKey}
            onChange={(e) => setSuperKey(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsSuperUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={updateStatusMutation.isPending}>
              Aprobar por Excepción
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create User */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Crear Nuevo Usuario"
        size="lg"
      >
        <form onSubmit={handleCreateUserSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre Completo *"
              placeholder="Ej: Juan Pérez"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              required
            />
            <Input
              label="Correo Electrónico *"
              type="email"
              placeholder="usuario@sgmt.local"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contraseña Inicial *"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
            />
            <Input
              label="Clave Súper Usuario (Opcional)"
              type="password"
              placeholder="Solo si aplica rol Súper Usuario"
              value={newUserSuperKey}
              onChange={(e) => setNewUserSuperKey(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Roles y Permisos en el Sistema *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              {roles?.map((role) => {
                const isSelected = newUserRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className={`flex items-start gap-2 p-2 rounded-md cursor-pointer text-xs border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-medium'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRoleSelection(role.id, newUserRoleIds, setNewUserRoleIds)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-semibold">{role.displayName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Nivel {role.level}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsCreateUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createUserMutation.isPending}>
              Guardar Usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        title={`Editar Usuario: ${selectedUser?.name || ''}`}
        size="lg"
      >
        <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre Completo *"
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              required
            />
            <Input
              label="Correo Electrónico *"
              type="email"
              value={editUserEmail}
              onChange={(e) => setEditUserEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              id="editUserActive"
              checked={editUserIsActive}
              onChange={(e) => setEditUserIsActive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="editUserActive" className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
              Usuario Habilitado / Activo en el Sistema
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Roles y Permisos Asignados *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              {roles?.map((role) => {
                const isSelected = editUserRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className={`flex items-start gap-2 p-2 rounded-md cursor-pointer text-xs border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-medium'
                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRoleSelection(role.id, editUserRoleIds, setEditUserRoleIds)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-semibold">{role.displayName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Nivel {role.level}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsEditUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={updateUserMutation.isPending}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Admin Reset Password */}
      <Modal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        title={`Restablecer Contraseña: ${selectedUser?.name || ''}`}
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2">
          <Input
            label="Nueva Contraseña Temporal / Definitiva *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={adminNewPassword}
            onChange={(e) => setAdminNewPassword(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            El usuario podrá acceder de inmediato con esta nueva clave.
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsResetPassModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={resetPasswordMutation.isPending}>
              Restablecer Contraseña
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Admin Set SuperKey */}
      <Modal
        isOpen={isSetSuperKeyModalOpen}
        onClose={() => setIsSetSuperKeyModalOpen(false)}
        title={`Configurar Clave Súper Usuario: ${selectedUser?.name || ''}`}
      >
        <form onSubmit={handleSetSuperKeySubmit} className="space-y-4 pt-2">
          <Input
            label="Nueva Clave de Súper Usuario (2FA / Excepciones) *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={adminSuperKey}
            onChange={(e) => setAdminSuperKey(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Esta clave se almacena con hash criptográfico y se exigirá en aprobaciones excepcionales.
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" type="button" onClick={() => setIsSetSuperKeyModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={setSuperKeyMutation.isPending}>
              Guardar SuperKey
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
