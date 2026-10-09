import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCartStore } from '@/lib/cart';
import { SavedSet } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { Button } from '@/components/Button';

export default function SavedSetsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const addItem = useCartStore(state => state.addItem);
  const [sets, setSets] = useState<SavedSet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_sets')
        .select(`
          id, name, created_at, updated_at,
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
        updatedAt: set.updated_at,
        items: (set.items || []).map((item: any) => ({
          id: item.id,
          setId: set.id,
          quantity: item.quantity,
          productVariantId: item.variant?.id,
          variant: item.variant ? {
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
          } : undefined,
          product: item.variant?.product ? {
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
          } : undefined,
        })),
      }));
      setSets(parsedSets);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to fetch saved sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, [user]);

  const handleLoadToCart = (set: SavedSet) => {
    if (!set.items) return;
    set.items.forEach(item => {
      if (item.variant && item.product) {
        addItem(
          {
            variantId: item.variant.id,
            productId: item.product.id,
            productName: item.product.name,
            categoryName: item.product.category?.name || '',
            artNo: item.variant.artNo,
            sizeLabel: item.variant.sizeLabel,
            price: item.variant.price,
            imageUrl: item.product.imageUrl,
          },
          item.quantity
        );
      }
    });
    router.push('/(tabs)/cart');
  };

  const handleDeleteSet = (setId: string) => {
    Alert.alert('Delete Set', 'Are you sure you want to delete this OT Set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('saved_sets').delete().eq('id', setId);
            if (error) throw error;
            fetchSets();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete set');
          }
        },
      }
    ]);
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
        <Text style={styles.emptyText}>No saved sets yet. Save your cart as an OT set from the Cart screen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sets}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.cardItems}>{item.items?.length || 0} items</Text>
            
            <View style={styles.cardActions}>
              <Button
                title="Load to Cart"
                onPress={() => handleLoadToCart(item)}
                style={styles.loadBtn}
              />
              <TouchableOpacity onPress={() => handleDeleteSet(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Delete Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
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
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  cardItems: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadBtn: {
    flex: 1,
    marginRight: spacing.md,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  deleteBtnText: {
    color: colors.error,
    fontWeight: typography.fontWeights.semibold,
  },
});
