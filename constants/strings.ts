/**
 * Speqtus Medical Ordering Platform — Externalized UI Strings (T5.P.7 / F-8)
 * Dynamically resolves to active localized language bundle (English, Hindi, Gujarati).
 */

import { en, TranslationBundle } from './translations/en';
import { getActiveStrings } from '@/lib/i18n';

export const strings: TranslationBundle = new Proxy(en, {
  get(_target, prop: string) {
    const active = getActiveStrings();
    return (active as any)[prop] ?? (en as any)[prop];
  },
});
