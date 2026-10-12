import { CreatePurchaseRequestDto } from '../types/compras';
import { api } from './axios';

export interface OfflineRequestItem {
  id: string;
  payload: CreatePurchaseRequestDto;
  createdAt: string;
  faenaName?: string;
  itemsSummary?: string;
  status: 'QUEUED' | 'SYNCING' | 'ERROR';
  error?: string;
}

const STORAGE_KEY_QUEUE = 'sgmt_offline_request_queue';
const STORAGE_KEY_CATALOG = 'sgmt_offline_item_catalog';
const STORAGE_KEY_FAENAS = 'sgmt_offline_faenas';
const STORAGE_KEY_ASSETS = 'sgmt_offline_assets';

export const getOfflineQueue = (): OfflineRequestItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (queue: OfflineRequestItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('sgmt-queue-updated', { detail: { count: queue.length } }));
  } catch (e) {
    console.error('Error saving offline queue', e);
  }
};

export const queueOfflineRequest = (
  payload: CreatePurchaseRequestDto,
  meta?: { faenaName?: string; itemsSummary?: string },
): OfflineRequestItem => {
  const queue = getOfflineQueue();
  const newItem: OfflineRequestItem = {
    id: 'offline-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    payload,
    createdAt: new Date().toISOString(),
    faenaName: meta?.faenaName,
    itemsSummary: meta?.itemsSummary,
    status: 'QUEUED',
  };

  queue.push(newItem);
  saveOfflineQueue(queue);
  return newItem;
};

export const cacheOfflineData = (data: { items?: any[]; faenas?: any[]; assets?: any[] }) => {
  try {
    if (data.items) localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(data.items));
    if (data.faenas) localStorage.setItem(STORAGE_KEY_FAENAS, JSON.stringify(data.faenas));
    if (data.assets) localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(data.assets));
  } catch (e) {
    console.error('Error caching offline master data', e);
  }
};

export const getCachedOfflineData = () => {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY_CATALOG) || '[]');
    const faenas = JSON.parse(localStorage.getItem(STORAGE_KEY_FAENAS) || '[]');
    const assets = JSON.parse(localStorage.getItem(STORAGE_KEY_ASSETS) || '[]');
    return { items, faenas, assets };
  } catch {
    return { items: [], faenas: [], assets: [] };
  }
};

export const syncOfflineRequests = async (
  onProgress?: (synced: number, total: number) => void,
): Promise<{ success: number; failed: number }> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;
  const remaining: OfflineRequestItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await api.post('/purchases/requests', item.payload);
      successCount++;
    } catch (err: any) {
      failedCount++;
      remaining.push({
        ...item,
        status: 'ERROR',
        error: err?.response?.data?.message || err?.message || 'Error de sincronización',
      });
    }
    onProgress?.(i + 1, queue.length);
  }

  saveOfflineQueue(remaining);
  return { success: successCount, failed: failedCount };
};

// =================== OFFLINE FUEL DISPATCH SUPPORT ===================

export interface OfflineFuelItem {
  id: string;
  payload: any;
  createdAt: string;
  assetInternalNumber?: string;
  liters?: number;
  status: 'QUEUED' | 'SYNCING' | 'ERROR';
  error?: string;
}

const STORAGE_KEY_FUEL_QUEUE = 'sgmt_offline_fuel_queue';

export const getOfflineFuelQueue = (): OfflineFuelItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FUEL_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineFuelQueue = (queue: OfflineFuelItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_FUEL_QUEUE, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('sgmt-fuel-queue-updated', { detail: { count: queue.length } }));
  } catch (e) {
    console.error('Error saving offline fuel queue', e);
  }
};

export const queueOfflineFuel = (
  payload: any,
  meta?: { assetInternalNumber?: string; liters?: number },
): OfflineFuelItem => {
  const queue = getOfflineFuelQueue();
  const newItem: OfflineFuelItem = {
    id: 'fuel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    payload,
    createdAt: new Date().toISOString(),
    assetInternalNumber: meta?.assetInternalNumber,
    liters: meta?.liters,
    status: 'QUEUED',
  };
  queue.push(newItem);
  saveOfflineFuelQueue(queue);
  return newItem;
};

export const syncOfflineFuel = async (
  onProgress?: (synced: number, total: number) => void,
): Promise<{ success: number; failed: number }> => {
  const queue = getOfflineFuelQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;
  const remaining: OfflineFuelItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      await api.post('/fuel', item.payload);
      successCount++;
    } catch (err: any) {
      failedCount++;
      remaining.push({
        ...item,
        status: 'ERROR',
        error: err?.response?.data?.message || err?.message || 'Error de sincronización',
      });
    }
    onProgress?.(i + 1, queue.length);
  }

  saveOfflineFuelQueue(remaining);
  return { success: successCount, failed: failedCount };
};

