import React, { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useChangeOwnPassword, useUpdateProfile } from '../../api/users';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, Shield, Key, CheckCircle2 } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user } = useAuthStore();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const updateProfileMutation = useUpdateProfile();

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const changePasswordMutation = useChangeOwnPassword();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    try {
      const updated = await updateProfileMutation.mutateAsync({ name: name.trim() });
      if (user) {
        // Update local user object
        const storedAuth = localStorage.getItem('sgmt-auth-storage');
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);
            parsed.state.user = { ...parsed.state.user, name: updated.name };
            localStorage.setItem('sgmt-auth-storage', JSON.stringify(parsed));
          } catch {}
        }
      }
      toast.success('Perfil actualizado correctamente');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar el perfil');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Debe ingresar la contraseña actual');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      toast.success('Contraseña actualizada con éxito');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar la contraseña');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mi Cuenta & Configuración de Perfil"
      size="md"
    >
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          Información Personal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          Seguridad & Contraseña
        </button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <div className="px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-mono">
              {user?.email}
            </div>
            <p className="text-xs text-slate-500 mt-1">El correo solo puede ser modificado por un Administrador.</p>
          </div>

          <Input
            label="Nombre Completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Tu nombre y apellido"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Roles Asignados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {user?.roles?.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  <Shield className="w-3 h-3" />
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="submit" isLoading={updateProfileMutation.isPending}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Contraseña Actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="••••••••"
          />

          <Input
            label="Nueva Contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
          />

          <Input
            label="Confirmar Nueva Contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Repite la nueva contraseña"
          />

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <span>
              La contraseña se actualiza encriptada mediante algoritmo seguro bcrypt.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={changePasswordMutation.isPending}>
              Actualizar Contraseña
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
