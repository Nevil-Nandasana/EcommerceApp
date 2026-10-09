/**
 * Speqtus Medical Ordering Platform — Catalog Categories Screen (FR-1, T3.2.1)
 * Displays 24 surgical categories, banner categories, and pending approval banner.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Category } from '@/types';
import { CategoryCard } from '@/components/CategoryCard';
import { PendingBanner } from '@/components/PendingBanner';
import { useAuth } from '@/lib/auth';
import { fetchCategoriesWithCache, getCachedCategories } from '@/lib/catalogCache';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

export default function CatalogIndexScreen() {
  const router = useRouter();
  const { isPending, profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadCategories = useCallback(async (forceRefresh: boolean = false) => {
    // Instant 0ms load from local disk cache if available
    if (!forceRefresh) {
      const cached = await getCachedCategories();
      if (cached && cached.length > 0) {
        setCategories(cached);
        setIsLoading(false);
      }
    }

    try {
      const { data } = await fetchCategoriesWithCache(forceRefresh);
      if (data && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      logger.error('CatalogIndex', 'Unexpected error loading categories', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories(false);
  }, [loadCategories]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCategories(true);
  };

  const handleSelectCategory = (cat: Category) => {
    router.push({
      pathname: '/category/[id]',
      params: { id: cat.id, name: cat.name },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{strings.common.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isPending && <PendingBanner />}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CategoryCard category={item} onPress={handleSelectCategory} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>
              {profile ? `Welcome Dr. ${profile.fullName}` : 'Surgical Specialties'}
            </Text>
            <Text style={styles.headerTitle}>Browse Instrument Categories</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{strings.common.emptyState}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  listContent: {
    padding: spacing.base,
  },
  header: {
    marginBottom: spacing.base,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.base,
  },
});
