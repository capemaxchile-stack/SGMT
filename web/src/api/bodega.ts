import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Item, Warehouse, Supplier } from '../types/models';

export const bodegaKeys = {
  items: ['items'] as const,
  warehouses: ['warehouses'] as const,
  suppliers: ['suppliers'] as const,
};

export const useItems = () => {
  return useQuery({
    queryKey: bodegaKeys.items,
    queryFn: async () => (await api.get<Item[]>('/items')).data,
    initialData: [
      { id: '1', code: 'IT-001', description: 'Filtro de Aceite', category: 'Repuestos', unit: 'UN', minStock: 10, currentStock: 15, createdAt: '', updatedAt: '' }
    ]
  });
};

export const useWarehouses = () => {
  return useQuery({
    queryKey: bodegaKeys.warehouses,
    queryFn: async () => (await api.get<Warehouse[]>('/warehouses')).data,
    initialData: [
      { id: '1', name: 'Bodega Central', type: 'CENTRAL', location: 'Santiago', createdAt: '', updatedAt: '' }
    ]
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: bodegaKeys.suppliers,
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
    initialData: [
      { id: '1', rut: '76.543.210-K', businessName: 'Proveedores SPA', contactName: 'Juan Pérez', phone: '+56912345678', email: 'contacto@proveedores.cl', createdAt: '', updatedAt: '' }
    ]
  });
};
