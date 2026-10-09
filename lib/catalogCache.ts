/**
 * Speqtus Medical Ordering Platform — Catalog Delta Caching & Version Check (Feature 5)
 * Governed by Planning/OPTIMIZATION_AND_OFFLINE_STRATEGY.md (Section 3.5 & 4)
 * Provides local storage persistence, fingerprint/version checking, instant 0ms app loading,
 * and graceful offline resilience for categories and product catalog listings.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Category, ProductSummary } from '@/types';
import { prefetchCatalogThumbnails } from '@/lib/imageCache';
import { logger } from '@/lib/logger';

const CATEGORIES_CACHE_KEY = 'speqtus_cache_categories';
const CATEGORIES_META_KEY = 'speqtus_cache_categories_meta';
const PRODUCTS_CACHE_PREFIX = 'speqtus_cache_products_';
const PRODUCTS_META_PREFIX = 'speqtus_cache_products_meta_';

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheMeta {
  fingerprint: string;
  timestamp: number;
}

// In-memory fallback in case of storage unavailability
const memoryStore = new Map<string, string>();

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore.get(key) || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      memoryStore.set(key, value);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // safe fallback in memoryStore
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      memoryStore.delete(key);
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
 * Reads cached categories from local storage.
 */
export async function getCachedCategories(): Promise<Category[] | null> {
  try {
    const raw = await safeStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Category[];
  } catch (err) {
    logger.warn('CatalogCache', 'Failed to read cached categories', err);
    return null;
  }
}

/**
 * Saves categories to local persistent storage with fingerprint metadata.
 */
export async function setCachedCategories(
  categories: Category[],
  fingerprint: string = ''
): Promise<void> {
  try {
    const meta: CacheMeta = {
      fingerprint,
      timestamp: Date.now(),
    };
    await safeStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
    await safeStorage.setItem(CATEGORIES_META_KEY, JSON.stringify(meta));
  } catch (err) {
    logger.warn('CatalogCache', 'Failed to cache categories', err);
  }
}

/**
 * Fetches categories with instant local-first resolution and remote delta check.
 * If cached categories exist:
 * 1. Quickly verifies remote fingerprint (count + max created_at).
 * 2. If fingerprint matches, returns cached categories (0ms, 0 byte catalog transfer).
 * 3. If offline/error, falls back gracefully to cached categories without blocking UI.
 */
export async function fetchCategoriesWithCache(
  forceRefresh: boolean = false
): Promise<{ data: Category[]; fromCache: boolean }> {
  const cached = await getCachedCategories();
  let cachedMeta: CacheMeta | null = null;

  try {
    const rawMeta = await safeStorage.getItem(CATEGORIES_META_KEY);
    if (rawMeta) {
      cachedMeta = JSON.parse(rawMeta);
    }
  } catch {
    // ignore meta read error
  }

  // If we have cached data and not forcing refresh, do lightweight fingerprint check
  if (cached && cached.length > 0 && !forceRefresh) {
    try {
      const { count, data: latestCat, error: metaError } = await supabase
        .from('categories')
        .select('created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1);

      if (!metaError && count !== null) {
        const latestTime = latestCat?.[0]?.created_at || '';
        const remoteFingerprint = `${count}_${latestTime}`;

        if (cachedMeta?.fingerprint === remoteFingerprint) {
          // Version is identical — 0 bytes transferred!
          return { data: cached, fromCache: true };
        }
      } else if (metaError) {
        // Network or permission issue — return cached data immediately
        return { data: cached, fromCache: true };
      }
    } catch {
      // Offline fallback
      return { data: cached, fromCache: true };
    }
  }

  // Fetch full categories from Supabase
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      logger.error('CatalogCache', 'Failed to fetch remote categories', error);
      if (cached && cached.length > 0) {
        return { data: cached, fromCache: true };
      }
      return { data: [], fromCache: false };
    }

    if (data) {
      const mapped: Category[] = data.map((c) => ({
        id: c.id,
        name: c.name,
        parentCategory: c.parent_category,
        sortOrder: c.sort_order,
        slug: c.slug,
        createdAt: c.created_at,
      }));

      // Calculate maximum created_at across all categories to guarantee exact match with limit(1) remote check
      const latestTime = data.reduce((max, c) => {
        if (!max) return c.created_at || '';
        if (c.created_at && c.created_at > max) return c.created_at;
        return max;
      }, '');
      const remoteFingerprint = `${data.length}_${latestTime}`;
      await setCachedCategories(mapped, remoteFingerprint);

      return { data: mapped, fromCache: false };
    }
  } catch (err) {
    logger.error('CatalogCache', 'Unexpected error fetching categories', err);
    if (cached && cached.length > 0) {
      return { data: cached, fromCache: true };
    }
  }

  return { data: cached || [], fromCache: Boolean(cached) };
}

