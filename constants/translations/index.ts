/**
 * Speqtus Medical Ordering Platform — Localization Registry (T5.P.7 / F-8)
 * Exports supported translations for English (en), Hindi (hi), and Gujarati (gu).
 */

import { en, TranslationBundle } from './en';
import { hi } from './hi';
import { gu } from './gu';
import { SupportedLanguage } from '@/types';

export const translations: Record<SupportedLanguage, TranslationBundle> = {
  en,
  hi,
  gu,
};

export const LANGUAGE_OPTIONS: Array<{ code: SupportedLanguage; label: string; nativeLabel: string }> = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
];

export { TranslationBundle };
