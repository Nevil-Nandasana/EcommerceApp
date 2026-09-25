/**
 * Speqtus Medical Ordering Platform — My Orders Screen (FR-8, T3.4.3, F-14)
 * Displays past order requests, status badges, and 1-tap reorder functionality.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/cart';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

interface PastOrder {
  id: string;
  orderNumber: string;
  status: any;
  subtotal: number | null;
  createdAt: string;
  itemsCount: number;
  items: Array<{
    variantId: string;
    productId: string;
    productName: string;
    categoryName: string;
    artNo: string;
    sizeLabel: string;
    price: number | null;
    imageUrl: string;
    quantity: number;
  }>;
}

export default function MyOrdersScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const addItemToCart = useCartStore((state) => state.addItem);
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchOrders = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          subtotal,
          created_at,
          order_items (
            id,
            quantity,
            unit_price_at_order,
            product_variant_id,
            product_variants (
              id,
              art_no,
              size_label,
              price,
              products (
                id,
                name,
                image_url,
                categories ( name )
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('MyOrders', 'Failed to fetch orders', error);
        return;
      }

      if (data) {
        const mapped: PastOrder[] = data.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          subtotal: o.subtotal,
          createdAt: o.created_at,
          itemsCount: o.order_items?.length || 0,
          items: (o.order_items || []).map((oi: any) => ({
            variantId: oi.product_variants?.id || oi.product_variant_id,
            productId: oi.product_variants?.products?.id || '',
            productName: oi.product_variants?.products?.name || 'Surgical Instrument',
            categoryName: oi.product_variants?.products?.categories?.name || 'General',
            artNo: oi.product_variants?.art_no || '',
            sizeLabel: oi.product_variants?.size_label || '',
            price: oi.unit_price_at_order || oi.product_variants?.price || null,
            imageUrl: oi.product_variants?.products?.image_url || '',
            quantity: oi.quantity,
          })),
        }));
        setOrders(mapped);
      }
    } catch (err) {
      logger.error('MyOrders', 'Unexpected error', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleReorder = (order: PastOrder) => {
    order.items.forEach((item) => {
      addItemToCart(item, item.quantity);
    });
    router.push('/(tabs)/cart');
  };

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.authPromptTitle}>Sign in to view orders</Text>
        <Text style={styles.authPromptSubtitle}>
          Track your surgical order requests and reorder past OT sets in seconds.
        </Text>
        <Button
          title="Sign In with Phone"
          onPress={() => router.push('/(auth)/login')}
          style={styles.signInBtn}
        />
      </View>
    );
  }

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
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              fetchOrders();
            }}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                <Text style={styles.orderDate}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <StatusBadge status={item.status} type="order" />
            </View>

            <View style={styles.orderSummary}>
              <Text style={styles.itemSummaryText}>
                {item.itemsCount} {item.itemsCount === 1 ? 'item' : 'items'} • Tap for details
              </Text>
              {item.subtotal !== null && (
                <Text style={styles.orderTotal}>
                  ₹{item.subtotal.toLocaleString('en-IN')}
                </Text>
              )}
            </View>

            <View style={styles.cardActions}>
              <Button
                title="View Details"
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
                variant="outline"
                style={styles.viewDetailsBtn}
              />
              <Button
                title={strings.orders.reorder}
                onPress={() => handleReorder(item)}
                variant="secondary"
                style={styles.reorderBtn}
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{strings.orders.noOrders}</Text>
            <Button
              title={strings.cart.browseCatalog}
              onPress={() => router.push('/(tabs)')}
              style={{ marginTop: spacing.md }}
            />
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
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  authPromptTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  authPromptSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  signInBtn: {
    minWidth: 200,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.base,
  },
  orderCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
    marginVertical: spacing.xs,
  },
  itemSummaryText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  orderTotal: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  cardActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  viewDetailsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  reorderBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
  },
});