/**
 * Reads cached products for a specific category.
 */
export async function getCachedCategoryProducts(
  categoryId: string
): Promise<ProductSummary[] | null> {
  try {
    const raw = await safeStorage.getItem(`${PRODUCTS_CACHE_PREFIX}${categoryId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ProductSummary[];
  } catch (err) {
    logger.warn('CatalogCache', `Failed to read cached products for ${categoryId}`, err);
    return null;
  }
}

/**
 * Saves products for a specific category with fingerprint metadata.
 */
export async function setCachedCategoryProducts(
  categoryId: string,
  products: ProductSummary[],
  fingerprint: string = ''
): Promise<void> {
  try {
    const meta: CacheMeta = {
      fingerprint,
      timestamp: Date.now(),
    };
    await safeStorage.setItem(`${PRODUCTS_CACHE_PREFIX}${categoryId}`, JSON.stringify(products));
    await safeStorage.setItem(`${PRODUCTS_META_PREFIX}${categoryId}`, JSON.stringify(meta));
  } catch (err) {
    logger.warn('CatalogCache', `Failed to cache products for ${categoryId}`, err);
  }
}

/**
 * Fetches products in a category with local-first cache and lightweight delta checking.
 * Prefetches thumbnails into disk cache for instant browsing.
 */
export async function fetchCategoryProductsWithCache(
  categoryId: string,
  forceRefresh: boolean = false
): Promise<{ data: ProductSummary[]; fromCache: boolean }> {
  const cached = await getCachedCategoryProducts(categoryId);
  let cachedMeta: CacheMeta | null = null;

  try {
    const rawMeta = await safeStorage.getItem(`${PRODUCTS_META_PREFIX}${categoryId}`);
    if (rawMeta) {
      cachedMeta = JSON.parse(rawMeta);
    }
  } catch {
    // ignore meta read error
  }

  // Fast check: if cached and not forcing refresh, do lightweight count check
  if (cached && cached.length > 0 && !forceRefresh) {
    const isTtlValid = cachedMeta?.timestamp && Date.now() - cachedMeta.timestamp < DEFAULT_CACHE_TTL_MS;
    try {
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('is_active', true);

      if (!countError && count !== null) {
        const remoteFingerprint = `count_${count}`;
        if (cachedMeta?.fingerprint === remoteFingerprint && isTtlValid) {
          return { data: cached, fromCache: true };
        }
      } else if (countError) {
        return { data: cached, fromCache: true };
      }
    } catch {
      return { data: cached, fromCache: true };
    }
  }

  // Fetch full category products from Supabase
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        image_url,
        search_tags,
        product_variants ( id )
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      logger.error('CatalogCache', `Failed to fetch products for ${categoryId}`, error);
      if (cached && cached.length > 0) {
        return { data: cached, fromCache: true };
      }
      return { data: [], fromCache: false };
    }

    if (data) {
      const mapped: ProductSummary[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.image_url,
        searchTags: p.search_tags || [],
        variantsCount: p.product_variants?.length || 0,
      }));

      const remoteFingerprint = `count_${data.length}`;
      await setCachedCategoryProducts(categoryId, mapped, remoteFingerprint);

      // Background thumbnail disk prefetch
      const imageUrls = mapped.map((p) => p.imageUrl).filter(Boolean);
      prefetchCatalogThumbnails(imageUrls).catch((err) =>
        logger.warn('CatalogCache', 'Prefetch thumbnails error', err)
      );

      return { data: mapped, fromCache: false };
    }
  } catch (err) {
    logger.error('CatalogCache', `Unexpected error fetching category ${categoryId}`, err);
    if (cached && cached.length > 0) {
      return { data: cached, fromCache: true };
    }
  }

  return { data: cached || [], fromCache: Boolean(cached) };
}

/**
 * Clears cached catalog data.
 */
export async function clearCatalogCache(): Promise<void> {
  try {
    await safeStorage.removeItem(CATEGORIES_CACHE_KEY);
    await safeStorage.removeItem(CATEGORIES_META_KEY);
    if (Platform.OS !== 'web') {
      const keys = await AsyncStorage.getAllKeys();
      const catalogKeys = keys.filter(
        (k) => k.startsWith(PRODUCTS_CACHE_PREFIX) || k.startsWith(PRODUCTS_META_PREFIX)
      );
      if (catalogKeys.length > 0) {
        await AsyncStorage.multiRemove(catalogKeys);
      }
    }
  } catch (err) {
    logger.warn('CatalogCache', 'Failed to clear catalog cache', err);
  }
}
