/**
 * Speqtus Medical Ordering Platform — Product Detail Screen (FR-2, T3.2.3, T3.2.4, T3.2.5)
 * Displays instrument photos, descriptions, and variant table with price gating.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/cart';
import { ProductWithVariants, ProductVariant } from '@/types';
import { VariantRow } from '@/components/VariantRow';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id: productId } = useLocalSearchParams<{ id: string }>();
  const { isApproved, session } = useAuth();
  const addItemToCart = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select(`
            id,
            category_id,
            name,
            description,
            image_url,
            additional_images,
            search_tags,
            is_active,
            source_row_ref,
            created_at,
            updated_at,
            categories (
              id,
              name,
              parent_category
            )
          `)
          .eq('id', productId)
          .single();

        if (prodError || !prodData) {
          logger.error('ProductDetail', 'Failed to fetch product', prodError);
          return;
        }

        // Fetch variants using the price-protected catalog_variants view (FR-5)
        const { data: varData, error: varError } = await supabase
          .from('catalog_variants')
          .select('*')
          .eq('product_id', productId)
          .eq('is_active', true)
          .order('size_cm', { ascending: true })
          .order('art_no', { ascending: true });

        if (varError) {
          logger.error('ProductDetail', 'Failed to fetch variants', varError);
          return;
        }

        const rawCategory = Array.isArray(prodData.categories)
          ? prodData.categories[0]
          : prodData.categories;
        const categoryData = rawCategory as
          | { id: string; name: string; parent_category?: string | null }
          | null
          | undefined;

        const mappedProduct: ProductWithVariants = {
          id: prodData.id,
          categoryId: prodData.category_id,
          name: prodData.name,
          description: prodData.description,
          imageUrl: prodData.image_url,
          additionalImages: prodData.additional_images,
          searchTags: prodData.search_tags || [],
          isActive: prodData.is_active,
          sourceRowRef: prodData.source_row_ref,
          createdAt: prodData.created_at,
          updatedAt: prodData.updated_at,
          category: categoryData
            ? {
                id: categoryData.id,
                name: categoryData.name,
                parentCategory: categoryData.parent_category || '',
                sortOrder: 0,
                slug: '',
                createdAt: '',
              }
            : undefined,
          variants: (varData || []).map((v: any) => ({
            id: v.id,
            productId: v.product_id,
            artNo: v.art_no,
            sizeLabel: v.size_label,
            sizeCm: v.size_cm,
            price: v.price,
            currency: v.currency || 'INR',
            isActive: v.is_active,
            createdAt: v.created_at,
            updatedAt: v.updated_at,
          })),
        };

        setProduct(mappedProduct);
      } catch (err) {
        logger.error('ProductDetail', 'Unexpected error', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId]);

  const handleAddToCart = (variant: ProductVariant, quantity: number) => {
    if (!product) return;
    addItemToCart(
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        categoryName: product.category?.name || 'General',
        artNo: variant.artNo,
        sizeLabel: variant.sizeLabel,
        price: variant.price,
        imageUrl: product.imageUrl,
      },
      quantity
    );
    Alert.alert('Added to Cart', `${variant.artNo} (${quantity} units) added to your order request.`);
  };

  const handleLoginPrompt = () => {
    router.push('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{strings.common.loading}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Instrument not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.imageCard}>
        <Image
          source={{ uri: product.imageUrl || 'https://via.placeholder.com/300' }}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.detailsCard}>
        {product.category && (
          <Text style={styles.categoryName}>{product.category.name}</Text>
        )}
        <Text style={styles.productName}>{product.name}</Text>

        {product.description ? (
          <Text style={styles.descriptionText}>{product.description}</Text>
        ) : null}

        <View style={styles.specialtyTagsRow}>
          {product.searchTags.map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.variantsCard}>
        <Text style={styles.variantsTitle}>Available Sizes & Art Nos</Text>
        <Text style={styles.variantsSubtitle}>
          Select quantities and tap Add to build your order request.
        </Text>

        <View style={styles.variantsList}>
          {product.variants.map((v) => (
            <VariantRow
              key={v.id}
              variant={v}
              isApproved={isApproved}
              isGuest={!session}
              onAddToCart={handleAddToCart}
              onLoginPrompt={handleLoginPrompt}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  notFoundText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
  },
  imageCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  mainImage: {
    width: '100%',
    height: 240,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.base,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  categoryName: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  productName: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  descriptionText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.normal * typography.fontSizes.sm,
    marginTop: spacing.sm,
  },
  specialtyTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  variantsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xxl,
  },
  variantsTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  variantsSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  variantsList: {
    marginTop: spacing.xs,
  },
});
