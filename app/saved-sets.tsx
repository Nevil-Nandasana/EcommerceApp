/**
 * Speqtus Medical Ordering Platform — Saved OT Sets Screen
 * Allows doctors to inspect itemized OT set contents, load to cart, and inline rename sets.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/cart';
import { SavedSet } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { Button } from '@/components/Button';
import { validateSavedSetName } from '@/lib/savedSetsValidator';
import { logger } from '@/lib/logger';

export default function SavedSetsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const addItem = useCartStore((state) => state.addItem);

  const [sets, setSets] = useState<SavedSet[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspection State: Tracks expanded sets
  const [expandedSetIds, setExpandedSetIds] = useState<Record<string, boolean>>({});

  // Inline Rename Modal State
  const [renamingSet, setRenamingSet] = useState<SavedSet | null>(null);
  const [newSetName, setNewSetName] = useState('');
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  const fetchSets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_sets')
        .select(`
          id, name, created_at,
          items:saved_set_items(
            id, quantity,
            variant:product_variants(
              id, art_no, size_label, price,
              product:products(id, name, category:categories(name), image_url)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedSets: SavedSet[] = (data || []).map((set: any) => ({
        id: set.id,
        userId: user.id,
        name: set.name,
        createdAt: set.created_at,
        updatedAt: set.created_at,
        items: (set.items || []).map((item: any) => ({
          id: item.id,
          setId: set.id,
          quantity: item.quantity,
          productVariantId: item.variant?.id,
          variant: item.variant
            ? {
                id: item.variant.id,
                productId: item.variant.product?.id,
                artNo: item.variant.art_no,
                sizeLabel: item.variant.size_label,
                sizeCm: item.variant.size_cm || null,
                price: item.variant.price,
                currency: item.variant.currency || 'INR',
                isActive: item.variant.is_active,
                createdAt: item.variant.created_at,
                updatedAt: item.variant.updated_at,
              }
            : undefined,
          product: item.variant?.product
            ? {
                id: item.variant.product.id,
                categoryId: item.variant.product.category_id,
                name: item.variant.product.name,
                description: item.variant.product.description,
                imageUrl: item.variant.product.image_url,
                additionalImages: item.variant.product.additional_images,
                searchTags: item.variant.product.search_tags,
                isActive: item.variant.product.is_active,
                sourceRowRef: item.variant.product.source_row_ref,
                createdAt: item.variant.product.created_at,
                updatedAt: item.variant.product.updated_at,
                category: item.variant.product.category,
              }
            : undefined,
        })),
      }));
      setSets(parsedSets);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Failed to fetch saved sets';
      logger.error('SavedSets', 'Failed to fetch saved sets', e);
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, [user]);

  const toggleExpand = (setId: string) => {
    setExpandedSetIds((prev) => ({
      ...prev,
      [setId]: !prev[setId],
    }));
  };

  const handleLoadToCart = (set: SavedSet) => {
    if (!set.items || set.items.length === 0) {
      Alert.alert('Empty Set', 'This OT Set contains no items.');
      return;
    }
    let addedCount = 0;
    set.items.forEach((item) => {
      if (item.variant && item.product) {
        const catName =
          typeof item.product.category === 'object' && item.product.category !== null
            ? (Array.isArray(item.product.category)
                ? (item.product.category[0] as { name?: string })?.name
                : (item.product.category as { name?: string }).name)
            : typeof item.product.category === 'string'
              ? item.product.category
              : 'General';

        addItem(
          {
            variantId: item.variant.id,
            productId: item.product.id,
            productName: item.product.name,
            categoryName: catName || 'General',
            artNo: item.variant.artNo,
            sizeLabel: item.variant.sizeLabel,
            price: item.variant.price,
            imageUrl: item.product.imageUrl,
          },
          item.quantity
        );
        addedCount++;
      }
    });

    if (addedCount === 0) {
      Alert.alert('Unavailable', 'None of the instruments in this set are currently available.');
      return;
    }

    router.push('/(tabs)/cart');
  };

  const handleDeleteSet = (setId: string) => {
    if (!user) return;
    Alert.alert('Delete Set', 'Are you sure you want to delete this OT Set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('saved_sets')
              .delete()
              .eq('id', setId)
              .eq('user_id', user.id);
            if (error) throw error;
            fetchSets();
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : 'Failed to delete set';
            logger.error('SavedSets', 'Failed to delete set', e);
            Alert.alert('Error', errMsg);
          }
        },
      },
    ]);
  };

  const openRenameModal = (set: SavedSet) => {
    setRenamingSet(set);
    setNewSetName(set.name);
  };

  const handleConfirmRename = async () => {
    if (!renamingSet || !user || isSubmittingRename) return;

    const validation = validateSavedSetName(newSetName);
    if (!validation.isValid || !validation.sanitizedName) {
      Alert.alert('Validation Error', validation.error || 'Please enter a valid set name.');
      return;
    }

    // No-op if name is unchanged
    if (validation.sanitizedName === renamingSet.name) {
      setRenamingSet(null);
      return;
    }

    setIsSubmittingRename(true);
    try {
      const { error } = await supabase
        .from('saved_sets')
        .update({
          name: validation.sanitizedName,
        })
        .eq('id', renamingSet.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSets((prev) =>
        prev.map((s) => (s.id === renamingSet.id ? { ...s, name: validation.sanitizedName! } : s))
      );
      setRenamingSet(null);
      Alert.alert('Renamed', 'OT Set renamed successfully.');
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Failed to rename OT set';
      logger.error('SavedSets', 'Failed to rename set', e);
      Alert.alert('Error', errMsg);
    } finally {
      setIsSubmittingRename(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (sets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          No saved sets yet. Save your cart as an OT set from the Cart screen.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpanded = !!expandedSetIds[item.id];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleCol}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDate}>
                    Created on {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => openRenameModal(item)}
                  style={styles.renameBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${item.name}`}
                  accessibilityHint="Opens modal to change the name of this OT set"
                >
                  <Text style={styles.renameBtnText}>Rename ✏️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.cardItems}>{item.items?.length || 0} instruments</Text>
                <TouchableOpacity
                  onPress={() => toggleExpand(item.id)}
                  style={styles.expandToggleBtn}
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded ? `Hide items for ${item.name}` : `Inspect items for ${item.name}`}
                  accessibilityHint="Expands itemized contents of this OT Set before adding to cart"
                >
                  <Text style={styles.expandToggleText}>
                    {isExpanded ? 'Hide Items ▲' : `Inspect Items (${item.items?.length || 0}) ▼`}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Expandable Itemized Contents Inspection */}
              {isExpanded && (
                <View style={styles.inspectionContainer}>
                  <Text style={styles.inspectionHeading}>OT Set Contents:</Text>
                  {item.items && item.items.length > 0 ? (
                    item.items.map((it) => (
                      <View key={it.id} style={styles.inspectionRow}>
                        <View style={styles.inspectionDetails}>
                          <Text style={styles.inspectionItemName}>
                            {it.product?.name || 'Surgical Instrument'}
                          </Text>
                          <Text style={styles.inspectionItemMeta}>
                            Art No: <Text style={styles.artNoBold}>{it.variant?.artNo || 'N/A'}</Text>{' '}
                            ({it.variant?.sizeLabel || 'Standard'})
                          </Text>
                        </View>
                        <View style={styles.inspectionQtyCol}>
                          <Text style={styles.inspectionQty}>Qty: {it.quantity}</Text>
                          {it.variant?.price !== null && it.variant?.price !== undefined ? (
                            <Text style={styles.inspectionPrice}>
                              ₹{(it.variant.price * it.quantity).toLocaleString('en-IN')}
                            </Text>
                          ) : (
                            <Text style={styles.inspectionPricePending}>Quote Pending</Text>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyItemsText}>No items found in this set.</Text>
                  )}
                </View>
              )}

              <View style={styles.cardActions}>
                <Button
                  title="Load to Cart"
                  onPress={() => handleLoadToCart(item)}
                  style={styles.loadBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Load ${item.name} into cart`}
                  accessibilityHint="Transfers all instruments in this OT set directly to your cart"
                />
                <TouchableOpacity
                  onPress={() => handleDeleteSet(item.id)}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                  accessibilityHint="Permanently removes this saved OT set"
                >
                  <Text style={styles.deleteBtnText}>Delete Set</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Inline Rename Modal */}
      <Modal
        visible={!!renamingSet}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingSet(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename OT Set</Text>
            <Text style={styles.modalSubtitle}>Enter a new name for this OT set:</Text>
            <TextInput
              style={styles.modalInput}
              value={newSetName}
              onChangeText={setNewSetName}
              placeholder="e.g. Minor OT Set"
              autoFocus
              maxLength={100}
              accessibilityLabel="OT Set Name Input"
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setRenamingSet(null)}
                variant="outline"
                style={styles.modalCancelBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancel rename"
              />
              <Button
                title="Save Name"
                onPress={handleConfirmRename}
                variant="primary"
                style={styles.modalSaveBtn}
                loading={isSubmittingRename}
                accessibilityRole="button"
                accessibilityLabel="Save new OT set name"
              />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.base,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  renameBtn: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  renameBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardItems: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  expandToggleBtn: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  expandToggleText: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  inspectionContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inspectionHeading: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  inspectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inspectionDetails: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  inspectionItemName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  inspectionItemMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  artNoBold: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  inspectionQtyCol: {
    alignItems: 'flex-end',
  },
  inspectionQty: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  inspectionPrice: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  inspectionPricePending: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyItemsText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadBtn: {
    flex: 1,
    marginRight: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  deleteBtn: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  deleteBtnText: {
    color: colors.error,
    fontWeight: typography.fontWeights.semibold,
    fontSize: typography.fontSizes.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
    minHeight: layout.minTouchTarget,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalSaveBtn: {
    flex: 1,
  },
});
