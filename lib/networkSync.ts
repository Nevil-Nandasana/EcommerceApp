import NetInfo from '@react-native-community/netinfo';
import { useOutboxStore } from './outbox';

let unsubscribe: (() => void) | null = null;

export const startNetworkSync = (supabaseClient: any, userId: string) => {
  if (unsubscribe) return;
  
  // Also flush immediately on start
  useOutboxStore.getState().flushOutbox(supabaseClient, userId);
  
  unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      useOutboxStore.getState().flushOutbox(supabaseClient, userId);
    }
  });
};

export const stopNetworkSync = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
