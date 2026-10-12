import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { User, Role, RolePermission } from '../types/models';

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  roleIds: string[];
  superKey?: string;
}

export interface UpdateUserData {
  id: string;
  email?: string;
  name?: string;
  roleIds?: string[];
  isActive?: boolean;
}

export interface ResetPasswordData {
  id: string;
  newPassword: string;
}

export interface SetSuperKeyData {
  id: string;
  superKey: string;
}

export interface UpdateProfileData {
  name?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateRoleData {
  id: string;
  displayName?: string;
  level?: number;
  maxApprovalAmount?: number;
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data;
  },
  getActive: async (): Promise<User[]> => {
    const { data } = await api.get('/users/active');
    return data;
  },
  getRoles: async (): Promise<Role[]> => {
    const { data } = await api.get('/users/roles');
    return data;
  },
  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
  create: async (userData: CreateUserData): Promise<User> => {
    const { data } = await api.post('/users', userData);
    return data;
  },
  update: async ({ id, ...updateData }: UpdateUserData): Promise<User> => {
    const { data } = await api.patch(`/users/${id}`, updateData);
    return data;
  },
  resetPassword: async ({ id, newPassword }: ResetPasswordData): Promise<{ message: string }> => {
    const { data } = await api.patch(`/users/${id}/password`, { newPassword });
    return data;
  },
  setSuperKey: async ({ id, superKey }: SetSuperKeyData): Promise<{ message: string }> => {
    const { data } = await api.patch(`/users/${id}/super-key`, { superKey });
    return data;
  },
  updateProfile: async (profileData: UpdateProfileData): Promise<User> => {
    const { data } = await api.patch('/auth/profile', profileData);
    return data;
  },
  changeOwnPassword: async (passwordData: ChangePasswordData): Promise<{ message: string }> => {
    const { data } = await api.patch('/auth/change-password', passwordData);
    return data;
  },
  createRole: async (roleData: {
    name: string;
    displayName: string;
    level: number;
    maxApprovalAmount?: number;
  }): Promise<Role> => {
    const { data } = await api.post('/users/roles', roleData);
    return data;
  },
  updateRolePermissions: async ({
    roleId,
    permissions,
  }: {
    roleId: string;
    permissions: RolePermission[];
  }): Promise<Role> => {
    const { data } = await api.put(`/users/roles/${roleId}/permissions`, { permissions });
    return data;
  },
  updateRole: async ({ id, ...roleData }: UpdateRoleData): Promise<Role> => {
    const { data } = await api.patch(`/users/roles/${id}`, roleData);
    return data;
  },
  deleteRole: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/users/roles/${id}`);
    return data;
  },
};

// React Query Hooks
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });
}

export function useActiveUsers() {
  return useQuery({
    queryKey: ['users', 'active'],
    queryFn: usersApi.getActive,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: usersApi.getRoles,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.updateRolePermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.resetPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useSetSuperKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.setSuperKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: usersApi.changeOwnPassword,
  });
}
