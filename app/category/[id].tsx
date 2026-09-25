/**
 * Speqtus Medical Ordering Platform — Category Product List Screen (FR-1, T3.2.2)
 * Virtualized product listing with size count badges and image thumbnails.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

interface ProductSummary {
  id: string;
  name: string;
  imageUrl: string;
  variantsCount: number;
}

export default function CategoryProductsScreen() {
  const router = useRouter();
  const { id: categoryId, name: categoryName } = useLocalSearchParams<{ id: string; name?: string }>();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            image_url,
            product_variants ( id )
          `)
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          logger.error('CategoryProducts', 'Failed to fetch products', error);
          return;
        }

        if (data) {
          setProducts(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              imageUrl: p.image_url,
              variantsCount: p.product_variants?.length || 0,
            }))
          );
        }
      } catch (err) {
        logger.error('CategoryProducts', 'Unexpected error', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryId]);

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

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
          categoryName ? (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{categoryName}</Text>
              <Text style={styles.itemCountText}>
                {products.length} {products.length === 1 ? 'instrument' : 'instruments'} available
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active instruments in this section yet.</Text>
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
