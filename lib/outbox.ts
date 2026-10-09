import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { CartItem } from '@/types';
import { logger } from './logger';

export interface OutboxOrder {
  id: string;
  items: CartItem[];
  addressId: string | null;
  addressData: { line1: string; city: string; state: string; pincode: string } | null;
  notes: string | null;
  createdAt: string;
  status: 'queued' | 'syncing' | 'failed';
}

interface OutboxState {
  outboxOrders: OutboxOrder[];
  addToOutbox: (order: Omit<OutboxOrder, 'id' | 'createdAt' | 'status'>) => Promise<string>;
  flushOutbox: (supabaseClient: any, userId: string) => Promise<void>;
  clearOutbox: () => void;
}

const generateId = () =>
  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const outboxStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(name);
    }
    try {
      const val = await AsyncStorage.getItem(name);
      if (val !== null) return val;

      // Graceful migration from legacy SecureStore if previously stored there
      try {
        const legacyVal = await SecureStore.getItemAsync(name);
        if (legacyVal) {
          await AsyncStorage.setItem(name, legacyVal);
          await SecureStore.deleteItemAsync(name).catch(() => {});
          return legacyVal;
        }
      } catch {
        // Ignore legacy read errors
      }
      return null;
    } catch (err) {
      logger.warn('OutboxStorage', `Failed to read ${name} from AsyncStorage`, err);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(name, value);
      }
      return;
    }
    try {
      await AsyncStorage.setItem(name, value);
    } catch (err) {
      logger.error('OutboxStorage', `Failed to write ${name} to AsyncStorage`, err);
      throw err;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(name);
      }
      return;
    }
    try {
      await AsyncStorage.removeItem(name);
    } catch (err) {
      logger.warn('OutboxStorage', `Failed to remove ${name} from AsyncStorage`, err);
      throw err;
    }
  },
};

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set, get) => ({
      outboxOrders: [],
      addToOutbox: async (order) => {
        const newOrder: OutboxOrder = {
          ...order,
          id: generateId(),
          createdAt: new Date().toISOString(),
          status: 'queued',
        };
        const nextOrders = [...get().outboxOrders, newOrder];

        // Explicitly write to persistent storage and propagate failure to caller
        try {
          const serialized = JSON.stringify({ state: { outboxOrders: nextOrders }, version: 0 });
          await outboxStorageAdapter.setItem('outbox-storage', serialized);
        } catch (persistErr) {
          logger.error('Outbox', 'Failed to persist order to offline storage', persistErr);
          throw new Error('Could not persist order to device storage. Please check available disk space.');
        }

        set({ outboxOrders: nextOrders });
        return newOrder.id;
      },
      flushOutbox: async (supabaseClient, userId) => {
        const { outboxOrders } = get();
        const queued = outboxOrders.filter((o) => o.status === 'queued' || o.status === 'failed');
        if (queued.length === 0) return;

        set((state) => ({
          outboxOrders: state.outboxOrders.map((o) =>
            queued.find((q) => q.id === o.id) ? { ...o, status: 'syncing' } : o
          ),
        }));

        for (const order of queued) {
          try {
            let finalAddressId = order.addressId;
            if (!finalAddressId && order.addressData) {
              const { data: newAddr, error: createAddrError } = await supabaseClient
                .from('addresses')
                .insert({
                  user_id: userId,
                  label: 'Clinic OT (Offline Sync)',
                  line1: order.addressData.line1,
                  city: order.addressData.city,
                  state: order.addressData.state,
                  pincode: order.addressData.pincode,
                  is_default: true,
                })
                .select('id')
                .single();

              if (createAddrError || !newAddr) {
                throw new Error('Address creation failed');
              }
              finalAddressId = newAddr.id;

              // Cache resolved address ID on the order in case submit_order fails and retries
              set((state) => ({
                outboxOrders: state.outboxOrders.map((o) =>
                  o.id === order.id ? { ...o, addressId: finalAddressId } : o
                ),
              }));
            }

            const itemsPayload = order.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            }));

            const { data: rpcData, error: rpcError } = await supabaseClient.rpc('submit_order', {
              p_address_id: finalAddressId,
              p_notes: order.notes,
              p_items: itemsPayload,
            });

            if (rpcError) throw rpcError;
            
            if (rpcData && rpcData.id) {
              supabaseClient.functions.invoke('send-order-alert', { body: { order_id: rpcData.id } })
                .catch((err: any) => logger.warn('Outbox', 'Failed to invoke order alert', err));
            }

            set((state) => ({
              outboxOrders: state.outboxOrders.filter((o) => o.id !== order.id),
            }));
          } catch (e) {
            logger.error('Outbox', `Failed to sync order ${order.id}`, e);
            set((state) => ({
              outboxOrders: state.outboxOrders.map((o) =>
                o.id === order.id ? { ...o, status: 'failed' } : o
              ),
            }));
          }
        }
      },
      clearOutbox: () => set({ outboxOrders: [] }),
    }),
    {
      name: 'outbox-storage',
      storage: createJSONStorage(() => outboxStorageAdapter),
    }
  )
);
