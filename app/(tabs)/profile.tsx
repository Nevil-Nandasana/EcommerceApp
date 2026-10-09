/**
 * Speqtus Medical Ordering Platform — Profile & Settings Screen (T3.4.6, F-18, F-19)
 * Shows doctor verification details, support contacts, self-serve profile editor (Feature 4), and logout.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { APP_CONFIG } from '@/constants/config';
import { logger } from '@/lib/logger';

const SPECIALTY_OPTIONS = [
  'General Surgery',
  'Orthopedic',
  'Gynecology',
  'ENT',
  'Cardiovascular',
  'Ophthalmology',
  'Neurosurgery',
  'Plastic Surgery',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, user, profile, signOut, isPending, isAdmin, refreshProfile } = useAuth();

  const supportPhone = APP_CONFIG.supportPhone || APP_CONFIG.whatsappPhone;

  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Profile State (Feature 4)
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editHospitalName, setEditHospitalName] = useState('');
  const [editRegNumber, setEditRegNumber] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOpenEditModal = () => {
    setEditFullName(profile?.fullName || '');
    setEditHospitalName(profile?.hospitalOrClinicName || '');
    setEditRegNumber(profile?.medicalRegistrationNumber || '');
    setEditSpecialty(profile?.specialty || '');
    setValidationError(null);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!editFullName.trim()) {
      setValidationError('Full Name is required.');
      return;
    }
    if (!editHospitalName.trim()) {
      setValidationError('Hospital or Clinic Name is required.');
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editFullName.trim(),
          hospital_or_clinic_name: editHospitalName.trim(),
          medical_registration_number: editRegNumber.trim() || null,
          specialty: editSpecialty.trim() || null,
        })
        .eq('id', user.id);

      if (error) {
        logger.error('Profile', 'Failed to update profile', error);
        Alert.alert('Update Failed', error.message || 'Could not update practice details.');
        return;
      }

      await refreshProfile();
      setEditModalVisible(false);
      Alert.alert('Profile Updated', 'Your practice and clinic details have been updated.');
    } catch (err: any) {
      logger.error('Profile', 'Unexpected error updating profile', err);
      Alert.alert('Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSupportCall = () => {
    if (!supportPhone) {
      Alert.alert('Customer Support', 'Customer support phone number is not configured in this environment.');
      return;
    }
    const cleanPhone = supportPhone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch((err) => {
      logger.error('Profile', 'Failed to open phone dialer', err);
      Alert.alert('Cannot Open Dialer', 'Unable to initiate call on this device.');
    });
  };

  const handleSupportWhatsApp = () => {
    const waPhone = APP_CONFIG.whatsappPhone || APP_CONFIG.supportPhone;
    if (!waPhone) {
      Alert.alert('Customer Support', 'WhatsApp support number is not configured in this environment.');
      return;
    }
    let cleanWa = waPhone.replace(/[^0-9]/g, '');
    if (cleanWa.length === 10) {
      cleanWa = `91${cleanWa}`;
    } else if (cleanWa.length === 11 && cleanWa.startsWith('0')) {
      cleanWa = `91${cleanWa.slice(1)}`;
    }
    if (!cleanWa) {
      Alert.alert('Customer Support', 'Invalid WhatsApp support phone configuration.');
      return;
    }
    Linking.openURL(
      `https://wa.me/${cleanWa}?text=${encodeURIComponent('Hello Speqtus Medical, I need assistance with my account and orders.')}`
    ).catch((err) => {
      logger.error('Profile', 'Failed to open WhatsApp URL', err);
      Alert.alert('Cannot Open WhatsApp', 'Please ensure WhatsApp is installed on your device.');
    });
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Are you sure?',
      'This will permanently delete your account and all personal data. Your order history will be anonymized for compliance. This cannot be undone.',
      [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const { error } = await supabase.rpc('delete_user_account');
              if (error) throw error;
              await signOut();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
      {/* Profile Card */}
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

      {/* Practice & Clinic Details (Feature 4: Self-Serve Editor) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Practice & Clinic Details</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleOpenEditModal}
            accessibilityRole="button"
            accessibilityLabel="Edit practice details"
          >
            <Text style={styles.editBtnText}>Edit ✏️</Text>
          </TouchableOpacity>
        </View>
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

      {/* Speqtus Direct Support */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Speqtus Medical Direct Support</Text>
        <TouchableOpacity style={styles.supportRow} onPress={handleSupportCall}>
          <Text style={styles.supportIcon}>📞</Text>
          <View style={styles.supportCol}>
            <Text style={styles.supportTitle}>Call Customer Support</Text>
            <Text style={styles.supportSubtitle}>
              {supportPhone ? `${supportPhone} (Mon-Sat 9am-7pm)` : 'Mon-Sat 9am-7pm'}
            </Text>
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

      {/* Admin Back Office Link */}
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

      {/* Actions */}
      <View style={styles.actionSection}>
        <Button
          title="Manage My OT Sets"
          onPress={() => router.push('/saved-sets')}
          variant="secondary"
          style={{ marginBottom: spacing.md }}
        />
        <Button
          title="Delivery Addresses"
          onPress={() => router.push('/addresses')}
          variant="secondary"
          style={{ marginBottom: spacing.md }}
        />
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
        />
        <Button
          title="Delete My Account"
          onPress={handleDeleteAccount}
          variant="outline"
          style={{ borderColor: colors.error, marginTop: spacing.md }}
          textStyle={{ color: colors.error }}
          loading={isDeleting}
        />
      </View>

      {/* Edit Doctor Profile Modal (Feature 4) */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Practice Details</Text>
              <Text style={styles.modalSubtitle}>
                Update your clinic information and surgical specialty.
              </Text>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {validationError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {validationError}</Text>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Full Name / Doctor Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Hospital or Clinic Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editHospitalName}
                  onChangeText={setEditHospitalName}
                  placeholder="e.g. Apollo Hospital OT Complex"
                  placeholderTextColor={colors.textMuted}
                  maxLength={150}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Medical Specialty</Text>
                <TextInput
                  style={styles.textInput}
                  value={editSpecialty}
                  onChangeText={setEditSpecialty}
                  placeholder="e.g. Orthopedic"
                  placeholderTextColor={colors.textMuted}
                  maxLength={60}
                />
                <Text style={styles.fieldHint}>Or pick a common specialty:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.specialtyChipsContainer}
                >
                  {SPECIALTY_OPTIONS.map((spec) => (
                    <TouchableOpacity
                      key={spec}
                      style={[
                        styles.specialtyChip,
                        editSpecialty.toLowerCase() === spec.toLowerCase() &&
                          styles.specialtyChipActive,
                      ]}
                      onPress={() => setEditSpecialty(spec)}
                    >
                      <Text
                        style={[
                          styles.specialtyChipText,
                          editSpecialty.toLowerCase() === spec.toLowerCase() &&
                            styles.specialtyChipTextActive,
                        ]}
                      >
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>State Medical Council Reg. No. (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editRegNumber}
                  onChangeText={setEditRegNumber}
                  placeholder="e.g. G-12345/MCI"
                  placeholderTextColor={colors.textMuted}
                  maxLength={50}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="outline"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Save Changes"
                onPress={handleSaveProfile}
                variant="primary"
                style={{ flex: 1 }}
                loading={isSaving}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  editBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '85%',
    padding: spacing.lg,
  },
  modalHeader: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBody: {
    maxHeight: 380,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.fontSizes.xs,
    color: colors.error,
    fontWeight: typography.fontWeights.semibold,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  specialtyChipsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  specialtyChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  specialtyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  specialtyChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  specialtyChipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: typography.fontWeights.bold,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
