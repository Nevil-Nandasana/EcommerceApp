/**
 * Speqtus Medical Ordering Platform — Automated WhatsApp Business Client (T5.P.4)
 * Governed by PRD FR-18, F-22, and Planning/VARIABLE_REGISTRY.md.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface WhatsAppNotificationPayload {
  type: 'order_confirmed' | 'order_dispatched' | 'payment_received';
  phone: string;
  doctorName: string;
  orderNumber: string;
  amount?: number;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

/**
 * Triggers an automated WhatsApp Business transactional alert via Supabase Edge Function
 */
export async function sendWhatsAppAlert(
  payload: WhatsAppNotificationPayload
): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  try {
    logger.info('WhatsAppNotification', 'Dispatching automated WhatsApp alert', {
      type: payload.type,
      orderNumber: payload.orderNumber,
      phone: payload.phone,
    });

    const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
      body: payload,
    });

    if (error) {
      logger.warn('WhatsAppNotification', 'Automated WhatsApp dispatch returned error', { error: error.message });
      return { success: false, error: error.message };
    }

    return {
      success: data?.success ?? true,
      simulated: data?.simulated ?? false,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown WhatsApp notification error';
    logger.error('WhatsAppNotification', 'Failed to trigger WhatsApp notification', { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}
