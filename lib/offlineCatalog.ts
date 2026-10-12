/**
 * Speqtus Medical Ordering Platform — Full Offline Catalog Database (FR-17, T5.P.5)
 * Governed by Planning/OPTIMIZATION_AND_OFFLINE_STRATEGY.md and Planning/VARIABLE_REGISTRY.md.
 * 
 * Provides local embedded database indexing for categories, products, and variants,
 * enabling full offline search and product inspection in low-connectivity hospital basements / OTs.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Category, ProductWithVariants, ProductSummary, ProductVariant } from '@/types';
import { logger } from '@/lib/logger';
import bundledMasterCatalog from '@/assets/catalog/master_catalog.json';

export const OFFLINE_CATALOG_STORAGE_KEY = 'speqtus_offline_catalog_v1';

export interface OfflineProductRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  imageUrl: string;
  additionalImages: string[] | null;
  searchTags: string[];
  isActive: boolean;
  variants: ProductVariant[];
}

export interface OfflineCatalogData {
  version: number;
  syncedAt: string;
  categories: Category[];
  products: OfflineProductRecord[];
}

export interface OfflineSearchResult {
  productId: string;
  productName: string;
  categoryName: string;
  categoryId: string;
  imageUrl: string;
  artNo: string;
  sizeLabel: string;
  price: number | null;
  stockQuantity?: number | null;
  isInStock?: boolean;
  similarityScore: number;
}

// Memory fallback store
let inMemoryCatalog: OfflineCatalogData | null = null;

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      logger.warn('OfflineCatalog', 'Failed to write offline catalog to storage', err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // safe fallback
    }
  },
};

/**
 * Loads the stored offline catalog from persistent disk cache
 */
export async function getOfflineCatalog(): Promise<OfflineCatalogData | null> {
  if (inMemoryCatalog) return inMemoryCatalog;

  try {
    const raw = await storage.getItem(OFFLINE_CATALOG_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as OfflineCatalogData;
      inMemoryCatalog = data;
      return data;
    }

    // Fallback to pre-bundled master catalog extracted from PDF
    if (bundledMasterCatalog && bundledMasterCatalog.products && bundledMasterCatalog.products.length > 0) {
      const data = bundledMasterCatalog as unknown as OfflineCatalogData;
      inMemoryCatalog = data;
      return data;
    }

    return null;
  } catch (err) {
    logger.warn('OfflineCatalog', 'Failed to load offline catalog', err);
    return null;
  }
}

/**
 * Persists the catalog data to disk storage
 */
