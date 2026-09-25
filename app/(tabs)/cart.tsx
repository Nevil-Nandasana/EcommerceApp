/**
 * Speqtus Medical Ordering Platform — Cart Screen (FR-6, T3.3.3)
 * Displays selected instrument variants grouped by category, steppers, and review CTA.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { CartItem } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';

export default function CartScreen() {
  const router = useRouter();
  const { isPending, isApproved } = useAuth();
  const cartItems = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
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
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperQty}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.variantId, 1)}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => removeItem(item.variantId)}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel="Remove item from cart"
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
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Estimated Total:</Text>
          <Text style={styles.totalValue}>
            {estimatedSubtotal !== null
              ? `₹${estimatedSubtotal.toLocaleString('en-IN')}`
              : 'Quote on Request'}
          </Text>
        </View>
        <Text style={styles.noticeText}>{strings.cart.subtotalNotice}</Text>
        <Button
          title={isApproved ? strings.cart.reviewOrder : 'Login / Verification Required'}
          onPress={handleCheckout}
          variant={isApproved ? 'secondary' : 'primary'}
        />
      </View>
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
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: typography.fontSizes.sm,
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
  removeBtn: {
    paddingVertical: spacing.xs,
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
});
