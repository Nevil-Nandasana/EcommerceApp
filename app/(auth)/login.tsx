/**
 * Speqtus Medical Ordering Platform — Phone Login Screen (FR-4, T3.1.3, T3.1.4)
 * Phone number input, OTP request dispatch, and Google OAuth fallback.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp } = useAuth();
  const [phone, setPhone] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: sendError } = await sendOtp(cleanPhone);
    setLoading(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    router.push({
      pathname: '/(auth)/otp',
      params: { phone: cleanPhone },
    });
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      'Google Sign-In',
      'Google OAuth fallback will open system browser for secure authentication.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.appName}>{strings.common.appName}</Text>
          <Text style={styles.tagline}>{strings.common.tagline}</Text>
          <Text style={styles.title}>{strings.auth.phoneTitle}</Text>
          <Text style={styles.subtitle}>{strings.auth.phoneSubtitle}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Mobile Number"
            placeholder={strings.auth.phonePlaceholder}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (error) setError(null);
            }}
            error={error}
            helperText="We will send an SMS OTP for passwordless login."
          />

          <Button
            title={strings.auth.sendOtp}
            onPress={handleSendOtp}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title={strings.auth.googleSignIn}
            onPress={handleGoogleSignIn}
            variant="outline"
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
    padding: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  appName: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  tagline: {
    fontSize: typography.fontSizes.sm,
    color: colors.accent,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semibold,
  },
});
