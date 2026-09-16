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

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWarehouse,
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
