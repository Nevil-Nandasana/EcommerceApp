/**
 * Speqtus Medical Ordering Platform — Doctor Profile Completion Screen (FR-4a, T3.1.5)
 * Captures practitioner credentials, clinic affiliation, and T&C consent.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';

export default function ProfileCompletionScreen() {
  const router = useRouter();
  const { completeProfile } = useAuth();
  const [fullName, setFullName] = useState<string>('');
  const [hospitalName, setHospitalName] = useState<string>('');
  const [regNo, setRegNo] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('General Surgery');
  const [line1, setLine1] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const stateName = 'Gujarat';
  const [pincode, setPincode] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!hospitalName.trim()) {
      setError('Please enter your clinic or hospital practice name');
      return;
    }
    if (!line1.trim() || !city.trim() || !pincode.trim()) {
      setError('Please enter a complete delivery address (address, city, pincode)');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the ordering terms to proceed');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: profileError } = await completeProfile({
      fullName: fullName.trim(),
      hospitalOrClinicName: hospitalName.trim(),
      medicalRegistrationNumber: regNo.trim() || undefined,
      specialty: specialty.trim() || undefined,
      address: {
        line1: line1.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
      },
    });
    setLoading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{strings.auth.profileTitle}</Text>
          <Text style={styles.subtitle}>{strings.auth.profileSubtitle}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>Doctor & Practice</Text>
          <Input
            label={strings.auth.fullNameLabel}
            placeholder="e.g. Dr. Rajesh Patel"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (error) setError(null);
            }}
          />

          <Input
            label={strings.auth.hospitalLabel}
            placeholder="e.g. Patel Surgical Hospital & Clinic"
            value={hospitalName}
            onChangeText={(text) => {
              setHospitalName(text);
              if (error) setError(null);
            }}
          />

          <Input
            label={strings.auth.specialtyLabel}
            placeholder="e.g. Orthopedic, Gynecology, ENT"
            value={specialty}
            onChangeText={setSpecialty}
          />

          <Input
            label={strings.auth.regNoLabel}
            placeholder="e.g. G-12345 (State Medical Council)"
            value={regNo}
            onChangeText={setRegNo}
            helperText="Provides faster verification by the Speqtus owner."
          />

          <Text style={[styles.sectionHeading, { marginTop: spacing.md }]}>Primary Delivery Address</Text>
          <Input
            label="Street Address / OT Location"
            placeholder="e.g. 2nd Floor, Patel Surgical Hospital, Ring Road"
            value={line1}
            onChangeText={(text) => {
              setLine1(text);
              if (error) setError(null);
            }}
          />

          <View style={styles.addressRow}>
            <Input
              label="City"
              placeholder="Ahmedabad"
              value={city}
              onChangeText={(text) => {
                setCity(text);
                if (error) setError(null);
              }}
              containerStyle={{ flex: 1, marginRight: spacing.sm }}
            />
            <Input
              label="Pincode"
              placeholder="380001"
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={(text) => {
                setPincode(text);
                if (error) setError(null);
              }}
              containerStyle={{ flex: 1 }}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreeTerms }}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{strings.auth.termsAgreement}</Text>
          </TouchableOpacity>

          {error && <Text style={styles.formError}>{error}</Text>}

          <Button
            title="Complete Registration"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.normal * typography.fontSizes.xs,
  },
  formError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressRow: {
    flexDirection: 'row',
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
