/**
 * Speqtus Medical Ordering Platform — Variant Row Component (FR-2, T3.2.4)
 * Governed by PRD FR-2, FR-5, and VARIABLE_REGISTRY.md.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  AccessibilityRole,
} from 'react-native';
import { ProductVariant } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { strings } from '@/constants/strings';

export interface VariantRowProps {
  variant: ProductVariant;
  isApproved: boolean;
  isGuest: boolean;
  onAddToCart: (variant: ProductVariant, quantity: number) => void;
  onLoginPrompt?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHint?: string;
}

export const VariantRow: React.FC<VariantRowProps> = ({
  variant,
  isApproved,
  isGuest,
  onAddToCart,
  onLoginPrompt,
  accessibilityLabel,
  accessibilityRole,
  accessibilityHint,
}) => {
  const [quantity, setQuantity] = useState<number>(1);

  const handleCopyArtNo = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(variant.artNo);
      alert(`${strings.common.copied}: ${variant.artNo}`);
    } else {
      Alert.alert(strings.common.copy, `${strings.common.copied}: ${variant.artNo}`);
    }
  };

  const increment = () => setQuantity((prev) => prev + 1);
  const decrement = () => setQuantity((prev) => Math.max(1, prev - 1));

  const renderPriceCell = () => {
    if (isApproved && variant.price !== null) {
      return (
        <Text style={styles.priceText}>
          ₹{variant.price.toLocaleString('en-IN')}
        </Text>
      );
    }

    if (isGuest && onLoginPrompt) {
      return (
        <TouchableOpacity
          onPress={onLoginPrompt}
          style={styles.priceLink}
          accessibilityRole="button"
        >
          <Text style={styles.priceLinkText}>{strings.catalog.loginToSeePrice}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text style={styles.pendingPriceText}>
        {strings.catalog.pendingApprovalPrice}
      </Text>
    );
  };

  return (
    <View
      style={styles.container}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || `${variant.artNo}, ${variant.sizeLabel}`}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.detailsCol}>
        <Text style={styles.sizeText}>{variant.sizeLabel}</Text>
        <TouchableOpacity
          onLongPress={handleCopyArtNo}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={`Article number ${variant.artNo}. Long press to copy.`}
          accessibilityHint="Copies article number to clipboard"
        >
          <Text style={styles.artNoText}>
            {strings.catalog.artNoPrefix}
            <Text style={styles.artNoHighlight}>{variant.artNo}</Text>
          </Text>
        </TouchableOpacity>
        {variant.stockQuantity !== undefined && variant.stockQuantity !== null && (
          <View style={styles.stockBadgeContainer}>
            {variant.isInStock === false || variant.stockQuantity === 0 ? (
              <Text style={styles.stockMuted}>Made to Order (2-3 wks)</Text>
            ) : variant.stockQuantity <= (variant.lowStockThreshold || 5) ? (
              <Text style={styles.stockLow}>Low Stock: Only {variant.stockQuantity} left</Text>
            ) : (
              <Text style={styles.stockIn}>In Stock</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.priceCol}>{renderPriceCell()}</View>

      <View style={styles.actionCol}>
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            onPress={decrement}
            style={styles.stepperBtn}
            accessibilityRole="button"
            accessibilityLabel={`Decrease quantity for ${variant.artNo}`}
            accessibilityHint="Decreases order quantity by 1"
          >
            <Text style={styles.stepperBtnText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.quantityInput}
            value={String(quantity)}
            onChangeText={(val) => {
              const clean = val.replace(/[^0-9]/g, '');
              if (!clean) {
                setQuantity(1);
              } else {
                const parsed = parseInt(clean, 10);
                setQuantity(Math.max(1, Math.min(parsed, 999)));
              }
            }}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={3}
            accessibilityLabel={`Quantity ${quantity}. Tap to edit directly.`}
            accessibilityHint="Allows manual numeric quantity entry"
          />
          <TouchableOpacity
            onPress={increment}
            style={styles.stepperBtn}
            accessibilityRole="button"
            accessibilityLabel={`Increase quantity for ${variant.artNo}`}
            accessibilityHint="Increases order quantity by 1"
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => onAddToCart(variant, quantity)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel={`Add ${variant.artNo} to cart`}
          accessibilityHint="Adds specified quantity to your order request cart"
        >
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: layout.minTouchTarget + spacing.md,
  },
  detailsCol: {
    flex: 2,
  },
  sizeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  artNoText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  artNoHighlight: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  priceCol: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  priceLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  priceLinkText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
    textDecorationLine: 'underline',
  },
  pendingPriceText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actionCol: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.base,
    backgroundColor: colors.surface,
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
  quantityText: {
    width: 28,
    textAlign: 'center',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  quantityInput: {
    width: 36,
    height: layout.minTouchTarget,
    textAlign: 'center',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    padding: 0,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.base,
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  stockBadgeContainer: {
    marginTop: 3,
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

