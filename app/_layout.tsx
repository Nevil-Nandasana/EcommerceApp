/**
 * Speqtus Medical Ordering Platform — Root App Layout
 * Configures AuthProvider, theme, and top-level Stack navigation.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';
import { colors } from '@/constants/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
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
      </Stack>
    </AuthProvider>
  );
}
