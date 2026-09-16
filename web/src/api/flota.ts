import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Asset } from '../types/models';

export const flotaKeys = {
  all: ['flota'] as const,
  lists: () => [...flotaKeys.all, 'list'] as const,
};

export const fetchFlota = async (): Promise<Asset[]> => {
  const { data } = await api.get<Asset[]>('/flota');
  return data;
};

export const useFlota = () => {
  return useQuery({
    queryKey: flotaKeys.lists(),
    queryFn: fetchFlota,
    initialData: [
      {
        id: '1', internalNumber: 'EXC-01', type: 'Excavadora', brand: 'Caterpillar', model: '320', year: 2022,
        licensePlate: 'ABC-123', status: 'OPERATIVO', currentHorometer: 1500, currentKilometers: 0,
        faenaName: 'Mina Los Pelambres', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: '2', internalNumber: 'CAM-05', type: 'Camión', brand: 'Volvo', model: 'FMX', year: 2023,
        licensePlate: 'XYZ-987', status: 'EN_MANTENCION', currentHorometer: 0, currentKilometers: 45000,
        faenaName: 'Proyecto Quebrada Blanca', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ]
  });
};
