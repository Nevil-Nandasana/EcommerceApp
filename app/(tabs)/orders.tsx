/**
 * Speqtus Medical Ordering Platform — My Orders Screen (FR-8, T3.4.3, F-14)
 * Displays past order requests, status filter tabs, search by order number / instruments,
 * status badges, and 1-tap reorder functionality with price transparency modal.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/cart';
import { useOutboxStore } from '@/lib/outbox';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { ReorderWarningModal } from '@/components/ReorderWarningModal';
import { checkReorderPriceChanges, ReorderItemDiff } from '@/lib/reorderCheck';
import { CartItem, OrderStatus } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

interface PastOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
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

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'requested', label: 'Requested' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function MyOrdersScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const addItemToCart = useCartStore((state) => state.addItem);
  const outboxOrders = useOutboxStore((state) => state.outboxOrders);

  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search & Filter State (Feature 1)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Reorder Price Transparency State (Feature 3)
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [reorderModalVisible, setReorderModalVisible] = useState<boolean>(false);
  const [reorderDiffs, setReorderDiffs] = useState<ReorderItemDiff[]>([]);
  const [reorderTargetOrderNumber, setReorderTargetOrderNumber] = useState<string>('');
  const [reorderItemsToAdd, setReorderItemsToAdd] = useState<
    Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }>
  >([]);

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
            price: oi.unit_price_at_order ?? oi.product_variants?.price ?? null,
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

  // Status count map for filter pills (including offline queued outbox orders under All and Requested)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length + outboxOrders.length,
      requested: outboxOrders.length,
    };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders, outboxOrders]);

  // Filtered offline outbox orders based on active tab and search input
  const filteredOutboxOrders = useMemo(() => {
    if (selectedStatus !== 'all' && selectedStatus !== 'requested') {
      return [];
    }
    if (!searchQuery.trim()) {
      return outboxOrders;
    }
    const q = searchQuery.trim().toLowerCase();
    return outboxOrders.filter((outbox) => {
      const matchesId = (outbox.id || '').toLowerCase().includes(q) || 'offline request'.includes(q);
      const matchesItem = (outbox.items || []).some(
        (item: any) =>
          (item.productName || '').toLowerCase().includes(q) ||
          (item.artNo || '').toLowerCase().includes(q)
      );
      return matchesId || matchesItem;
    });
  }, [outboxOrders, selectedStatus, searchQuery]);

  // Filtered orders list based on active tab and search input
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }

      // 2. Search Query (order # or instrument name / art no / category)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesOrderNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesItem = order.items.some(
          (item) =>
            item.productName.toLowerCase().includes(q) ||
            item.artNo.toLowerCase().includes(q) ||
            item.categoryName.toLowerCase().includes(q)
        );
        if (!matchesOrderNumber && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedStatus, searchQuery]);

  // Reorder flow with live catalog price transparency check (Feature 3)
  const handleReorder = async (order: PastOrder) => {
    if (!order.items || order.items.length === 0) {
      return;
    }
    setCheckingOrderId(order.id);
    setReorderTargetOrderNumber(order.orderNumber);

    try {
      const sourceItems = order.items.map((i) => ({
        variantId: i.variantId,
        productId: i.productId,
        productName: i.productName,
        categoryName: i.categoryName,
        artNo: i.artNo,
        sizeLabel: i.sizeLabel,
        price: i.price,
        imageUrl: i.imageUrl,
        quantity: i.quantity,
      }));

      const result = await checkReorderPriceChanges(sourceItems);
      if (result.hasChanges) {
        setReorderDiffs(result.diffs);
        setReorderItemsToAdd(result.itemsReadyForCart);
        setReorderModalVisible(true);
      } else {
        result.itemsReadyForCart.forEach(({ item, quantity }) => {
          addItemToCart(item, quantity);
        });
        router.push('/(tabs)/cart');
      }
    } catch (err) {
      logger.error('MyOrders', 'Reorder check error', err);
      order.items.forEach((item) => {
        addItemToCart(
          {
            variantId: item.variantId,
            productId: item.productId,
            productName: item.productName,
            categoryName: item.categoryName,
            artNo: item.artNo,
            sizeLabel: item.sizeLabel,
            price: item.price,
            imageUrl: item.imageUrl,
          },
          item.quantity
        );
      });
      router.push('/(tabs)/cart');
    } finally {
      setCheckingOrderId(null);
    }
  };

  const confirmReorderModal = () => {
    if (reorderItemsToAdd.length === 0) {
      setReorderModalVisible(false);
      return;
    }
    reorderItemsToAdd.forEach(({ item, quantity }) => {
      addItemToCart(item, quantity);
    });
    setReorderModalVisible(false);
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
      {/* Search Bar & Status Filter Header */}
      <View style={styles.filterHeaderContainer}>
        {/* Quick Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order # (SPQ-2026-...) or instrument"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Horizontal Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((tab) => {
            const isSelected = selectedStatus === tab.id;
            const count = statusCounts[tab.id] || 0;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setSelectedStatus(tab.id)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[styles.countBadge, isSelected && styles.countBadgeActive]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        isSelected && styles.countBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
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
        ListHeaderComponent={
          filteredOutboxOrders.length > 0 ? (
            <View style={{ marginBottom: spacing.md }}>
              {filteredOutboxOrders.map((outbox) => (
                <View key={outbox.id} style={[styles.orderCard, { borderColor: colors.warning }]}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderNumber}>Offline Request</Text>
                      <Text style={styles.orderDate}>
                        {new Date(outbox.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#FFF9C4',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ color: '#F57F17', fontSize: 12, fontWeight: 'bold' }}>
                        🕒 Queued — Pending Sync
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.orderSummary,
                      { borderTopColor: '#FFF9C4', borderBottomColor: '#FFF9C4' },
                    ]}
                  >
                    <View>
                      <Text style={styles.itemSummaryText}>
                        {outbox.items.length} {outbox.items.length === 1 ? 'item' : 'items'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                        Will sync automatically when connected
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : null
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
                loading={checkingOrderId === item.id}
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          filteredOutboxOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {orders.length === 0 && outboxOrders.length === 0
                  ? strings.orders.noOrders
                  : 'No orders match your filter/search criteria'}
              </Text>
              {orders.length > 0 || outboxOrders.length > 0 ? (
                <Button
                  title="Reset Filters"
                  onPress={() => {
                    setSelectedStatus('all');
                    setSearchQuery('');
                  }}
                  variant="outline"
                  style={{ marginTop: spacing.md }}
                />
              ) : (
                <Button
                  title={strings.cart.browseCatalog}
                  onPress={() => router.push('/(tabs)')}
                  style={{ marginTop: spacing.md }}
                />
              )}
            </View>
          ) : null
        }
      />

      {/* Reorder Price Transparency Warning Modal (Feature 3) */}
      <ReorderWarningModal
        visible={reorderModalVisible}
        orderNumber={reorderTargetOrderNumber}
        diffs={reorderDiffs}
        onCancel={() => setReorderModalVisible(false)}
        onConfirm={confirmReorderModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterHeaderContainer: {
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  clearBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.bold,
  },
  filterScroll: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textPrimary,
  },
  filterPillTextActive: {
    color: colors.textOnPrimary,
    fontWeight: typography.fontWeights.bold,
  },
  countBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  countBadgeTextActive: {
    color: colors.textOnPrimary,
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
    textAlign: 'center',
  },
});
