/**
 * Speqtus Medical Ordering Platform — Persistent Pending Banner (T3.1.6)
 * Governed by PRD FR-4, FR-5, and Section 2.1
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface PendingBannerProps {
  onPressDetails?: () => void;
}

export const PendingBanner: React.FC<PendingBannerProps> = ({ onPressDetails }) => {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.textContainer}>
        <Text style={styles.title}>{strings.auth.pendingNoticeTitle}</Text>
        <Text style={styles.body}>{strings.auth.pendingApprovalBanner}</Text>
      </View>
      {onPressDetails && (
        <TouchableOpacity
          onPress={onPressDetails}
          style={styles.actionButton}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{strings.common.back}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.pendingBannerBg,
    borderColor: colors.pendingBannerBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    flexDirection: 'column',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.pendingBannerText,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: typography.fontSizes.xs,
    color: colors.pendingBannerText,
    lineHeight: typography.lineHeights.normal * typography.fontSizes.xs,
  },
  actionButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.pendingBannerText,
    textDecorationLine: 'underline',
  },
});
