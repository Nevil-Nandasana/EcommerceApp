/**
 * Speqtus Medical Ordering Platform — Cross-Device Cloud Cart Synchronization (T5.P.10)
 * Governed by PRD Section 5, VARIABLE_REGISTRY.md, and migration 20261012000010.
 */

import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/lib/cart';
import { CartItem } from '@/types';
import { logger } from '@/lib/logger';

let isSyncing = false;

/**
 * Syncs the local Zustand cart with the cloud database for the authenticated doctor
 */
export async function syncCloudCartWithLocal(userId: string): Promise<void> {
  if (!userId || isSyncing) return;
  isSyncing = true;

  try {
    logger.info('CartSync', 'Starting cloud cart sync for user', { userId });

    // 1. Fetch server-side cart items
    const { data: serverItems, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        product_variant_id,
        product_variants (
          id,
          art_no,
          size_label,
          price,
          product_id,
          products (
            id,
            name,
            image_url,
            categories (
              name
            )
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      logger.warn('CartSync', 'Failed to fetch server cart items', { error: error.message });
      isSyncing = false;
      return;
    }

    const localItems = useCartStore.getState().cartItems;
    const localMap = new Map<string, CartItem>(localItems.map((item) => [item.variantId, item]));

    // 2. Process server items into CartItems
    const mappedServerItems: CartItem[] = [];

    for (const row of serverItems || []) {
      const pv = row.product_variants as any;
      if (!pv || !pv.products) continue;

      const p = pv.products;
      const cat = p.categories;

      mappedServerItems.push({
        variantId: pv.id,
        productId: p.id,
        productName: p.name,
        categoryName: cat?.name || 'General Surgery',
        artNo: pv.art_no,
        sizeLabel: pv.size_label,
        price: pv.price ? Number(pv.price) : null,
        imageUrl: p.image_url,
        quantity: row.quantity,
      });
    }

    // 3. Merge server items with local items
    const finalCartItems: CartItem[] = [...localItems];

    for (const serverItem of mappedServerItems) {
      const existingLocal = localMap.get(serverItem.variantId);
      if (!existingLocal) {
        finalCartItems.push(serverItem);
      } else {
        // If local quantity differs, reconcile with maximum
        if (existingLocal.quantity < serverItem.quantity) {
          const idx = finalCartItems.findIndex((i) => i.variantId === serverItem.variantId);
          if (idx > -1) {
            finalCartItems[idx].quantity = serverItem.quantity;
          }
        }
      }
    }

    // Update Zustand state
    useCartStore.setState({ cartItems: finalCartItems });

    // 4. Upsert merged state to server
    for (const item of finalCartItems) {
      await supabase
        .from('cart_items')
        .upsert(
          {
            user_id: userId,
            product_variant_id: item.variantId,
            quantity: item.quantity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, product_variant_id' }
        );
    }

    logger.info('CartSync', 'Cloud cart synchronization completed successfully');
  } catch (err) {
    logger.error('CartSync', 'Error during cloud cart sync', { err });
  } finally {
    isSyncing = false;
  }
}

/**
 * Pushes local cart additions or removals to the server in the background
 */
export async function pushCartDeltaToServer(
  userId: string,
  variantId: string,
  quantity: number
): Promise<void> {
  if (!userId) return;

  try {
    if (quantity <= 0) {
      // Remove item
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_variant_id', variantId);
    } else {
      // Upsert item
      await supabase
        .from('cart_items')
        .upsert(
          {
            user_id: userId,
            product_variant_id: variantId,
            quantity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, product_variant_id' }
        );
    }
  } catch (err) {
    logger.warn('CartSync', 'Failed to push cart delta to server', { err });
  }
}

/**
 * Clears the user's server cart upon order placement or explicit cart clear
 */
export async function clearServerCart(userId: string): Promise<void> {
  if (!userId) return;

  try {
    await supabase.from('cart_items').delete().eq('user_id', userId);
  } catch (err) {
    logger.warn('CartSync', 'Failed to clear server cart', { err });
  }
}
