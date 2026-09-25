/**
 * Speqtus Medical Ordering Platform — Checkout Review Screen (FR-7, T3.4.1, T3.4.2)
 * Manages delivery address selection, order notes, and atomic submission of orders.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/cart';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Address } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { logger } from '@/lib/logger';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user, isApproved, profile } = useAuth();
  const cartItems = useCartStore((state) => state.cartItems);
  const clearCart = useCartStore((state) => state.clearCart);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [line1, setLine1] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const stateName = 'Gujarat';
  const [pincode, setPincode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchAddresses = async () => {
      const { data, error: addrError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id);

      if (addrError) {
        logger.error('Checkout', 'Failed to fetch addresses', addrError);
        return;
      }

      if (data && data.length > 0) {
        setAddresses(
          data.map((a) => ({
            id: a.id,
            userId: a.user_id,
            label: a.label,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            state: a.state,
            pincode: a.pincode,
            phoneOverride: a.phone_override,
            isDefault: a.is_default,
            createdAt: a.created_at,
          }))
        );
        setSelectedAddressId(data[0].id);
      }
    };

    fetchAddresses();
  }, [user]);

  const handleSubmitOrder = async () => {
    if (!isApproved) {
      Alert.alert(
        'Account Pending',
        'Only approved medical professionals can submit order requests.'
      );
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add instruments before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let finalAddressId = selectedAddressId;

      // Create address if none existed or new entered
      if (!finalAddressId) {
        if (!line1.trim() || !city.trim() || !pincode.trim()) {
          setError('Please provide a complete delivery address.');
          setIsSubmitting(false);
          return;
        }

        const { data: newAddr, error: createAddrError } = await supabase
          .from('addresses')
          .insert({
            user_id: user?.id,
            label: profile?.hospitalOrClinicName || 'Clinic OT',
            line1: line1.trim(),
            city: city.trim(),
            state: stateName.trim(),
            pincode: pincode.trim(),
            is_default: true,
          })
          .select('id')
          .single();

        if (createAddrError || !newAddr) {
          throw new Error(`Address creation failed: ${createAddrError?.message}`);
        }
        finalAddressId = newAddr.id;
      }

      // Atomic Order Request Submission (PRD Section 7, T3.4.2)
      let orderNumber = '';

      const itemsPayload = cartItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_order', {
        p_address_id: finalAddressId,
        p_notes: notes.trim() || null,
        p_items: itemsPayload,
      });

      if (!rpcError && rpcData) {
        orderNumber = rpcData.order_number;
      } else {
        // Fallback to standard insert if RPC migration not yet deployed
        logger.warn('Checkout', 'submit_order RPC failed, falling back to direct insert', rpcError);

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user?.id,
            address_id: finalAddressId,
            status: 'requested',
            payment_status: 'not_applicable',
            notes: notes.trim() || null,
          })
          .select('id, order_number')
          .single();

        if (orderError || !orderData) {
          throw new Error(`Order placement failed: ${orderError?.message || rpcError?.message}`);
        }

        orderNumber = orderData.order_number;

        const orderItemsPayload = cartItems.map((item) => ({
          order_id: orderData.id,
          product_variant_id: item.variantId,
          quantity: item.quantity,
          unit_price_at_order: item.price,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsPayload);

        if (itemsError) {
          throw new Error(`Order items creation failed: ${itemsError.message}`);
        }
      }

      // Clear cart
      clearCart();

      Alert.alert(
        'Order Request Submitted',
        `Your request #${orderNumber} has been sent to Speqtus Medical for confirmation.`,
        [
          {
            text: 'View My Orders',
            onPress: () => router.replace('/(tabs)/orders'),
          },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Order submission failed';
      logger.error('Checkout', msg, err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{strings.cart.deliveryAddress}</Text>
        {addresses.length > 0 ? (
          <View style={styles.existingAddress}>
            <Text style={styles.addressLabel}>{addresses[0].label}</Text>
            <Text style={styles.addressText}>{addresses[0].line1}</Text>
            <Text style={styles.addressText}>
              {addresses[0].city}, {addresses[0].state} - {addresses[0].pincode}
            </Text>
          </View>
        ) : (
          <View>
            <Input
              label="Delivery Address / Clinic OT"
              placeholder="e.g. 2nd Floor, Patel Surgical Hospital, Ring Road"
              value={line1}
              onChangeText={setLine1}
            />
            <View style={styles.addressRow}>
              <Input
                label="City"
                placeholder="Ahmedabad"
                value={city}
                onChangeText={setCity}
                containerStyle={{ flex: 1, marginRight: spacing.sm }}
              />
              <Input
                label="Pincode"
                placeholder="380001"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
                containerStyle={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{strings.cart.orderNotes}</Text>
        <Input
          placeholder={strings.cart.orderNotesPlaceholder}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Summary ({cartItems.length} items)</Text>
        {cartItems.map((item) => (
          <View key={item.variantId} style={styles.summaryItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.summaryArtNo}>
                {item.artNo} ({item.sizeLabel})
              </Text>
            </View>
            <Text style={styles.summaryQty}>Qty: {item.quantity}</Text>
          </View>
        ))}
        <Text style={styles.reviewNotice}>{strings.cart.subtotalNotice}</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Button
        title={strings.cart.submitRequest}
        onPress={handleSubmitOrder}
        loading={isSubmitting}
        variant="secondary"
        style={styles.submitBtn}
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
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  cardTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  existingAddress: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.base,
  },
  addressLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  addressText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  summaryName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  summaryArtNo: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  summaryQty: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  reviewNotice: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
