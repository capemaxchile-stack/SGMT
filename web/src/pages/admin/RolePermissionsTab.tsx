import React, { useState, useEffect } from 'react';
import { useRoles, useCreateRole, useUpdateRolePermissions } from '../../api/users';
import { Role, RolePermission } from '../../types/models';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Save,
  Check,
  Eye,
  CheckSquare,
  Lock,
} from 'lucide-react';

interface ModuleConfig {
  key: string;
  name: string;
  description: string;
}

const MODULES: ModuleConfig[] = [
  { key: 'DASHBOARD', name: 'Dashboard', description: 'Métricas generales, KPIs operacionales y resúmenes' },
  { key: 'FAENAS', name: 'Faenas y Contratos', description: 'Gestión de faenas, contratos comerciales y centros de costo' },
  { key: 'FLOTA', name: 'Flota y Activos', description: 'Inventario de maquinaria pesada, horómetros y odómetros' },
  { key: 'CERTIFICACIONES', name: 'Certificaciones', description: 'Documentos legales de maquinaria y credenciales de operadores' },
  { key: 'MANTENIMIENTO', name: 'Mantenimiento', description: 'Planes preventivos y órdenes de trabajo (OTs)' },
  { key: 'COMBUSTIBLE', name: 'Combustible', description: 'Registro de despachos, tanques y rendimiento por máquina' },
  { key: 'BODEGA', name: 'Bodega y Kardex', description: 'Inventario de repuestos, movimientos y valorización PMP' },
  { key: 'COMPRAS', name: 'Compras y OCs', description: 'Solicitudes de compra, órdenes de compra y recepción de insumos' },
  { key: 'REPORTES', name: 'Reportes y Cierres', description: 'Cierre mensual de faena, balances ejecutivos y descargas CSV' },
  { key: 'ADMINISTRACION', name: 'Administración', description: 'Gestión de usuarios, auditoría, canales de alerta y perfiles' },
];