export async function saveOfflineCatalog(data: OfflineCatalogData): Promise<void> {
  inMemoryCatalog = data;
  try {
    await storage.setItem(OFFLINE_CATALOG_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    logger.warn('OfflineCatalog', 'Failed to save offline catalog', err);
  }
}

/**
 * Synchronizes the full catalog database from Supabase for zero-connectivity offline browsing
 */
export async function syncFullCatalogOffline(): Promise<{
  success: boolean;
  categoryCount: number;
  productCount: number;
  error?: string;
}> {
  try {
    // 1. Fetch Categories
    const { data: categoriesData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (catError) {
      logger.error('OfflineCatalog', 'Failed to sync categories for offline storage', catError);
      return { success: false, categoryCount: 0, productCount: 0, error: catError.message };
    }

    const categories: Category[] = (categoriesData || []).map((c) => ({
      id: c.id,
      name: c.name,
      parentCategory: c.parent_category,
      sortOrder: c.sort_order,
      slug: c.slug,
      createdAt: c.created_at,
    }));

    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => categoryMap.set(cat.id, cat.name));

    // 2. Fetch Products with Variants
    const { data: productsData, error: prodError } = await supabase
      .from('products')
      .select(`
        id,
        category_id,
        name,
        description,
        image_url,
        additional_images,
        search_tags,
        is_active,
        catalog_variants (
          id,
          product_id,
          art_no,
          size_label,
          size_cm,
          price,
          currency,
          stock_quantity,
          is_in_stock,
          low_stock_threshold,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('is_active', true);

    if (prodError) {
      logger.error('OfflineCatalog', 'Failed to sync products for offline storage', prodError);
      return { success: false, categoryCount: categories.length, productCount: 0, error: prodError.message };
    }

    const products: OfflineProductRecord[] = (productsData || []).map((p: any) => {
      const variants: ProductVariant[] = (p.catalog_variants || [])
        .filter((v: any) => v.is_active)
        .map((v: any) => ({
          id: v.id,
          productId: v.product_id,
          artNo: v.art_no,
          sizeLabel: v.size_label,
          sizeCm: v.size_cm ? Number(v.size_cm) : null,
          price: v.price ? Number(v.price) : null,
          currency: v.currency || 'INR',
          stockQuantity: v.stock_quantity ?? 50,
          isInStock: v.is_in_stock ?? true,
          lowStockThreshold: v.low_stock_threshold ?? 5,
          isActive: v.is_active,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
        }));

      return {
        id: p.id,
        categoryId: p.category_id,
        categoryName: categoryMap.get(p.category_id) || '',
        name: p.name,
        description: p.description,
        imageUrl: p.image_url,
        additionalImages: p.additional_images,
        searchTags: p.search_tags || [],
        isActive: p.is_active,
        variants,
      };
    });

    const catalogPayload: OfflineCatalogData = {
      version: 1,
      syncedAt: new Date().toISOString(),
      categories,
      products,
    };

    await saveOfflineCatalog(catalogPayload);

    return {
      success: true,
      categoryCount: categories.length,
      productCount: products.length,
    };
  } catch (err: any) {
    logger.error('OfflineCatalog', 'Unexpected error during offline sync', err);
    return { success: false, categoryCount: 0, productCount: 0, error: err?.message || 'Sync failed' };
  }
}

/**
 * Searches the local offline catalog across Art No, instrument name, specialty tags, and category.
 * Provides instant results when disconnected from network in hospital basement OTs.
 */
export async function searchOfflineCatalog(
  query: string,
  limit: number = 30
): Promise<OfflineSearchResult[]> {
  const catalog = await getOfflineCatalog();
  if (!catalog || !catalog.products.length) return [];

  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: OfflineSearchResult[] = [];

  for (const product of catalog.products) {
    const prodNameLower = product.name.toLowerCase();
    const catNameLower = product.categoryName.toLowerCase();
    const tagsMatch = product.searchTags.some((tag) => tag.toLowerCase().includes(q));

    for (const variant of product.variants) {
      const artNoLower = variant.artNo.toLowerCase();

      let similarityScore = 0;

      // Exact Art No match gets highest priority
      if (artNoLower === q) {
        similarityScore = 1.0;
      } else if (artNoLower.includes(q)) {
        similarityScore = 0.85;
      } else if (prodNameLower === q) {
        similarityScore = 0.8;
      } else if (prodNameLower.includes(q)) {
        similarityScore = 0.65;
      } else if (tagsMatch) {
        similarityScore = 0.5;
      } else if (catNameLower.includes(q)) {
        similarityScore = 0.4;
      }

      if (similarityScore > 0) {
        results.push({
          productId: product.id,
          productName: product.name,
          categoryName: product.categoryName,
          categoryId: product.categoryId,
          imageUrl: product.imageUrl,
          artNo: variant.artNo,
          sizeLabel: variant.sizeLabel,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          isInStock: variant.isInStock,
          similarityScore,
        });
      }
    }
  }

  // Sort descending by relevance score, then by product name
  results.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    return a.productName.localeCompare(b.productName);
  });

  return results.slice(0, limit);
}

/**
 * Retrieves a single product with variants from the offline database
 */
export async function getOfflineProduct(productId: string): Promise<ProductWithVariants | null> {
  const catalog = await getOfflineCatalog();
  if (!catalog) return null;

  const found = catalog.products.find((p) => p.id === productId);
  if (!found) return null;

  const category = catalog.categories.find((c) => c.id === found.categoryId);

  return {
    id: found.id,
    categoryId: found.categoryId,
    name: found.name,
    description: found.description,
    imageUrl: found.imageUrl,
    additionalImages: found.additionalImages,
    searchTags: found.searchTags,
    isActive: found.isActive,
    sourceRowRef: null,
    createdAt: catalog.syncedAt,
    updatedAt: catalog.syncedAt,
    category,
    variants: found.variants,
  };
}

/**
 * Retrieves categories list from offline database
 */
export async function getOfflineCategories(): Promise<Category[]> {
  const catalog = await getOfflineCatalog();
  return catalog?.categories || [];
}

/**
 * Retrieves products for a specific category from offline database
 */
export async function getOfflineCategoryProducts(categoryId: string): Promise<ProductSummary[]> {
  const catalog = await getOfflineCatalog();
  if (!catalog) return [];

  return catalog.products
    .filter((p) => p.categoryId === categoryId && p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      variantsCount: p.variants.length,
      searchTags: p.searchTags,
    }));
}
