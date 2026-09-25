/**
 * Speqtus Medical Ordering Platform — Admin Layout & Guard (FR-9, T4.1.1)
 * Enforces role-based route guard: only users with role === 'admin' can view.
 */

import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';

export default function AdminLayout() {
  const router = useRouter();
  const { isAdmin, isLoading, session } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.replace('/(auth)/login');
      } else if (!isAdmin) {
        router.replace('/(tabs)');
      }
    }
  }, [isAdmin, isLoading, session]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Verifying Administrator Privileges...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedText}>Access Denied: Speqtus Admin Only</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primaryDark,
        },
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Speqtus Back Office',
          headerBackTitle: 'Home',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  text: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  deniedText: {
    color: colors.error,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
});
