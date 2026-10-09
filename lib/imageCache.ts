import { Image } from 'expo-image';
import { logger } from '@/lib/logger';

export let isCachingComplete = false;

export const prefetchCatalogThumbnails = async (imageUrls: string[]) => {
  isCachingComplete = false;
  try {
    const urls = imageUrls.filter(Boolean);
    if (urls.length === 0) {
      isCachingComplete = true;
      return;
    }
    await Promise.allSettled(
      urls.map((url) =>
        Image.prefetch(url).catch((e) =>
          logger.error('ImageCache', `Failed to prefetch ${url}`, e)
        )
      )
    );
  } catch (error) {
    logger.error('ImageCache', 'Failed to prefetch some images', error);
  } finally {
    isCachingComplete = true;
  }
};
