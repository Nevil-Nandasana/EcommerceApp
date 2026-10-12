/**
 * Speqtus Medical Ordering Platform — Accessible Status Badge
 * Governed by PRD Section 7 Accessibility.
 */

import { View, Text, StyleSheet, AccessibilityRole } from 'react-native';
import { OrderStatus, ApprovalStatus } from '@/types';
import { colors } from '@/constants/colors';
import { typography, borderRadius, spacing } from '@/constants/theme';
import { strings } from '@/constants/strings';

export interface StatusBadgeProps {
  status: OrderStatus | ApprovalStatus;
  type?: 'order' | 'approval';
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHint?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'order',
  accessibilityLabel,
  accessibilityRole = 'text',
  accessibilityHint,
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'confirmed':
      case 'approved':
      case 'delivered':
        return {
          bg: colors.successLight,
          text: colors.success,
          border: colors.success,
        };
      case 'requested':
      case 'pending':
        return {
          bg: colors.warningLight,
          text: colors.warning,
          border: colors.warning,
        };
      case 'cancelled':
      case 'rejected':
        return {
          bg: colors.errorLight,
          text: colors.error,
          border: colors.error,
        };
      case 'dispatched':
      default:
        return {
          bg: colors.infoLight,
          text: colors.info,
          border: colors.info,
        };
    }
  };

  const getLabel = () => {
    if (type === 'order') {
      const orderKey = status as OrderStatus;
      return strings.orders.status[orderKey] || status;
    }
    return status.toUpperCase();
  };

  const config = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || `Status: ${getLabel()}`}
      accessibilityHint={accessibilityHint}
    >
      <Text style={[styles.text, { color: config.text }]}>{getLabel()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
});
