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
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { ReorderWarningModal } from '@/components/ReorderWarningModal';
import { OrderStatus, CartItem } from '@/types';
import { APP_CONFIG } from '@/constants/config';
import { checkReorderPriceChanges, ReorderItemDiff } from '@/lib/reorderCheck';
import { shareOrder } from '@/lib/share';
import { calculateGstBreakdown } from '@/lib/tax';
import { initiateRazorpayPayment } from '@/lib/payments';
import { viewOrDownloadInvoice } from '@/lib/invoiceGenerator';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
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
  paymentStatus: string;
  paymentMethod?: string | null;
  departmentName?: string | null;
  onBehalfOfDoctor?: string | null;
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
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  invoiceUrl?: string | null;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id: orderId } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const addItemToCart = useCartStore((state) => state.addItem);

  const [order, setOrder] = useState<FullOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cancellation State
  const [isCancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOtherText, setCancelOtherText] = useState('');

  // Reorder Price Transparency State (Feature 3)
  const [isCheckingReorder, setIsCheckingReorder] = useState(false);
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [reorderDiffs, setReorderDiffs] = useState<ReorderItemDiff[]>([]);
  const [reorderItemsToAdd, setReorderItemsToAdd] = useState<
    Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }>
  >([]);
  const [isPaying, setIsPaying] = useState(false);

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
          payment_status,
          payment_method,
          department_name,
          on_behalf_of_doctor,
          notes,
          created_at,
          courier_name,
          tracking_number,
          tracking_url,
          invoice_url,
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
        paymentStatus: (ordData as any).payment_status || 'not_applicable',
        paymentMethod: (ordData as any).payment_method || null,
        departmentName: (ordData as any).department_name || null,
        onBehalfOfDoctor: (ordData as any).on_behalf_of_doctor || null,
        notes: ordData.notes,
        createdAt: ordData.created_at,
        address: addr || null,
        items: mappedItems,
        timeline: mappedTimeline,
        courierName: ordData.courier_name,
        trackingNumber: ordData.tracking_number,
        trackingUrl: ordData.tracking_url,
        invoiceUrl: ordData.invoice_url,
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

  const handleCancelOrder = async () => {
    if (!orderId || !cancelReason) {
      Alert.alert('Select Reason', 'Please select a reason for cancellation.');
      return;
    }
    const finalReason = cancelReason === 'Other' ? cancelOtherText : cancelReason;

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (updateError) {
        logger.error('OrderDetail', 'Failed to cancel order', updateError);
        Alert.alert('Error', 'Could not cancel order.');
        return;
      }

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'cancelled',
          changed_by: user?.id,
          note: `Cancelled by doctor: ${finalReason}`,
        });

      if (historyError) {
        logger.error('OrderDetail', 'Failed to insert history', historyError);
      }

      setCancelModalVisible(false);
      fetchOrderDetails();
      Alert.alert('Cancelled', 'Your order request has been cancelled.');
    } catch (err) {
      logger.error('OrderDetail', 'Cancel error', err);
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    if (!order.items || order.items.length === 0) {
      Alert.alert('Empty Order', 'This order contains no items to reorder.');
      return;
    }
    setIsCheckingReorder(true);
    try {
      const sourceItems = order.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        artNo: item.artNo,
        sizeLabel: item.sizeLabel,
        price: item.unitPrice,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
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
        Alert.alert(
          'Reorder Cart Ready',
          `${result.itemsReadyForCart.length} items added to your cart with verified pricing.`,
          [
            { text: 'Go to Cart', onPress: () => router.push('/(tabs)/cart') },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (err) {
      logger.error('OrderDetail', 'Reorder check error', err);
      // Fallback: direct addition
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
      router.push('/(tabs)/cart');
    } finally {
      setIsCheckingReorder(false);
    }
  };

  const confirmReorderModal = () => {
    if (reorderItemsToAdd.length === 0) {
      setReorderModalVisible(false);
      Alert.alert('Unavailable', 'No available items to add to cart from this order.');
      return;
    }
    reorderItemsToAdd.forEach(({ item, quantity }) => {
      addItemToCart(item, quantity);
    });
    setReorderModalVisible(false);
    router.push('/(tabs)/cart');
  };

  const handleSupportWhatsApp = () => {
    if (!order) return;
    const waPhone = APP_CONFIG.whatsappPhone || APP_CONFIG.supportPhone;
    if (!waPhone) {
      Alert.alert(
        'Customer Support',
        'WhatsApp support number is not configured in this environment.'
      );
      return;
    }
    let cleanWa = waPhone.replace(/[^0-9]/g, '');
    if (cleanWa.length === 10) {
      cleanWa = `91${cleanWa}`;
    } else if (cleanWa.length === 11 && cleanWa.startsWith('0')) {
      cleanWa = `91${cleanWa.slice(1)}`;
    }
    if (!cleanWa) {
      Alert.alert('Customer Support', 'Invalid WhatsApp support phone configuration.');
      return;
    }
    const itemsSummary = order.items
      .slice(0, 3)
      .map((i) => `• ${i.quantity}x ${i.productName} (${i.artNo})`)
      .join('\n');
    const extraCount = order.items.length > 3 ? `\n• +${order.items.length - 3} more items` : '';
    const subtotalStr =
      order.subtotal !== null
        ? `₹${order.subtotal.toLocaleString('en-IN')}`
        : 'Quote Pending';

    const msg = [
      `Hello Speqtus Medical,`,
      `I have an inquiry regarding Order *#${order.orderNumber}*.`,
      ``,
      `*Status:* ${order.status.toUpperCase()}`,
      `*Subtotal:* ${subtotalStr}`,
      `*Items Summary:*`,
      `${itemsSummary}${extraCount}`,
      ``,
      `Please assist me with this order. Thank you!`,
    ].join('\n');

    const url = `https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch((err) => {
      logger.error('OrderDetail', 'Failed to open WhatsApp URL', err);
      Alert.alert('Cannot Open WhatsApp', 'Please ensure WhatsApp is installed on your device.');
    });
  };

  const handleShareOrder = async () => {
    if (!order) return;
    try {
      await shareOrder(order, APP_CONFIG.webBaseUrl);
    } catch (err) {
      logger.error('OrderDetail', 'Failed to share order', err);
    }
  };

  const handleOnlinePayment = async () => {
    if (!order) return;
    setIsPaying(true);
    await initiateRazorpayPayment(
      order.id,
      (paymentId) => {
        setIsPaying(false);
        Alert.alert(
          'Payment Successful! 🎉',
          `Payment Reference: ${paymentId}\nThank you! Your payment has been received and verified. Speqtus team will dispatch your surgical order promptly.`
        );
        fetchOrderDetails();
      },
      (err) => {
        setIsPaying(false);
        Alert.alert('Payment Notice', err);
      }
    );
  };

  const handleViewGstInvoice = async () => {
    if (!order || !user) return;
    const invoiceDoctor = {
      fullName: profile?.fullName || user.user_metadata?.full_name || 'Practitioner',
      hospitalName: profile?.hospitalOrClinicName || 'Medical Clinic',
      phone: profile?.phone || user.phone || '9876543210',
      medicalRegNo: profile?.medicalRegistrationNumber || null,
      address: order.address,
    };
    const invoiceItems = order.items.map((it) => ({
      artNo: it.artNo,
      productName: it.productName,
      sizeLabel: it.sizeLabel,
      quantity: it.quantity,
      unitPrice: it.unitPrice || 0,
    }));
    await viewOrDownloadInvoice(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        subtotal: order.subtotal || 0,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
      invoiceDoctor,
      invoiceItems
    );
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

        {(order.departmentName || order.onBehalfOfDoctor) && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Hospital Department & Doctor:</Text>
            {order.departmentName && (
              <Text style={styles.notesText}>Department: {order.departmentName}</Text>
            )}
            {order.onBehalfOfDoctor && (
              <Text style={styles.notesText}>On Behalf Of: {order.onBehalfOfDoctor}</Text>
            )}
          </View>
        )}
      </View>

      {/* Courier Tracking Info */}
      {order.courierName && order.trackingNumber && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Tracking</Text>
          <View style={styles.trackingBox}>
            <Text style={styles.trackingLabel}>Courier:</Text>
            <Text style={styles.trackingValue}>{order.courierName}</Text>
          </View>
          <View style={styles.trackingBox}>
            <Text style={styles.trackingLabel}>Tracking / AWB Number:</Text>
            <Text selectable style={styles.trackingValueBold}>{order.trackingNumber}</Text>
          </View>
          <Button
            title="Track Order"
            onPress={() => {
              if (order.trackingUrl) {
                Linking.openURL(order.trackingUrl);
              } else {
                const query = encodeURIComponent(`${order.courierName} tracking ${order.trackingNumber}`);
                Linking.openURL(`https://www.google.com/search?q=${query}`);
              }
            }}
            variant="outline"
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      {/* Online Payment Card (T5.P.6) */}
      {(order.status === 'confirmed' || order.status === 'dispatched' || order.status === 'delivered') && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <StatusBadge
              status={order.paymentStatus === 'paid' ? 'delivered' : 'requested'}
            />
          </View>
          <Text style={styles.invoiceNotice}>
            {order.paymentStatus === 'paid'
              ? `Payment confirmed via ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'RAZORPAY'}.`
              : 'Your surgical order has been confirmed by Speqtus. You can complete payment online via UPI, Cards, or NetBanking.'}
          </Text>
          {order.paymentStatus !== 'paid' && order.subtotal !== null && order.subtotal > 0 && (
            <Button
              title={isPaying ? 'Connecting Payment Gateway...' : 'Pay with Razorpay / UPI 💳'}
              onPress={handleOnlinePayment}
              disabled={isPaying}
              variant="primary"
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>
      )}

      {/* Tax Invoice Download (T5.F.10 & Automated GST Invoice Generator) */}
      {(order.status === 'confirmed' || order.status === 'dispatched' || order.status === 'delivered') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>GST Tax Invoice (HSN 9018)</Text>
          <Text style={styles.invoiceNotice}>
            Official B2B Tax Invoice with 12% GST calculation, Speqtus manufacturer certification, and itemized HSN codes.
          </Text>
          <Button
            title="View / Download GST Invoice (PDF) 📄"
            onPress={handleViewGstInvoice}
            variant="secondary"
            style={{ marginTop: spacing.md }}
          />
          {order.invoiceUrl && (
            <Button
              title="Download Attached Physical Invoice"
              onPress={() => Linking.openURL(order.invoiceUrl!)}
              variant="outline"
              style={{ marginTop: spacing.sm }}
            />
          )}
        </View>
      )}

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

        {calculateGstBreakdown(order.subtotal) ? (() => {
          const gst = calculateGstBreakdown(order.subtotal)!;
          return (
            <View style={styles.taxSummaryContainer}>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Taxable Subtotal:</Text>
                <Text style={styles.subtotalValue}>
                  ₹{gst.taxableSubtotal.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>
                  Estimated GST (12% • HSN {gst.hsnCode}):
                </Text>
                <Text style={styles.taxValue}>
                  ₹{gst.gstAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.subtotalRow, styles.totalRowBorder]}>
                <Text style={styles.estimatedTotalLabel}>Estimated Total (incl. GST):</Text>
                <Text style={styles.estimatedTotalValue}>
                  ₹{gst.estimatedTotal.toLocaleString('en-IN')}
                </Text>
              </View>
              <Text style={styles.taxNotice}>
                Informational 12% GST estimate. Official tax invoice is issued upon dispatch.
              </Text>
            </View>
          );
        })() : (
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Order Subtotal:</Text>
            <Text style={styles.subtotalValue}>
              {order.subtotal !== null
                ? `₹${order.subtotal.toLocaleString('en-IN')}`
                : 'Price to be confirmed'}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionButtons}>
        {order.status === 'requested' && (
          <Button
            title="Cancel Order Request"
            onPress={() => setCancelModalVisible(true)}
            variant="danger"
            style={styles.actionBtn}
          />
        )}
        <Button
          title={strings.orders.reorder}
          onPress={handleReorder}
          variant="secondary"
          style={styles.actionBtn}
          loading={isCheckingReorder}
        />
        <Button
          title="Share Order Summary 📤"
          onPress={handleShareOrder}
          variant="outline"
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Share Order ${order.orderNumber}`}
          accessibilityHint="Shares order status, items summary, and tracking link via native share sheet"
        />
        <Button
          title="Inquire on WhatsApp 💬"
          onPress={handleSupportWhatsApp}
          variant="outline"
          style={styles.actionBtn}
        />
      </View>

      {/* Cancel Order Modal */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>Please select a reason for cancellation:</Text>
            
            <ScrollView style={styles.modalOptions}>
              {[
                'Procedure rescheduled / postponed',
                'Ordered incorrect instrument / size',
                'Duplicate order placed',
                'Purchased from alternative source',
                'Other',
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.radioBtn,
                    cancelReason === reason && styles.radioBtnSelected,
                  ]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Text style={[styles.radioText, cancelReason === reason && styles.radioTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              {cancelReason === 'Other' && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Please specify..."
                  value={cancelOtherText}
                  onChangeText={setCancelOtherText}
                />
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Keep Order"
                onPress={() => setCancelModalVisible(false)}
                variant="outline"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Confirm Cancel"
                onPress={handleCancelOrder}
                variant="danger"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reorder Price Transparency Warning Modal (Feature 3) */}
      <ReorderWarningModal
        visible={reorderModalVisible}
        orderNumber={order?.orderNumber}
        diffs={reorderDiffs}
        onCancel={() => setReorderModalVisible(false)}
        onConfirm={confirmReorderModal}
      />
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
  invoiceNotice: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
    marginTop: spacing.sm,
  },
  subtotalLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  subtotalValue: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  taxSummaryContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  taxLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  taxValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  totalRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  estimatedTotalLabel: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  estimatedTotalValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  taxNotice: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  actionButtons: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionBtn: {
    width: '100%',
    minHeight: layout.minTouchTarget,
  },
  trackingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  trackingLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  trackingValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
  },
  trackingValueBold: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalOptions: {
    marginBottom: spacing.md,
  },
  radioBtn: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  radioBtnSelected: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  radioText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
  },
  radioTextSelected: {
    fontWeight: typography.fontWeights.bold,
    color: colors.error,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
});
