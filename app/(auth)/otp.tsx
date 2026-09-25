/**
 * Speqtus Medical Ordering Platform — OTP Verification Screen (FR-4, T3.1.3)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, sendOtp, profile } = useAuth();
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleVerify = async () => {
    if (token.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: verifyError } = await verifyOtp(phone || '', token.trim());
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    // Check if doctor profile already completed
    if (profile && profile.fullName) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/profile-completion');
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    setResendStatus('Sending new code...');
    const { error: resendError } = await sendOtp(phone);
    if (resendError) {
      setResendStatus(`Failed: ${resendError.message}`);
    } else {
      setResendStatus('Code resent successfully!');
      setTimeout(() => setResendStatus(null), 3000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{strings.auth.otpTitle}</Text>
          <Text style={styles.subtitle}>
            {strings.auth.otpSubtitle} +91 {phone}
          </Text>
        </View>

        <View style={styles.card}>
          <Input
            label="Verification Code (OTP)"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={token}
            onChangeText={(text) => {
              setToken(text);
              if (error) setError(null);
            }}
            error={error}
            style={styles.otpInput}
          />

          <Button
            title={strings.auth.verifyOtp}
            onPress={handleVerify}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.resendRow}>
            <TouchableOpacity onPress={handleResend} accessibilityRole="button">
              <Text style={styles.resendText}>{strings.auth.resendOtp}</Text>
            </TouchableOpacity>
            {resendStatus && <Text style={styles.resendStatus}>{resendStatus}</Text>}
          </View>
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
    padding: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    color: colors.accent,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  resendStatus: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
