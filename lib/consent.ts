/**
 * Speqtus Medical Ordering Platform — DPDP Act 2023 Consent Manager (T5.P.9)
 * Governed by Planning/VARIABLE_REGISTRY.md and PRD Data Model.
 * 
 * Provides audit logging, affirmative grant tracking, and withdrawal management
 * for Indian Digital Personal Data Protection (DPDP) Act 2023 compliance.
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ConsentRecord, ConsentType } from '@/types';
import { logger } from '@/lib/logger';

export const CURRENT_LEGAL_VERSION = 'v1.0';

/**
 * Returns platform user-agent string for audit trail
 */
export function getClientUserAgent(): string {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.userAgent || 'Speqtus Web Client';
  }
  return `Speqtus-Native/${Platform.OS}-${Platform.Version}`;
}

/**
 * Records an affirmative consent or rejection event in the immutable audit log
 */
export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  isGranted: boolean = true,
  version: string = CURRENT_LEGAL_VERSION
): Promise<ConsentRecord | null> {
  try {
    const userAgent = getClientUserAgent();

    const { data, error } = await supabase
      .from('consent_records')
      .insert({
        user_id: userId,
        consent_type: consentType,
        version,
        is_granted: isGranted,
        user_agent: userAgent,
        consented_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('ConsentManager', `Failed to record consent for ${consentType}`, error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      consentType: data.consent_type as ConsentType,
      version: data.version,
      isGranted: data.is_granted,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      consentedAt: data.consented_at,
      withdrawnAt: data.withdrawn_at,
    };
  } catch (err) {
    logger.error('ConsentManager', 'Unexpected error recording consent', err);
    return null;
  }
}

/**
 * Fetches all consent audit records for a given doctor or clinic user
 */
export async function getUserConsents(userId: string): Promise<ConsentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('consented_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    interface ConsentDbRow {
      id: string;
      user_id: string;
      consent_type: string;
      version: string;
      is_granted: boolean;
      ip_address: string | null;
      user_agent: string | null;
      consented_at: string;
      withdrawn_at: string | null;
    }

    return (data as ConsentDbRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type as ConsentType,
      version: row.version,
      isGranted: row.is_granted,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      consentedAt: row.consented_at,
      withdrawnAt: row.withdrawn_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Checks if a specific consent type is active and granted
 */
export function hasActiveConsent(consents: ConsentRecord[], consentType: ConsentType): boolean {
  const matches = consents
    .filter((c) => c.consentType === consentType)
    .sort((a, b) => new Date(b.consentedAt).getTime() - new Date(a.consentedAt).getTime());

  if (matches.length === 0) return false;
  const latest = matches[0];
  return latest.isGranted && !latest.withdrawnAt;
}

/**
 * Records a withdrawal/revocation of consent
 */
export async function withdrawConsent(
  userId: string,
  consentType: ConsentType
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('consent_records')
      .update({
        is_granted: false,
        withdrawn_at: now,
      })
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .is('withdrawn_at', null);

    if (error) {
      logger.error('ConsentManager', `Failed to withdraw consent for ${consentType}`, error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
