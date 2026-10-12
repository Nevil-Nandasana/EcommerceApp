/**
 * Speqtus Medical Ordering Platform — Catalog Search Screen (FR-3, T3.3.1)
 * Trigram typo-tolerant & Art No substring search invoking `search_catalog` RPC.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';
import { searchOfflineCatalog } from '@/lib/offlineCatalog';

interface SearchResult {
  productId: string;
  productName: string;
  categoryName: string;
  categoryId: string;
  imageUrl: string;
  artNo: string;
  sizeLabel: string;
  price: number | null;
  stockQuantity?: number | null;
  isInStock?: boolean;
  lowStockThreshold?: number | null;
  similarityScore: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isOfflineResult, setIsOfflineResult] = useState<boolean>(false);

  const performSearch = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setIsOfflineResult(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.rpc('search_catalog', {
        query_text: trimmed,
        result_limit: 30,
      });

      if (error) {
        logger.warn('SearchScreen', 'Search RPC failed, falling back to offline catalog', error);
        const offlineResults = await searchOfflineCatalog(trimmed, 30);
        setResults(offlineResults);
        setIsOfflineResult(offlineResults.length > 0);
        return;
      }

      if (data) {
        setIsOfflineResult(false);
        setResults(
          data.map((r: any) => ({
            productId: r.product_id,
            productName: r.product_name,
            categoryName: r.category_name,
            categoryId: r.category_id,
            imageUrl: r.image_url,
            artNo: r.art_no,
            sizeLabel: r.size_label,
            price: r.price,
            stockQuantity: r.stock_quantity,
            isInStock: r.is_in_stock,
            lowStockThreshold: r.low_stock_threshold,
            similarityScore: r.similarity_score,
          }))
        );
      }
    } catch (err) {
      logger.warn('SearchScreen', 'Search exception, attempting offline catalog', err);
      const offlineResults = await searchOfflineCatalog(trimmed, 30);
      setResults(offlineResults);
      setIsOfflineResult(offlineResults.length > 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectProduct = (productId: string) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: productId },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={strings.catalog.searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            performSearch(text);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {isOfflineResult && results.length > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚡ Offline Mode: Showing local catalog results
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.productId}-${item.artNo}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultItem}
            onPress={() => handleSelectProduct(item.productId)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Image
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
              style={styles.thumbnail}
            />
            <View style={styles.itemDetails}>
              <Text style={styles.categoryBadge}>{item.categoryName}</Text>
              <Text style={styles.productName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.variantDetail}>
                {strings.catalog.artNoPrefix}
                <Text style={styles.artNoBold}>{item.artNo}</Text> • {item.sizeLabel}
              </Text>
              {item.stockQuantity !== undefined && item.stockQuantity !== null && (
                <View style={styles.stockBadgeContainer}>
                  {item.isInStock === false || item.stockQuantity === 0 ? (
                    <Text style={styles.stockMuted}>• Made to Order</Text>
                  ) : item.stockQuantity <= (item.lowStockThreshold || 5) ? (
                    <Text style={styles.stockLow}>• Low Stock: {item.stockQuantity} left</Text>
                  ) : (
                    <Text style={styles.stockIn}>• In Stock</Text>
                  )}
                </View>
              )}
            </View>
            <View style={styles.itemPriceCol}>
              {item.price !== null ? (
                <Text style={styles.priceText}>₹{item.price.toLocaleString('en-IN')}</Text>
              ) : (
                <Text style={styles.confidentialText}>Price on login</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          hasSearched && !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No matching instruments</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for a partial Art No like "03-27" or an instrument name like "Forceps".
              </Text>
            </View>
          ) : !hasSearched ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.initialHint}>
                Enter an Art No or instrument name to find products instantly across 24 categories.
              </Text>
            </View>
          ) : null
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
  searchBarContainer: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSubtle,
  },
  loadingContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.base,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  categoryBadge: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    fontWeight: typography.fontWeights.medium,
  },
  productName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  variantDetail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  artNoBold: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  itemPriceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  priceText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  confidentialText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  initialHint: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: '#eff6ff',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  offlineBannerText: {
    fontSize: typography.fontSizes.xs,
    color: '#1d4ed8',
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
  stockBadgeContainer: {
    marginTop: 2,
  },
  stockIn: {
    fontSize: typography.fontSizes.xs,
    color: '#16a34a',
    fontWeight: typography.fontWeights.medium,
  },
  stockLow: {
    fontSize: typography.fontSizes.xs,
    color: '#d97706',
    fontWeight: typography.fontWeights.semibold,
  },
  stockMuted: {
    fontSize: typography.fontSizes.xs,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

