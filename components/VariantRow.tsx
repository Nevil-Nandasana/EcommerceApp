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
} from 'react-native';
import { ProductVariant } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface VariantRowProps {
  variant: ProductVariant;
  isApproved: boolean;
  isGuest: boolean;
  onAddToCart: (variant: ProductVariant, quantity: number) => void;
  onLoginPrompt?: () => void;
}

export const VariantRow: React.FC<VariantRowProps> = ({
  variant,
  isApproved,
  isGuest,
  onAddToCart,
  onLoginPrompt,
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
    <View style={styles.container}>
      <View style={styles.detailsCol}>
        <Text style={styles.sizeText}>{variant.sizeLabel}</Text>
        <TouchableOpacity
          onLongPress={handleCopyArtNo}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={`Article number ${variant.artNo}. Long press to copy.`}
        >
          <Text style={styles.artNoText}>
            {strings.catalog.artNoPrefix}
            <Text style={styles.artNoHighlight}>{variant.artNo}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.priceCol}>{renderPriceCell()}</View>

      <View style={styles.actionCol}>
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            onPress={decrement}
            style={styles.stepperBtn}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
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
          />
          <TouchableOpacity
            onPress={increment}
            style={styles.stepperBtn}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => onAddToCart(variant, quantity)}
          style={styles.addBtn}
          accessibilityRole="button"
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
    width: 32,
    height: 32,
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
    height: 32,
    textAlign: 'center',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    padding: 0,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.base,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  addBtnText: {
    color: colors.textOnPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
});