export function RolePermissionsTab() {
  const toast = useToast();
  const { data: roles, isLoading } = useRoles();
  const createRoleMutation = useCreateRole();
  const updatePermissionsMutation = useUpdateRolePermissions();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, RolePermission>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // New Role Modal state
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDisplayName, setNewRoleDisplayName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(1);
  const [newRoleMaxApproval, setNewRoleMaxApproval] = useState<number | undefined>(undefined);

  // Sync selected role when roles load or change
  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRole) {
      handleSelectRole(roles[0]);
    } else if (roles && selectedRole) {
      const updated = roles.find((r) => r.id === selectedRole.id);
      if (updated) {
        handleSelectRole(updated);
      }
    }
  }, [roles]);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setHasChanges(false);

    // Initialize matrix from role permissions
    const matrix: Record<string, RolePermission> = {};
    const existing = role.permissions || [];

    for (const mod of MODULES) {
      const found = existing.find((p) => p.module === mod.key);
      if (found) {
        matrix[mod.key] = { ...found };
      } else {
        const isAdmin = role.name === 'ADMIN_SISTEMA' || role.name === 'SUPER_USUARIO';
        matrix[mod.key] = {
          roleId: role.id,
          module: mod.key,
          canRead: isAdmin,
          canWrite: isAdmin,
          canApprove: isAdmin,
          canAdmin: isAdmin,
        };
      }
    }
    setPermissionsMatrix(matrix);
  };

  const handleTogglePermission = (
    moduleKey: string,
    action: 'canRead' | 'canWrite' | 'canApprove' | 'canAdmin'
  ) => {
    if (!selectedRole) return;
    if (selectedRole.name === 'ADMIN_SISTEMA' || selectedRole.name === 'SUPER_USUARIO') {
      toast.error('Los roles administradores del sistema tienen acceso total inmutable.');
      return;
    }

    setPermissionsMatrix((prev) => {
      const current = prev[moduleKey] || {
        roleId: selectedRole.id,
        module: moduleKey,
        canRead: false,
        canWrite: false,
        canApprove: false,
        canAdmin: false,
      };

      const nextVal = !current[action];
      const updated = { ...current, [action]: nextVal };

      // Logical cascading: if granting write/approve/admin, automatically grant read
      if (nextVal && action !== 'canRead') {
        updated.canRead = true;
      }
      // If revoking read, revoke write/approve/admin
      if (!nextVal && action === 'canRead') {
        updated.canWrite = false;
        updated.canApprove = false;
        updated.canAdmin = false;
      }

      setHasChanges(true);
      return {
        ...prev,
        [moduleKey]: updated,
      };
    });
  };

  const handleSetRowPermissions = (moduleKey: string, mode: 'ALL' | 'READ_ONLY' | 'NONE') => {
    if (!selectedRole) return;
    if (selectedRole.name === 'ADMIN_SISTEMA' || selectedRole.name === 'SUPER_USUARIO') return;

    setPermissionsMatrix((prev) => {
      const current = prev[moduleKey] || {
        roleId: selectedRole.id,
        module: moduleKey,
        canRead: false,
        canWrite: false,
        canApprove: false,
        canAdmin: false,
      };

      let updated: RolePermission;
      if (mode === 'ALL') {
        updated = { ...current, canRead: true, canWrite: true, canApprove: true, canAdmin: true };
      } else if (mode === 'READ_ONLY') {
        updated = { ...current, canRead: true, canWrite: false, canApprove: false, canAdmin: false };
      } else {
        updated = { ...current, canRead: false, canWrite: false, canApprove: false, canAdmin: false };
      }

      setHasChanges(true);
      return { ...prev, [moduleKey]: updated };
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      const permsArray = Object.values(permissionsMatrix);
      await updatePermissionsMutation.mutateAsync({
        roleId: selectedRole.id,
        permissions: permsArray,
      });
      setHasChanges(false);
      toast.success(`Permisos del perfil "${selectedRole.displayName}" actualizados con éxito.`);
    } catch {
      toast.error('Error al guardar los permisos del perfil.');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleDisplayName.trim()) {
      toast.error('El nombre a mostrar es obligatorio.');
      return;
    }
    const computedName =
      newRoleName.trim() ||
      newRoleDisplayName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_');

    try {
      const created = await createRoleMutation.mutateAsync({
        name: computedName,
        displayName: newRoleDisplayName.trim(),
        level: Number(newRoleLevel),
        maxApprovalAmount: newRoleMaxApproval ? Number(newRoleMaxApproval) : undefined,
      });
      setIsNewRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDisplayName('');
      setNewRoleLevel(1);
      setNewRoleMaxApproval(undefined);
      toast.success(`Perfil "${created.displayName}" creado correctamente.`);
      handleSelectRole(created);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear el perfil.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
        <p>Cargando perfiles y matriz de acceso...</p>
      </div>
    );
  }

  const isSystemRole =
    selectedRole?.name === 'ADMIN_SISTEMA' || selectedRole?.name === 'SUPER_USUARIO';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-600 dark:text-blue-400" size={22} />
            Control de Acceso y Perfiles de Usuario
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configura qué herramientas y módulos puede visualizar, operar y autorizar cada perfil
            según la matriz de atribución (L/R/A/T).
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsNewRoleModalOpen(true)}
          className="flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          <span>Nuevo Perfil</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles Sidebar / List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2 flex items-center justify-between">
            <span>Perfiles Definidos</span>
            <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {roles?.length || 0}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[650px] overflow-y-auto pr-1">
            {roles?.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              const isSuper = role.name === 'ADMIN_SISTEMA' || role.name === 'SUPER_USUARIO';

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">{role.displayName}</span>
                    {isSuper ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/40 flex items-center gap-1">
                        <Lock size={10} /> Full
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        Nvl {role.level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-[11px] opacity-75">{role.name}</span>
                    {role.maxApprovalAmount ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Hasta ${(Number(role.maxApprovalAmount) / 1000000).toFixed(0)}M
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permission Matrix Detail Panel */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base text-slate-900 dark:text-white">
                        {selectedRole.displayName}
                      </CardTitle>
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {selectedRole.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Nivel de atribución: {selectedRole.level} • Tope de aprobación:{' '}
                      {selectedRole.maxApprovalAmount
                        ? `$${Number(selectedRole.maxApprovalAmount).toLocaleString('es-CL')} CLP`
                        : 'Sin tope / No aplica'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {hasChanges && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse hidden sm:inline">
                        Cambios pendientes
                      </span>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isSystemRole || !hasChanges || updatePermissionsMutation.isPending}
                      onClick={handleSavePermissions}
                      className="flex items-center gap-1.5"
                    >
                      <Save size={15} />
                      <span>
                        {updatePermissionsMutation.isPending ? 'Guardando...' : 'Guardar Matriz'}
                      </span>
                    </Button>
                  </div>
                </div>

                {isSystemRole && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <ShieldAlert size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Este perfil cuenta con facultades de superusuario/administrador global. Posee
                      acceso irrestricto de bypass en todos los módulos por motivos de gobernanza.
                    </span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs">
                        <th className="py-3 px-4 font-semibold">Módulo / Herramienta</th>
                        <th className="py-3 px-3 text-center font-semibold w-24">
                          <div className="flex flex-col items-center">
                            <span>Ver (L)</span>
                            <span className="text-[10px] text-slate-400 font-normal">Lectura</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-center font-semibold w-24">
                          <div className="flex flex-col items-center">
                            <span>Crear (R)</span>
                            <span className="text-[10px] text-slate-400 font-normal">Registro</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-center font-semibold w-24">
                          <div className="flex flex-col items-center">
                            <span>Aprobar (A)</span>
                            <span className="text-[10px] text-slate-400 font-normal">Flujo FSM</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-center font-semibold w-24">
                          <div className="flex flex-col items-center">
                            <span>Admin (T)</span>
                            <span className="text-[10px] text-slate-400 font-normal">Control Total</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 text-right font-semibold w-28">Acción Rápida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {MODULES.map((mod) => {
                        const perm = permissionsMatrix[mod.key] || {
                          canRead: false,
                          canWrite: false,
                          canApprove: false,
                          canAdmin: false,
                        };

                        return (
                          <tr
                            key={mod.key}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {mod.name}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">
                                {mod.description}
                              </div>
                            </td>

                            {/* canRead */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                disabled={isSystemRole}
                                onClick={() => handleTogglePermission(mod.key, 'canRead')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                  perm.canRead
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                } ${isSystemRole ? 'cursor-not-allowed opacity-80' : ''}`}
                                title={perm.canRead ? 'Lectura permitida' : 'Lectura denegada'}
                              >
                                {perm.canRead ? <Check size={16} /> : <span className="text-xs font-mono">-</span>}
                              </button>
                            </td>

                            {/* canWrite */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                disabled={isSystemRole}
                                onClick={() => handleTogglePermission(mod.key, 'canWrite')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                  perm.canWrite
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                } ${isSystemRole ? 'cursor-not-allowed opacity-80' : ''}`}
                                title={perm.canWrite ? 'Escritura permitida' : 'Escritura denegada'}
                              >
                                {perm.canWrite ? <Check size={16} /> : <span className="text-xs font-mono">-</span>}
                              </button>
                            </td>

                            {/* canApprove */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                disabled={isSystemRole}
                                onClick={() => handleTogglePermission(mod.key, 'canApprove')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                  perm.canApprove
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                } ${isSystemRole ? 'cursor-not-allowed opacity-80' : ''}`}
                                title={perm.canApprove ? 'Aprobación permitida' : 'Aprobación denegada'}
                              >
                                {perm.canApprove ? <Check size={16} /> : <span className="text-xs font-mono">-</span>}
                              </button>
                            </td>

                            {/* canAdmin */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                disabled={isSystemRole}
                                onClick={() => handleTogglePermission(mod.key, 'canAdmin')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                  perm.canAdmin
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                } ${isSystemRole ? 'cursor-not-allowed opacity-80' : ''}`}
                                title={perm.canAdmin ? 'Control total permitido' : 'Control total denegado'}
                              >
                                {perm.canAdmin ? <Check size={16} /> : <span className="text-xs font-mono">-</span>}
                              </button>
                            </td>

                            {/* Quick row actions */}
                            <td className="py-3 px-3 text-right">
                              {!isSystemRole && (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSetRowPermissions(mod.key, 'READ_ONLY')}
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs"
                                    title="Solo Lectura"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetRowPermissions(mod.key, 'ALL')}
                                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-xs"
                                    title="Permitir Todo"
                                  >
                                    <CheckSquare size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              Selecciona un perfil para configurar sus permisos.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nuevo Perfil */}
      <Modal
        isOpen={isNewRoleModalOpen}
        onClose={() => setIsNewRoleModalOpen(false)}
        title="Crear Nuevo Perfil de Usuario"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <Input
            label="Nombre del Perfil"
            placeholder="Ej. Asistente de Adquisiciones"
            value={newRoleDisplayName}
            onChange={(e) => setNewRoleDisplayName(e.target.value)}
            required
          />

          <Input
            label="Identificador Técnico (Opcional)"
            placeholder="Ej. ASISTENTE_ADQUISICIONES"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nivel Jerárquico"
              type="number"
              min={1}
              max={100}
              value={newRoleLevel}
              onChange={(e) => setNewRoleLevel(Number(e.target.value))}
              required
            />

            <Input
              label="Tope de Aprobación CLP (Opcional)"
              type="number"
              placeholder="Ej. 2000000"
              value={newRoleMaxApproval ?? ''}
              onChange={(e) =>
                setNewRoleMaxApproval(e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewRoleModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? 'Creando...' : 'Crear Perfil'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
