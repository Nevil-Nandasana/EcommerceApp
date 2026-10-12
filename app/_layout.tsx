/**
 * Speqtus Medical Ordering Platform — Root App Layout
 * Configures AuthProvider, theme, and top-level Stack navigation.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/constants/colors';
import { prefetchCatalogThumbnails } from '@/lib/imageCache';
import { startNetworkSync, stopNetworkSync } from '@/lib/networkSync';
import { syncCloudCartWithLocal } from '@/lib/cartSync';
import { supabase } from '@/lib/supabase';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useI18n } from '@/lib/i18n';
import { syncFullCatalogOffline } from '@/lib/offlineCatalog';

function AppStartup() {
  const { isApproved, session, user } = useAuth();
  
  useEffect(() => {
    useI18n.getState().initLanguage();
  }, []);

  useEffect(() => {
    if (session && user) {
      startNetworkSync(supabase, user.id);
      syncCloudCartWithLocal(user.id).catch(() => {});
    }
    return () => stopNetworkSync();
  }, [session, user]);

  useEffect(() => {
    if (isApproved) {
      const runPrefetch = async () => {
        const { data } = await supabase.from('products').select('image_url').not('image_url', 'is', null);
        if (data) {
          prefetchCatalogThumbnails(data.map(d => d.image_url));
        }
        syncFullCatalogOffline().catch(() => {});
      };
      runPrefetch();
    }
  }, [isApproved]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppStartup />
      <OfflineBanner />
      <StatusBar style="light" backgroundColor={colors.primary} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.textOnPrimary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)/login"
          options={{ title: 'Doctor Sign In', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="(auth)/otp"
          options={{ title: 'Verify OTP', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="(auth)/profile-completion"
          options={{ title: 'Complete Profile', headerBackVisible: false }}
        />
        <Stack.Screen
          name="category/[id]"
          options={{ title: 'Products', headerBackTitle: 'Categories' }}
        />
        <Stack.Screen
          name="product/[id]"
          options={{ title: 'Instrument Detail', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="checkout"
          options={{ title: 'Review Order Request', headerBackTitle: 'Cart' }}
        />
        <Stack.Screen
          name="order/[id]"
          options={{ title: 'Order Details', headerBackTitle: 'Orders' }}
        />
        <Stack.Screen
          name="saved-sets"
          options={{ title: 'My OT Sets', headerBackTitle: 'Profile' }}
        />
        <Stack.Screen
          name="addresses"
          options={{ title: 'Delivery Addresses', headerBackTitle: 'Profile' }}
        />
      </Stack>
    </AuthProvider>
  );
}
