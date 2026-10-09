/**
 * Speqtus Medical Ordering Platform — Reorder Price Warning & Transparency Modal (Feature 3)
 * Displays itemized catalog price modifications and unavailable instruments before cart population.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ReorderItemDiff } from '@/lib/reorderCheck';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface ReorderWarningModalProps {
  visible: boolean;
  orderNumber?: string;
  diffs: ReorderItemDiff[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const ReorderWarningModal: React.FC<ReorderWarningModalProps> = ({
  visible,
  orderNumber,
  diffs,
  onCancel,
  onConfirm,
}) => {
  const changedItems = diffs.filter((d) => d.changeType !== 'unchanged');
  const unchangedCount = diffs.filter((d) => d.changeType === 'unchanged').length;
  const activeCount = diffs.filter((d) => d.isActive).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Price & Catalog Updates</Text>
            <Text style={styles.subtitle}>
              {orderNumber ? `Since order #${orderNumber} was placed, ` : ''}
              some catalog prices or availabilities have changed:
            </Text>
          </View>

          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {changedItems.map((item) => {
              const hist = item.historicalPrice;
              const live = item.livePrice;

              return (
                <View key={item.variantId} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={styles.itemArtNo}>{item.artNo}</Text>
                  </View>

                  <Text style={styles.itemSize}>Size: {item.sizeLabel || 'Standard'}</Text>

                  {item.changeType === 'discontinued' && (
                    <View style={[styles.badge, styles.badgeDiscontinued]}>
                      <Text style={styles.badgeDiscontinuedText}>
                        ⚠️ Discontinued / Unavailable in Catalog
                      </Text>
                    </View>
                  )}

                  {item.changeType === 'price_increased' && hist !== null && live !== null && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceOld}>₹{hist.toLocaleString('en-IN')}</Text>
                      <Text style={styles.priceArrow}>➔</Text>
                      <Text style={styles.priceNew}>₹{live.toLocaleString('en-IN')}</Text>
                      <View style={[styles.badge, styles.badgeWarning]}>
                        <Text style={styles.badgeWarningText}>
                          +₹{(live - hist).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  )}

                  {item.changeType === 'price_decreased' && hist !== null && live !== null && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceOld}>₹{hist.toLocaleString('en-IN')}</Text>
                      <Text style={styles.priceArrow}>➔</Text>
                      <Text style={styles.priceNewSuccess}>₹{live.toLocaleString('en-IN')}</Text>
                      <View style={[styles.badge, styles.badgeSuccess]}>
                        <Text style={styles.badgeSuccessText}>
                          -₹{(hist - live).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  )}

                  {item.changeType === 'now_quote_required' && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceOld}>
                        {hist !== null ? `₹${hist.toLocaleString('en-IN')}` : 'Priced'}
                      </Text>
                      <Text style={styles.priceArrow}>➔</Text>
                      <View style={[styles.badge, styles.badgeInfo]}>
                        <Text style={styles.badgeInfoText}>Quote Required</Text>
                      </View>
                    </View>
                  )}

                  {item.changeType === 'now_priced' && live !== null && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceOld}>Quote Pending</Text>
                      <Text style={styles.priceArrow}>➔</Text>
                      <Text style={styles.priceNew}>₹{live.toLocaleString('en-IN')}</Text>
                      <View style={[styles.badge, styles.badgeSuccess]}>
                        <Text style={styles.badgeSuccessText}>Now Priced</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {unchangedCount > 0 && (
              <View style={styles.unchangedBox}>
                <Text style={styles.unchangedText}>
                  ✓ {unchangedCount} other {unchangedCount === 1 ? 'item has' : 'items have'} identical prices and will be added.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              {activeCount > 0
                ? `${activeCount} available items will be added to your cart with current prices.`
                : 'None of the items from this order are currently available.'}
            </Text>
          </View>

          <View style={styles.actions}>
            {activeCount > 0 ? (
              <>
                <Button
                  title="Cancel"
                  onPress={onCancel}
                  variant="outline"
                  style={styles.cancelBtn}
                />
                <Button
                  title="Accept & Go to Cart"
                  onPress={onConfirm}
                  variant="primary"
                  style={styles.confirmBtn}
                />
              </>
            ) : (
              <Button
                title="Dismiss"
                onPress={onCancel}
                variant="outline"
                style={{ width: '100%' }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '85%',
    padding: spacing.base,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scrollList: {
    maxHeight: 340,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  itemArtNo: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  itemSize: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  priceOld: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  priceArrow: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  priceNew: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  priceNewSuccess: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeDiscontinued: {
    backgroundColor: colors.errorLight,
    marginTop: spacing.xs,
  },
  badgeDiscontinuedText: {
    fontSize: typography.fontSizes.xs,
    color: colors.error,
    fontWeight: typography.fontWeights.semibold,
  },
  badgeWarning: {
    backgroundColor: colors.warningLight,
    marginLeft: spacing.xs,
  },
  badgeWarningText: {
    fontSize: typography.fontSizes.xs,
    color: colors.warning,
    fontWeight: typography.fontWeights.bold,
  },
  badgeSuccess: {
    backgroundColor: colors.successLight,
    marginLeft: spacing.xs,
  },
  badgeSuccessText: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    fontWeight: typography.fontWeights.bold,
  },
  badgeInfo: {
    backgroundColor: colors.infoLight,
  },
  badgeInfoText: {
    fontSize: typography.fontSizes.xs,
    color: colors.info,
    fontWeight: typography.fontWeights.medium,
  },
  unchangedBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  unchangedText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  footerNote: {
    marginVertical: spacing.sm,
    paddingTop: spacing.xs,
  },
  footerNoteText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
  },
});
