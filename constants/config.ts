/**
 * Speqtus Medical Ordering Platform — Application Configuration
 * Governed by Planning/VARIABLE_REGISTRY.md
 */

export const APP_CONFIG = {
  whatsappPhone: process.env.EXPO_PUBLIC_WHATSAPP_PHONE || '',
  supportPhone: process.env.EXPO_PUBLIC_SUPPORT_PHONE || '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  r2PublicUrlPrefix: process.env.R2_PUBLIC_URL_PREFIX || 'https://images.speqtusmedical.com',
};
