/**
 * Speqtus Medical Ordering Platform — Reorder Price Check & Transparency Helper (Feature 3)
 * Governed by PRD FR-8, FR-5, and VARIABLE_REGISTRY.md
 * Compares historical snapshot prices against current live catalog prices to prevent unexpected
 * invoice surprises and maintain doctor price transparency.
 */

import { supabase } from '@/lib/supabase';
import { CartItem } from '@/types';
import { logger } from '@/lib/logger';

export interface ReorderSourceItem {
  variantId: string;
  productId?: string;
  productName: string;
  categoryName?: string;
  artNo: string;
  sizeLabel: string;
  price: number | null; // Historical unit price at order time
  imageUrl: string;
  quantity: number;
}

export type ReorderItemChangeType =
  | 'unchanged'
  | 'price_increased'
  | 'price_decreased'
  | 'now_quote_required'
  | 'now_priced'
  | 'discontinued';

export interface ReorderItemDiff {
  variantId: string;
  productId: string;
  productName: string;
  categoryName: string;
  artNo: string;
  sizeLabel: string;
  imageUrl: string;
  quantity: number;
  historicalPrice: number | null;
  livePrice: number | null;
  isActive: boolean;
  changeType: ReorderItemChangeType;
}

export interface ReorderCheckResult {
  hasChanges: boolean;
  diffs: ReorderItemDiff[];
  itemsReadyForCart: Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }>;
}

/**
 * Checks live catalog variant prices vs historical order snapshot prices.
 */
export async function checkReorderPriceChanges(
  items: ReorderSourceItem[]
): Promise<ReorderCheckResult> {
  const variantIds = items.map((i) => i.variantId).filter(Boolean);
  if (variantIds.length === 0) {
    return { hasChanges: false, diffs: [], itemsReadyForCart: [] };
  }

  try {
    const { data: liveVariants, error } = await supabase
      .from('product_variants')
      .select(`
        id,
        price,
        is_active,
        art_no,
        size_label,
        products (
          id,
          name,
          image_url,
          is_active,
          categories ( name )
        )
      `)
      .in('id', variantIds);

    if (error) {
      logger.error('ReorderCheck', 'Failed to fetch live variant prices', error);
      // Fallback: Return original items with no changes flagged
      return {
        hasChanges: false,
        diffs: [],
        itemsReadyForCart: items.map((i) => ({
          item: {
            variantId: i.variantId,
            productId: i.productId || '',
            productName: i.productName,
            categoryName: i.categoryName || 'Reordered Instruments',
            artNo: i.artNo,
            sizeLabel: i.sizeLabel,
            price: i.price,
            imageUrl: i.imageUrl,
          },
          quantity: i.quantity,
        })),
      };
    }

    const liveMap = new Map<string, any>();
    (liveVariants || []).forEach((v: any) => {
      liveMap.set(v.id, v);
    });

    let hasChanges = false;
    const diffs: ReorderItemDiff[] = [];
    const itemsReadyForCart: Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }> = [];

    for (const item of items) {
      const live = liveMap.get(item.variantId);
      const liveProduct = Array.isArray(live?.products) ? live.products[0] : live?.products;
      const liveCategory = Array.isArray(liveProduct?.categories)
        ? liveProduct.categories[0]
        : liveProduct?.categories;
      const isLiveActive = live ? Boolean(live.is_active && liveProduct?.is_active !== false) : false;
      const livePrice =
        live && live.price !== null && live.price !== undefined ? Number(live.price) : null;
      const histPrice =
        item.price !== null && item.price !== undefined ? Number(item.price) : null;

      let changeType: ReorderItemChangeType = 'unchanged';

      if (!live || !isLiveActive) {
        changeType = 'discontinued';
        hasChanges = true;
      } else if (histPrice !== null && livePrice === null) {
        changeType = 'now_quote_required';
        hasChanges = true;
      } else if (histPrice === null && livePrice !== null) {
        changeType = 'now_priced';
        hasChanges = true;
      } else if (histPrice !== null && livePrice !== null && histPrice !== livePrice) {
        changeType = livePrice > histPrice ? 'price_increased' : 'price_decreased';
        hasChanges = true;
      }

      diffs.push({
        variantId: item.variantId,
        productId: liveProduct?.id || item.productId || '',
        productName: liveProduct?.name || item.productName,
        categoryName: liveCategory?.name || item.categoryName || 'Reordered Instruments',
        artNo: live?.art_no || item.artNo,
        sizeLabel: live?.size_label || item.sizeLabel,
        imageUrl: liveProduct?.image_url || item.imageUrl,
        quantity: item.quantity,
        historicalPrice: histPrice,
        livePrice,
        isActive: isLiveActive,
        changeType,
      });

      if (isLiveActive) {
        itemsReadyForCart.push({
          item: {
            variantId: item.variantId,
            productId: liveProduct?.id || item.productId || '',
            productName: liveProduct?.name || item.productName,
            categoryName:
              liveCategory?.name || item.categoryName || 'Reordered Instruments',
            artNo: live?.art_no || item.artNo,
            sizeLabel: live?.size_label || item.sizeLabel,
            price: livePrice, // Updated live catalog price
            imageUrl: liveProduct?.image_url || item.imageUrl,
          },
          quantity: item.quantity,
        });
      }
    }

    return {
      hasChanges,
      diffs,
      itemsReadyForCart,
    };
  } catch (err) {
    logger.error('ReorderCheck', 'Unexpected error checking reorder prices', err);
    return {
      hasChanges: false,
      diffs: [],
      itemsReadyForCart: items.map((i) => ({
        item: {
          variantId: i.variantId,
          productId: i.productId || '',
          productName: i.productName,
          categoryName: i.categoryName || 'Reordered Instruments',
          artNo: i.artNo,
          sizeLabel: i.sizeLabel,
          price: i.price,
          imageUrl: i.imageUrl,
        },
        quantity: i.quantity,
      })),
    };
  }
}
