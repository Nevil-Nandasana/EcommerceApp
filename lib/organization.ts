/**
 * Speqtus Medical Ordering Platform — Hospital Organization & Department Client (PRD Section 2.3 & 10)
 * Governed by PRD Section 10 (Decision #2) and Planning/VARIABLE_REGISTRY.md.
 */

import { supabase } from '@/lib/supabase';
import { Organization, OrganizationMember } from '@/types';
import { logger } from '@/lib/logger';

export interface UserOrganizationContext {
  organization: Organization | null;
  membership: OrganizationMember | null;
}

/**
 * Fetches the user's active hospital organization and departmental membership
 */
export async function fetchUserOrganization(userId: string): Promise<UserOrganizationContext> {
  if (!userId) return { organization: null, membership: null };

  try {
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        user_id,
        member_role,
        department,
        created_at,
        organizations (
          id,
          name,
          gstin,
          billing_address,
          city,
          state,
          pincode,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberData) {
      return { organization: null, membership: null };
    }

    const orgRow = memberData.organizations as any;
    const org: Organization | null = orgRow
      ? {
          id: orgRow.id,
          name: orgRow.name,
          gstin: orgRow.gstin,
          billingAddress: orgRow.billing_address,
          city: orgRow.city,
          state: orgRow.state,
          pincode: orgRow.pincode,
          createdAt: orgRow.created_at,
          updatedAt: orgRow.updated_at,
        }
      : null;

    const membership: OrganizationMember = {
      id: memberData.id,
      organizationId: memberData.organization_id,
      userId: memberData.user_id,
      memberRole: memberData.member_role as any,
      department: memberData.department,
      createdAt: memberData.created_at,
      organization: org || undefined,
    };

    return { organization: org, membership };
  } catch (err) {
    logger.error('Organization', 'Failed to fetch user organization', err);
    return { organization: null, membership: null };
  }
}

/**
 * Creates or attaches a user to a hospital organization
 */
export async function registerHospitalOrganization(
  userId: string,
  hospitalName: string,
  department: string,
  gstin?: string
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  if (!userId || !hospitalName.trim()) {
    return { success: false, error: 'Hospital name is required' };
  }

  try {
    // 1. Create or find organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: hospitalName.trim(),
        gstin: gstin?.trim() || null,
      })
      .select()
      .single();

    if (orgError || !orgData) {
      return { success: false, error: orgError?.message || 'Failed to create organization' };
    }

    // 2. Add user as member with department
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: userId,
        member_role: 'purchaser',
        department: department.trim() || 'General OT',
      });

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    const org: Organization = {
      id: orgData.id,
      name: orgData.name,
      gstin: orgData.gstin,
      billingAddress: orgData.billing_address,
      city: orgData.city,
      state: orgData.state,
      pincode: orgData.pincode,
      createdAt: orgData.created_at,
      updatedAt: orgData.updated_at,
    };

    return { success: true, organization: org };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
