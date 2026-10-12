/**
 * Speqtus Medical Ordering Platform — Cart Screen (FR-6, T3.3.3)
 * Displays selected instrument variants grouped by category, steppers, and review CTA.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { CartItem } from '@/types';
import { calculateGstBreakdown } from '@/lib/tax';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { strings } from '@/constants/strings';

export default function CartScreen() {
  const router = useRouter();
  const { isPending, isApproved } = useAuth();
  const cartItems = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const estimatedSubtotal = useCartStore((state) => state.getEstimatedSubtotal());

  // Group cart items by category (FR-6 Acceptance Criteria)
  const groupedSections = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of cartItems) {
      const cat = item.categoryName || 'General Surgery Instruments';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [cartItems]);

  const handleCheckout = () => {
    if (!isApproved) {
      if (isPending) {
        alert(strings.auth.pendingApprovalBanner);
      } else {
        router.push('/(auth)/login');
      }
      return;
    }
    router.push('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>{strings.cart.emptyCartTitle}</Text>
        <Text style={styles.emptySubtitle}>{strings.cart.emptyCartSubtitle}</Text>
        <Button
          title={strings.cart.browseCatalog}
          onPress={() => router.push('/(tabs)')}
          style={styles.emptyBtn}
        />
      </View>
    );
  }

  const { user } = useAuth();
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [setName, setSetName] = useState('');

  const handleSaveSet = async (name?: string) => {
    if (!name || !name.trim()) {
      Alert.alert('Error', 'Please enter a name for the OT Set.');
      return;
    }
    setIsSavingSet(true);
    try {
      // 1. Insert saved_set
      const { data: setRecord, error: setError } = await supabase
        .from('saved_sets')
        .insert({
          user_id: user?.id,
          name: name.trim(),
        })
        .select('id')
        .single();
      
      if (setError || !setRecord) throw setError;

      // 2. Insert items
      const itemsPayload = cartItems.map(item => ({
        saved_set_id: setRecord.id,
        product_variant_id: item.variantId,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('saved_set_items')
        .insert(itemsPayload);
      
      if (itemsError) throw itemsError;

      Alert.alert('Success', 'OT Set saved! View your sets in Profile.');
      setShowSaveModal(false);
      setSetName('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save OT set');
    } finally {
      setIsSavingSet(false);
    }
  };

  const promptSaveSet = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Save as OT Set',
        'Enter a name for this set:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: handleSaveSet }
        ],
        'plain-text'
      );
    } else {
      setShowSaveModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={groupedSections}
        keyExtractor={(item) => item.variantId}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionCount}>
              {data.length} {data.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
              style={styles.thumbnail}
            />
            <View style={styles.cardDetails}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.artNoText}>
                {strings.catalog.artNoPrefix}
                <Text style={styles.artNoBold}>{item.artNo}</Text> ({item.sizeLabel})
              </Text>
              {item.price !== null ? (
                <Text style={styles.priceText}>
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')} (₹{item.price}/unit)
                </Text>
              ) : (
                <Text style={styles.unpricedText}>Price upon review</Text>
              )}
            </View>

            <View style={styles.cardActions}>
              <View style={styles.stepper}>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.variantId, -1)}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease quantity for ${item.productName}`}
                  accessibilityHint="Decreases quantity by 1"
                >
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={String(item.quantity)}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    if (!clean) {
                      setQuantity(item.variantId, 1);
                    } else {
                      const parsed = parseInt(clean, 10);
                      setQuantity(item.variantId, Math.max(1, Math.min(parsed, 999)));
                    }
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  maxLength={3}
                  accessibilityLabel={`Quantity ${item.quantity}. Tap to edit directly.`}
                  accessibilityHint="Allows direct numeric quantity entry"
                />
                <TouchableOpacity
                  onPress={() => updateQuantity(item.variantId, 1)}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase quantity for ${item.productName}`}
                  accessibilityHint="Increases quantity by 1"
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => removeItem(item.variantId)}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.productName} from cart`}
                accessibilityHint="Removes this instrument variant from your cart"
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footerSection}>
            <TouchableOpacity onPress={clearCart} style={styles.clearCartLink}>
              <Text style={styles.clearCartText}>Clear All Items</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.bottomBar}>
        {calculateGstBreakdown(estimatedSubtotal) ? (() => {
          const gst = calculateGstBreakdown(estimatedSubtotal)!;
          return (
            <View style={styles.taxSummaryContainer}>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>Taxable Subtotal:</Text>
                <Text style={styles.taxValue}>₹{gst.taxableSubtotal.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>Estimated GST (12% • HSN {gst.hsnCode}):</Text>
                <Text style={styles.taxValue}>₹{gst.gstAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowBorder]}>
                <Text style={styles.totalLabel}>Estimated Total (incl. GST):</Text>
                <Text style={styles.totalValue}>₹{gst.estimatedTotal.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          );
        })() : (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total:</Text>
            <Text style={styles.totalValue}>
              {estimatedSubtotal !== null
                ? `₹${estimatedSubtotal.toLocaleString('en-IN')}`
                : 'Quote on Request'}
            </Text>
          </View>
        )}
        <Text style={styles.noticeText}>
          {estimatedSubtotal !== null
            ? 'Informational GST estimate for HSN 9018. Final tax invoice issued upon dispatch.'
            : strings.cart.subtotalNotice}
        </Text>
        
        {isApproved && cartItems.length > 0 && (
          <Button
            title="Save as OT Set 💾"
            onPress={promptSaveSet}
            variant="outline"
            style={{ marginBottom: spacing.sm }}
            loading={isSavingSet}
          />
        )}

        <Button
          title={isApproved ? strings.cart.reviewOrder : 'Login / Verification Required'}
          onPress={handleCheckout}
          variant={isApproved ? 'secondary' : 'primary'}
        />
      </View>

      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save as OT Set</Text>
            <Text style={styles.modalSub}>Enter a name for this set:</Text>
            <TextInput
              style={styles.modalInput}
              value={setName}
              onChangeText={setSetName}
              placeholder="e.g. Minor OT Set"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowSaveModal(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSaveSet(setName)} style={[styles.modalBtn, styles.modalBtnPrimary]}>
                <Text style={styles.modalBtnTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    minWidth: 200,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: 140,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 64,
    height: 64,
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
    marginTop: 2,
  },
  artNoText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  artNoBold: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  priceText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
    marginTop: 4,
  },
  unpricedText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.base,
  },
  stepperBtn: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  stepperQty: {
    width: 24,
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  stepperInput: {
    width: 36,
    height: layout.minTouchTarget,
    textAlign: 'center',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    padding: 0,
  },
  removeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.error,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  clearCartLink: {
    padding: spacing.sm,
  },
  clearCartText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    textDecorationLine: 'underline',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  taxSummaryContainer: {
    marginBottom: spacing.xs,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  taxLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  taxValue: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  totalRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  totalLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  noticeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    width: '80%',
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.sm,
  },
  modalSub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  modalBtnText: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semibold,
  },
  modalBtnTextPrimary: {
    color: colors.surface,
    fontWeight: typography.fontWeights.semibold,
  },
});
