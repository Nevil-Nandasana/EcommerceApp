/**
 * Speqtus Medical Ordering Platform — Category Grid Card Component (T3.2.1)
 * Governed by PRD FR-1.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Category } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';

interface CategoryCardProps {
  category: Category;
  onPress: (category: Category) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(category)}
      style={styles.card}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Category: ${category.name}`}
    >
      <View style={styles.bannerBadge}>
        <Text style={styles.bannerText} numberOfLines={1}>
          {category.parentCategory}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: layout.minTouchTarget * 2,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'space-between',
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLight,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  bannerText: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    fontWeight: typography.fontWeights.medium,
  },
  content: {
    marginTop: spacing.xs,
  },
  name: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
});
