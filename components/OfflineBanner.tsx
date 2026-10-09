import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.xs) }]}>
      <Text style={styles.text}>
        ⚠️ Offline Mode — Browsing offline catalog. Orders will be queued and synced automatically.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningLight,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    zIndex: 9999,
  },
  text: {
    color: colors.warning,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
});
