/**
 * Speqtus Medical Ordering Platform — Zustand Cart Store (T3.3.2)
 * Governed by PRD FR-6 and VARIABLE_REGISTRY.md.
 * Persists locally across app restarts via cross-platform storage adapter.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { CartItem } from '@/types';

interface CartState {
  cartItems: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (variantId: string, delta: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getEstimatedSubtotal: () => number | null;
}

// Cross-platform persistent storage adapter for Zustand
const cartStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(name);
    }
    try {
      const val = await AsyncStorage.getItem(name);
      if (val !== null) return val;

      // Graceful migration from legacy SecureStore
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
    } catch {
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
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(name);
      }
      return;
    }
    await AsyncStorage.removeItem(name);
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartItems: [],

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existingIndex = state.cartItems.findIndex((i) => i.variantId === item.variantId);
          if (existingIndex > -1) {
            const updated = [...state.cartItems];
            updated[existingIndex].quantity += quantity;
            return { cartItems: updated };
          }
          return { cartItems: [...state.cartItems, { ...item, quantity }] };
        });
      },

      updateQuantity: (variantId, delta) => {
        set((state) => {
          const updated = state.cartItems
            .map((item) => {
              if (item.variantId === variantId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
              }
              return item;
            })
            .filter((item): item is CartItem => item !== null);
          return { cartItems: updated };
        });
      },

      setQuantity: (variantId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { cartItems: state.cartItems.filter((i) => i.variantId !== variantId) };
          }
          return {
            cartItems: state.cartItems.map((i) =>
              i.variantId === variantId ? { ...i, quantity } : i
            ),
          };
        });
      },

      removeItem: (variantId) => {
        set((state) => ({
          cartItems: state.cartItems.filter((i) => i.variantId !== variantId),
        }));
      },

      clearCart: () => {
        set({ cartItems: [] });
      },

      getTotalItems: () => {
        return get().cartItems.reduce((acc, item) => acc + item.quantity, 0);
      },

      getEstimatedSubtotal: () => {
        const items = get().cartItems;
        let total = 0;
        for (const item of items) {
          if (item.price === null) return null;
          total += item.price * item.quantity;
        }
        return total;
      },
    }),
    {
      name: 'speqtus-cart-storage',
      storage: createJSONStorage(() => cartStorageAdapter),
      partialize: (state) => ({ cartItems: state.cartItems } as CartState),
    }
  )
);
