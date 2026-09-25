/**
 * Speqtus Medical Ordering Platform — Profile & Settings Screen (T3.4.6, F-18, F-19)
 * Shows doctor verification details, support contacts, and logout.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, profile, signOut, isPending, isAdmin } = useAuth();

  const handleSupportCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleSupportWhatsApp = () => {
    Linking.openURL('https://wa.me/919876543210?text=Hello%20Speqtus%20Medical,%20I%20need%20assistance%20with%20my%20order.');
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.headerTitle}>Doctor Sign In</Text>
        <Text style={styles.headerSubtitle}>
          Sign in to access verified wholesale pricing and place surgical orders.
        </Text>
        <Button
          title="Sign In with Mobile OTP"
          onPress={() => router.push('/(auth)/login')}
          style={{ minWidth: 220 }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'D'}
            </Text>
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.doctorName}>{profile?.fullName || 'Doctor'}</Text>
            <Text style={styles.phoneText}>{profile?.phone}</Text>
            {profile?.approvalStatus && (
              <View style={{ marginTop: spacing.xs }}>
                <StatusBadge status={profile.approvalStatus} type="approval" />
              </View>
            )}
          </View>
        </View>

        {isPending && (
          <View style={styles.pendingAlert}>
            <Text style={styles.pendingAlertText}>
              {strings.auth.pendingApprovalBanner}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Practice & Clinic Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Hospital / Clinic:</Text>
          <Text style={styles.detailValue}>{profile?.hospitalOrClinicName || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Specialty:</Text>
          <Text style={styles.detailValue}>{profile?.specialty || 'General Surgery'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reg. Number:</Text>
          <Text style={styles.detailValue}>{profile?.medicalRegistrationNumber || '—'}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Speqtus Medical Direct Support</Text>
        <TouchableOpacity style={styles.supportRow} onPress={handleSupportCall}>
          <Text style={styles.supportIcon}>📞</Text>
          <View style={styles.supportCol}>
            <Text style={styles.supportTitle}>Call Customer Support</Text>
            <Text style={styles.supportSubtitle}>+91 98765 43210 (Mon-Sat 9am-7pm)</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportRow} onPress={handleSupportWhatsApp}>
          <Text style={styles.supportIcon}>💬</Text>
          <View style={styles.supportCol}>
            <Text style={styles.supportTitle}>WhatsApp Direct Support</Text>
            <Text style={styles.supportSubtitle}>Chat directly with Speqtus ordering team</Text>
          </View>
        </TouchableOpacity>
      </View>

      {isAdmin && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Admin & Back Office</Text>
          <Text style={styles.adminDesc}>
            Manage pending doctor verifications, view customer orders, and transition fulfillment statuses.
          </Text>
          <Button
            title="Open Speqtus Back Office"
            onPress={() => router.push('/admin')}
            variant="secondary"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      )}

      <View style={styles.actionSection}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  profileCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textOnPrimary,
  },
  nameCol: {
    flex: 1,
  },
  doctorName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  phoneText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pendingAlert: {
    backgroundColor: colors.pendingBannerBg,
    borderColor: colors.pendingBannerBorder,
    borderWidth: 1,
    borderRadius: borderRadius.base,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  pendingAlertText: {
    fontSize: typography.fontSizes.xs,
    color: colors.pendingBannerText,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  sectionHeader: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  supportIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  supportCol: {
    flex: 1,
  },
  supportTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  supportSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  actionSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  signOutBtn: {
    borderColor: colors.error,
  },
});
