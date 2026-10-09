import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
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
  addToOutbox: (order: Omit<OutboxOrder, 'id' | 'createdAt' | 'status'>) => void;
  flushOutbox: (supabaseClient: any, userId: string) => Promise<void>;
  clearOutbox: () => void;
}

const generateId = () =>
  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const outboxStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(name);
    }
    try {
      return await SecureStore.getItemAsync(name);
    } catch (err) {
      logger.warn('OutboxStorage', `Failed to read ${name} from SecureStore`, err);
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
      await SecureStore.setItemAsync(name, value);
    } catch (err) {
      logger.warn('OutboxStorage', `Failed to write ${name} to SecureStore`, err);
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
      await SecureStore.deleteItemAsync(name);
    } catch (err) {
      logger.warn('OutboxStorage', `Failed to remove ${name} from SecureStore`, err);
    }
  },
};

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set, get) => ({
      outboxOrders: [],
      addToOutbox: (order) => {
        set((state) => ({
          outboxOrders: [
            ...state.outboxOrders,
            {
              ...order,
              id: generateId(),
              createdAt: new Date().toISOString(),
              status: 'queued',
            },
          ],
        }));
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
