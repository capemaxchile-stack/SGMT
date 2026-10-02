import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { User, Role } from '../types/models';

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
