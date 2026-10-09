/**
 * Speqtus Medical Ordering Platform — Category Product List Screen (FR-1, T3.2.2)
 * Virtualized product listing with size count badges and image thumbnails.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProductSummary } from '@/types';
import { fetchCategoryProductsWithCache, getCachedCategoryProducts } from '@/lib/catalogCache';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

const SPECIALTIES = ["All", "General Surgery", "Orthopedic", "Gynecology", "ENT", "Cardiovascular"];

export default function CategoryProductsScreen() {
  const router = useRouter();
  const { id: categoryId, name: categoryName } = useLocalSearchParams<{ id: string; name?: string }>();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeSpecialty, setActiveSpecialty] = useState<string>("All");

  const loadProducts = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!categoryId) return;

      // Instant 0ms load from local disk cache if available
      if (!forceRefresh) {
        const cached = await getCachedCategoryProducts(categoryId);
        if (cached && cached.length > 0) {
          setProducts(cached);
          setIsLoading(false);
        }
      }

      try {
        const { data } = await fetchCategoryProductsWithCache(categoryId, forceRefresh);
        if (data && data.length > 0) {
          setProducts(data);
        }
      } catch (err) {
        logger.error('CategoryProducts', 'Failed to load products', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [categoryId]
  );

  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProducts(true);
  };

  const handleSelectProduct = (productId: string) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: productId },
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

  const filteredProducts = products.filter((p) => {
    if (activeSpecialty === 'All') return true;
    const nameLower = p.name.toLowerCase();
    const specLower = activeSpecialty.toLowerCase();
    
    // Check if any search tag matches
    if (p.searchTags.some(tag => tag.toLowerCase().includes(specLower))) {
      return true;
    }

    if (specLower === 'general surgery') {
      return nameLower.includes('surgery') || nameLower.includes('general') || nameLower.includes('scalpel') || nameLower.includes('forceps');
    }
    if (specLower === 'orthopedic') {
      return nameLower.includes('ortho') || nameLower.includes('bone') || nameLower.includes('drill');
    }
    if (specLower === 'gynecology') {
      return nameLower.includes('gyn') || nameLower.includes('speculum');
    }
    if (specLower === 'ent') {
      return nameLower.includes('ear') || nameLower.includes('nose') || nameLower.includes('throat') || nameLower.includes('laryng');
    }
    if (specLower === 'cardiovascular') {
      return nameLower.includes('cardio') || nameLower.includes('vascular') || nameLower.includes('vein') || nameLower.includes('artery');
    }
    return nameLower.includes(specLower);
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectProduct(item.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Image
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
              style={styles.thumbnail}
              cachePolicy="disk"
              contentFit="cover"
            />
            <View style={styles.cardDetails}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {strings.catalog.sizesCount(item.variantsCount)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {categoryName && (
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{categoryName}</Text>
                <Text style={styles.itemCountText}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'instrument' : 'instruments'} available
                </Text>
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {SPECIALTIES.map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.chip,
                    activeSpecialty === spec && styles.chipActive,
                  ]}
                  onPress={() => setActiveSpecialty(spec)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      activeSpecialty === spec && styles.chipTextActive,
                    ]}
                  >
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active instruments match your criteria.</Text>
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
  },
  header: {
    marginBottom: spacing.base,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  itemCountText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerContainer: {
    marginBottom: spacing.base,
  },
  chipScroll: {
    marginTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.medium,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  listContent: {
    padding: spacing.base,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: layout.minTouchTarget + spacing.md,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.md,
  },
  cardDetails: {
    flex: 1,
  },
  productName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
});
