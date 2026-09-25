/**
 * Speqtus Medical Ordering Platform — Order Detail Screen (FR-8, T3.4.4)
 * Displays itemized order snapshots, delivery address, status history timeline, and reorder action.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/lib/cart';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { OrderStatus } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

interface OrderDetailItem {
  id: string;
  variantId: string;
  productName: string;
  artNo: string;
  sizeLabel: string;
  quantity: number;
  unitPrice: number | null;
  imageUrl: string;
}

interface OrderTimelineEvent {
  id: string;
  status: OrderStatus;
  changedAt: string;
  note: string | null;
}

interface FullOrderDetails {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number | null;
  notes: string | null;
  createdAt: string;
  address: {
    label: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
  items: OrderDetailItem[];
  timeline: OrderTimelineEvent[];
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id: orderId } = useLocalSearchParams<{ id: string }>();
  const addItemToCart = useCartStore((state) => state.addItem);

  const [order, setOrder] = useState<FullOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    try {
      // 1. Fetch order details with address
      const { data: ordData, error: ordError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          subtotal,
          notes,
          created_at,
          addresses (
            label,
            line1,
            line2,
            city,
            state,
            pincode
          )
        `)
        .eq('id', orderId)
        .single();

      if (ordError || !ordData) {
        logger.error('OrderDetail', 'Failed to fetch order', ordError);
        return;
      }

      // 2. Fetch order items with snapshot info
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
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
              name,
              image_url
            )
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        logger.error('OrderDetail', 'Failed to fetch order items', itemsError);
      }

      // 3. Fetch status history timeline
      const { data: historyData, error: histError } = await supabase
        .from('order_status_history')
        .select('id, status, changed_at, note')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: true });

      if (histError) {
        logger.error('OrderDetail', 'Failed to fetch status history', histError);
      }

      const mappedItems: OrderDetailItem[] = (itemsData || []).map((oi: any) => ({
        id: oi.id,
        variantId: oi.product_variants?.id || oi.product_variant_id,
        productName: oi.product_variants?.products?.name || 'Surgical Instrument',
        artNo: oi.product_variants?.art_no || '',
        sizeLabel: oi.product_variants?.size_label || '',
        quantity: oi.quantity,
        unitPrice: oi.unit_price_at_order,
        imageUrl: oi.product_variants?.products?.image_url || '',
      }));

      const mappedTimeline: OrderTimelineEvent[] = (historyData || []).map((h: any) => ({
        id: h.id,
        status: h.status,
        changedAt: h.changed_at,
        note: h.note,
      }));

      const addr = Array.isArray(ordData.addresses) ? ordData.addresses[0] : ordData.addresses;

      setOrder({
        id: ordData.id,
        orderNumber: ordData.order_number,
        status: ordData.status,
        subtotal: ordData.subtotal,
        notes: ordData.notes,
        createdAt: ordData.created_at,
        address: addr || null,
        items: mappedItems,
        timeline: mappedTimeline,
      });
    } catch (err) {
      logger.error('OrderDetail', 'Unexpected error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const handleReorder = () => {
    if (!order) return;
    order.items.forEach((item) => {
      addItemToCart(
        {
          variantId: item.variantId,
          productId: '',
          productName: item.productName,
          categoryName: 'Reordered Instruments',
          artNo: item.artNo,
          sizeLabel: item.sizeLabel,
          price: item.unitPrice,
          imageUrl: item.imageUrl,
        },
        item.quantity
      );
    });
    Alert.alert('Reorder Cart Ready', `${order.items.length} items added to your cart.`, [
      { text: 'Go to Cart', onPress: () => router.push('/(tabs)/cart') },
      { text: 'OK', style: 'cancel' },
    ]);
  };

  const handleSupportWhatsApp = () => {
    if (!order) return;
    const msg = encodeURIComponent(
      `Hello Speqtus Medical, I have a question regarding order #${order.orderNumber}.`
    );
    Linking.openURL(`https://wa.me/919876543210?text=${msg}`);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{strings.common.loading}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Order not found</Text>
        <Button
          title="Back to Orders"
          onPress={() => router.replace('/(tabs)/orders')}
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.dateText}>
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <StatusBadge status={order.status} type="order" />
        </View>

        {order.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Order Instructions:</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </View>

      {/* Status Timeline */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fulfillment Timeline</Text>
        {order.timeline.length > 0 ? (
          <View style={styles.timelineContainer}>
            {order.timeline.map((event, index) => {
              const isLast = index === order.timeline.length - 1;
              return (
                <View key={event.id} style={styles.timelineRow}>
                  <View style={styles.timelineDotCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        isLast ? styles.timelineDotActive : styles.timelineDotInactive,
                      ]}
                    />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineEventHeader}>
                      <Text style={styles.timelineStatus}>{event.status.toUpperCase()}</Text>
                      <Text style={styles.timelineTime}>
                        {new Date(event.changedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.timelineDate}>
                      {new Date(event.changedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    {event.note && (
                      <Text style={styles.timelineNote}>{event.note}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyTimelineText}>Status: {order.status}</Text>
        )}
      </View>

      {/* Delivery Address */}
      {order.address && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Destination</Text>
          <Text style={styles.addressLabel}>{order.address.label}</Text>
          <Text style={styles.addressLine}>{order.address.line1}</Text>
          {order.address.line2 ? <Text style={styles.addressLine}>{order.address.line2}</Text> : null}
          <Text style={styles.addressLine}>
            {order.address.city}, {order.address.state} - {order.address.pincode}
          </Text>
        </View>
      )}

      {/* Ordered Line Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ordered Instruments ({order.items.length})</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Image
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/60' }}
              style={styles.itemImage}
            />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName}
              </Text>
              <Text style={styles.itemMeta}>
                Art No: <Text style={styles.artNoBold}>{item.artNo}</Text> ({item.sizeLabel})
              </Text>
              <Text style={styles.itemQty}>Quantity: {item.quantity}</Text>
            </View>
            <View style={styles.itemPriceCol}>
              {item.unitPrice !== null ? (
                <>
                  <Text style={styles.itemTotalPrice}>
                    ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.itemUnitPrice}>₹{item.unitPrice}/unit</Text>
                </>
              ) : (
                <Text style={styles.itemUnpriced}>Quote Pending</Text>
              )}
            </View>
          </View>
        ))}

        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Order Subtotal:</Text>
          <Text style={styles.subtotalValue}>
            {order.subtotal !== null
              ? `₹${order.subtotal.toLocaleString('en-IN')}`
              : 'Price to be confirmed'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionButtons}>
        <Button
          title={strings.orders.reorder}
          onPress={handleReorder}
          variant="secondary"
          style={styles.actionBtn}
        />
        <Button
          title="Ask Question on WhatsApp"
          onPress={handleSupportWhatsApp}
          variant="outline"
          style={styles.actionBtn}
        />
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
    paddingBottom: spacing.xxxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  notFoundText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  dateText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  notesLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  notesText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textPrimary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  timelineContainer: {
    paddingLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineDotCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: colors.accent,
  },
  timelineDotInactive: {
    backgroundColor: colors.borderStrong,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.lg,
  },
  timelineEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStatus: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  timelineTime: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  timelineDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  timelineNote: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyTimelineText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  addressLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  addressLine: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  itemMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  artNoBold: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  itemQty: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemPriceCol: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  itemTotalPrice: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  itemUnitPrice: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  itemUnpriced: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  subtotalValue: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  actionButtons: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
});
