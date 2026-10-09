import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Address } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { logger } from '@/lib/logger';

export default function AddressesScreen() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null); // null means no form, 'new' means new address, id means editing that address
  
  // Form State
  const [label, setLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Gujarat');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user?.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Addresses', 'Fetch failed', error);
      Alert.alert('Error', 'Failed to load addresses');
    } else if (data) {
      setAddresses(
        data.map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          label: a.label,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          phoneOverride: a.phone_override,
          isDefault: a.is_default,
          createdAt: a.created_at,
        }))
      );
    }
    setIsLoading(false);
  };

  const handleAddNew = () => {
    setLabel('');
    setLine1('');
    setLine2('');
    setCity('');
    setStateName('Gujarat');
    setPincode('');
    setIsDefault(addresses.length === 0); // default if first one
    setIsEditing('new');
  };

  const handleEdit = (addr: Address) => {
    setLabel(addr.label);
    setLine1(addr.line1);
    setLine2(addr.line2 || '');
    setCity(addr.city);
    setStateName(addr.state);
    setPincode(addr.pincode);
    setIsDefault(addr.isDefault);
    setIsEditing(addr.id);
  };

  const handleSave = async () => {
    if (!label.trim() || !line1.trim() || !city.trim() || !pincode.trim() || !stateName.trim()) {
      Alert.alert('Required Fields', 'Please fill in all required fields (Label, Line 1, City, State, Pincode).');
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      user_id: user?.id,
      label: label.trim(),
      line1: line1.trim(),
      line2: line2.trim() || null,
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      is_default: isDefault,
    };

    try {
      if (isDefault) {
        // Unset other defaults
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user?.id);
      }

      if (isEditing === 'new') {
        const { error } = await supabase.from('addresses').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('addresses').update(payload).eq('id', isEditing);
        if (error) throw error;
      }

      setIsEditing(null);
      await fetchAddresses();
    } catch (err: any) {
      logger.error('Addresses', 'Save failed', err);
      Alert.alert('Error', err.message || 'Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('addresses').delete().eq('id', id);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            fetchAddresses();
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user?.id);
      await supabase.from('addresses').update({ is_default: true }).eq('id', id);
      fetchAddresses();
    } catch (err) {
      logger.error('Addresses', 'Set default failed', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isEditing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isEditing === 'new' ? 'Add New Address' : 'Edit Address'}</Text>
          <Input label="Label (e.g. Clinic, Hospital, Home)" placeholder="Clinic OT" value={label} onChangeText={setLabel} />
          <Input label="Line 1" placeholder="Flat / Building Name / Street" value={line1} onChangeText={setLine1} />
          <Input label="Line 2 (Optional)" placeholder="Area / Landmark" value={line2} onChangeText={setLine2} />
          <View style={styles.row}>
            <Input label="City" placeholder="City" value={city} onChangeText={setCity} containerStyle={styles.flexHalf} />
            <Input label="State" placeholder="State" value={stateName} onChangeText={setStateName} containerStyle={styles.flexHalf} />
          </View>
          <Input label="Pincode" placeholder="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} />
          
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsDefault(!isDefault)}>
            <View style={[styles.checkbox, isDefault && styles.checkboxActive]} />
            <Text style={styles.checkboxLabel}>Set as Default Address</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <Button title="Cancel" onPress={() => setIsEditing(null)} variant="outline" style={styles.flexHalf} />
            <Button title="Save" onPress={handleSave} loading={isSubmitting} style={styles.flexHalf} />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {addresses.map((addr) => (
          <View key={addr.id} style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressLabel}>{addr.label}</Text>
              {addr.isDefault && <Text style={styles.defaultBadge}>DEFAULT</Text>}
            </View>
            <Text style={styles.addressText}>{addr.line1}</Text>
            {addr.line2 ? <Text style={styles.addressText}>{addr.line2}</Text> : null}
            <Text style={styles.addressText}>{addr.city}, {addr.state} - {addr.pincode}</Text>
            
            <View style={styles.cardActions}>
              {!addr.isDefault && (
                <TouchableOpacity onPress={() => handleSetDefault(addr.id)}>
                  <Text style={styles.actionTextBlue}>Set as Default</Text>
                </TouchableOpacity>
              )}
              <View style={styles.cardActionsRight}>
                <TouchableOpacity onPress={() => handleEdit(addr)}>
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(addr.id)}>
                  <Text style={styles.actionTextDanger}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        {addresses.length === 0 && (
          <Text style={styles.emptyText}>You have no saved addresses.</Text>
        )}
        <Button title="Add New Address" onPress={handleAddNew} style={styles.addBtn} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing.xxxl },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surface, padding: spacing.base, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  flexHalf: { flex: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 4, marginRight: spacing.sm },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: typography.fontSizes.sm, color: colors.textPrimary },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  addressCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  addressLabel: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.primary },
  defaultBadge: { fontSize: 10, fontWeight: 'bold', color: colors.primary, backgroundColor: colors.surfaceSubtle, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  addressText: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginBottom: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surfaceSubtle },
  cardActionsRight: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end', flex: 1 },
  actionText: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, fontWeight: '600' },
  actionTextDanger: { fontSize: typography.fontSizes.sm, color: colors.error, fontWeight: '600' },
  actionTextBlue: { fontSize: typography.fontSizes.sm, color: colors.primary, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.xl },
  addBtn: { marginTop: spacing.md },
});
