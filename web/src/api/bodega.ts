import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Item, Warehouse, Supplier, WarehouseType } from '../types/models';

export const bodegaKeys = {
  items: ['items'] as const,
  warehouses: ['warehouses'] as const,
  suppliers: ['suppliers'] as const,
};

// --- Items ---
export const fetchItems = async (): Promise<Item[]> => {
  const { data } = await api.get<Item[]>('/items');
  return data;
};

export const createItem = async (payload: {
  code: string;
  description: string;
  unitOfMeasure: string;
  category: string;
  minimumStock: number;
}): Promise<Item> => {
  const { data } = await api.post<Item>('/items', payload);
  return data;
};

export const updateItem = async ({ id, payload }: { id: string; payload: Partial<Item> }): Promise<Item> => {
  const { data } = await api.patch<Item>('/items/' + id, payload);
  return data;
};

export const deleteItem = async (id: string): Promise<void> => {
  await api.delete('/items/' + id);
};

// --- Warehouses ---
export const fetchWarehouses = async (): Promise<Warehouse[]> => {
  const { data } = await api.get<Warehouse[]>('/warehouses');
  return data;
};

export const createWarehouse = async (payload: {
  name: string;
  location: string;
  type: WarehouseType;
}): Promise<Warehouse> => {
  const { data } = await api.post<Warehouse>('/warehouses', payload);
  return data;
};

export const updateWarehouse = async ({ id, payload }: { id: string; payload: Partial<Warehouse> }): Promise<Warehouse> => {
  const { data } = await api.patch<Warehouse>('/warehouses/' + id, payload);
  return data;
};

export const deleteWarehouse = async (id: string): Promise<void> => {
  await api.delete('/warehouses/' + id);
};

// --- Suppliers ---
export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data } = await api.get<Supplier[]>('/suppliers');
  return data;
};

export const createSupplier = async (payload: {
  businessName: string;
  rut: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}): Promise<Supplier> => {
  const { data } = await api.post<Supplier>('/suppliers', payload);
  return data;
};

export const updateSupplier = async ({ id, payload }: { id: string; payload: Partial<Supplier> }): Promise<Supplier> => {
  const { data } = await api.patch<Supplier>('/suppliers/' + id, payload);
  return data;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await api.delete('/suppliers/' + id);
};

// --- Hooks ---
export const useItems = () => {
  return useQuery({
    queryKey: bodegaKeys.items,
    queryFn: fetchItems,
  });
};

export const useWarehouses = () => {
  return useQuery({
    queryKey: bodegaKeys.warehouses,
    queryFn: fetchWarehouses,
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: bodegaKeys.suppliers,
    queryFn: fetchSuppliers,
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.items });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.items });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.items });
    },
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.warehouses });
    },
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.warehouses });
    },
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.warehouses });
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.suppliers });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.suppliers });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaKeys.suppliers });
    },
  });
};
