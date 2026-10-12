/**
 * Speqtus Medical Ordering Platform — Localization Engine (T5.P.7 / F-8)
 * Governed by Planning/VARIABLE_REGISTRY.md.
 * 
 * Supports instant switching between English ('en'), Hindi ('hi'), and Gujarati ('gu'),
 * with cross-platform persistence in AsyncStorage and Web localStorage.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { SupportedLanguage } from '@/types';
import { translations, TranslationBundle, LANGUAGE_OPTIONS } from '@/constants/translations';
import { logger } from '@/lib/logger';

export const USER_LANGUAGE_KEY = 'speqtus_user_language';

interface I18nStoreState {
  language: SupportedLanguage;
  strings: TranslationBundle;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  initLanguage: () => Promise<void>;
}

const safeStorage = {
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
      logger.warn('I18n', 'Failed to persist language preference', err);
    }
  },
};

// Global active language state
let currentLanguage: SupportedLanguage = 'en';

export const useI18n = create<I18nStoreState>((set) => ({
  language: 'en',
  strings: translations.en,
  setLanguage: async (lang: SupportedLanguage) => {
    if (!translations[lang]) return;
    currentLanguage = lang;
    set({ language: lang, strings: translations[lang] });
    await safeStorage.setItem(USER_LANGUAGE_KEY, lang);
  },
  initLanguage: async () => {
    try {
      const saved = await safeStorage.getItem(USER_LANGUAGE_KEY);
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'gu')) {
        currentLanguage = saved;
        set({ language: saved, strings: translations[saved] });
      }
    } catch (err) {
      logger.warn('I18n', 'Failed to initialize language', err);
    }
  },
}));

/**
 * Returns current language code ('en' | 'hi' | 'gu')
 */
export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * Returns translation strings bundle for the active language
 */
export function getActiveStrings(): TranslationBundle {
  return translations[currentLanguage] || translations.en;
}

export { LANGUAGE_OPTIONS };
