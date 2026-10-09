/**
 * Speqtus Medical Ordering Platform — Admin Layout & Guard (FR-9, T4.1.1)
 * Enforces role-based route guard: only users with role === 'admin' can view.
 */

import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';

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

  if (!session || !isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedText}>Access Denied: Speqtus Admin Only</Text>
        <Text style={styles.deniedSubtitle}>
          You must be logged in as an authorized administrator to view this section.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.backButtonText}>Return to Catalog</Text>
        </TouchableOpacity>
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
  deniedSubtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
    fontSize: typography.fontSizes.sm,
  },
});
