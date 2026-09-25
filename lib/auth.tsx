/**
 * Speqtus Medical Ordering Platform — Authentication Context & Hook (T3.1.2)
 * Governed by PRD FR-4, FR-4a, FR-5, and Planning/VARIABLE_REGISTRY.md
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, ApprovalStatus } from '@/types';
import { logger } from '@/lib/logger';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  approvalStatus: ApprovalStatus | null;
  isApproved: boolean;
  isPending: boolean;
  isAdmin: boolean;
  sendOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  completeProfile: (details: {
    fullName: string;
    hospitalOrClinicName: string;
    medicalRegistrationNumber?: string;
    specialty?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
  }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('AuthContext', 'Failed to fetch user profile', error);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          role: data.role,
          fullName: data.full_name,
          phone: data.phone,
          email: data.email,
          hospitalOrClinicName: data.hospital_or_clinic_name,
          medicalRegistrationNumber: data.medical_registration_number,
          specialty: data.specialty,
          approvalStatus: data.approval_status,
          approvedBy: data.approved_by,
          approvedAt: data.approved_at,
          pushToken: data.push_token ?? null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        setProfile(null);
      }
    } catch (err) {
      logger.error('AuthContext', 'Unexpected error fetching profile', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const sendOtp = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to send OTP') };
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      const { error, data } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token,
        type: 'sms',
      });
      if (error) return { error: new Error(error.message) };
      if (data.session) {
        setSession(data.session);
        await fetchProfile(data.session.user.id);
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Verification failed') };
    }
  };

  const completeProfile = async (details: {
    fullName: string;
    hospitalOrClinicName: string;
    medicalRegistrationNumber?: string;
    specialty?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
  }) => {
    if (!session?.user) return { error: new Error('No authenticated session') };
    try {
      const { error } = await supabase.from('users').upsert({
        id: session.user.id,
        role: 'doctor',
        phone: session.user.phone || '',
        full_name: details.fullName,
        hospital_or_clinic_name: details.hospitalOrClinicName,
        medical_registration_number: details.medicalRegistrationNumber || null,
        specialty: details.specialty || null,
        approval_status: 'pending',
      });
      if (error) return { error: new Error(error.message) };

      // PRD FR-4a: At least one delivery address is mandatory and saved
      if (details.address && details.address.line1) {
        await supabase.from('addresses').insert({
          user_id: session.user.id,
          label: details.hospitalOrClinicName || 'Primary Clinic / OT',
          line1: details.address.line1.trim(),
          line2: details.address.line2 ? details.address.line2.trim() : null,
          city: details.address.city.trim(),
          state: details.address.state.trim(),
          pincode: details.address.pincode.trim(),
          is_default: true,
        });
      }

      await fetchProfile(session.user.id);
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Profile update failed') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      isLoading,
      approvalStatus: profile?.approvalStatus || null,
      isApproved: profile?.approvalStatus === 'approved',
      isPending: profile?.approvalStatus === 'pending',
      isAdmin: profile?.role === 'admin',
      sendOtp,
      verifyOtp,
      completeProfile,
      signOut,
      refreshProfile,
    }),
    [session, profile, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
