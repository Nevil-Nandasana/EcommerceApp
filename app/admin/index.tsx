/**
 * Speqtus Medical Ordering Platform — Admin Back Office Dashboard
 * Governed by PRD FR-9, FR-10, FR-11, FR-13, and tasks T4.1.2, T4.2.1, T4.2.2, T4.2.4.
 * Features:
 *  1. Pending Doctor Approvals Queue (FR-9)
 *  2. Order Management with State Machine transitions & Inline Line Item Pricing (FR-10, T4.2.2)
 *  3. Product Catalog & Variant Pricing Management with Active Toggle (FR-11, T4.2.4)
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { OrderStatus, UserProfile } from '@/types';
import { colors } from '@/constants/colors';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { logger } from '@/lib/logger';

interface AdminOrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitPrice: number | null;
  artNo: string;
  sizeLabel: string;
  productName: string;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number | null;
  createdAt: string;
  doctorName: string;
  hospitalName: string;
  phone: string;
  notes: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  invoiceUrl?: string | null;
  items: AdminOrderItem[];
}

interface AdminProductVariant {
  id: string;
  productId: string;
  productName: string;
  artNo: string;
  sizeLabel: string;
  price: number | null;
  isActive: boolean;
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'approvals' | 'orders' | 'products' | 'directory'>('approvals');

  // Approvals & Directory state
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [pendingDoctors, setPendingDoctors] = useState<UserProfile[]>([]);
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<string>('all');

  // Orders state
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingItemPrice, setEditingItemPrice] = useState<{ [itemId: string]: string }>({});

  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null);
  const [courierName, setCourierName] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [attachingInvoiceOrderId, setAttachingInvoiceOrderId] = useState<string | null>(null);
  const [invoiceUrlInput, setInvoiceUrlInput] = useState<string>('');

  // Products state
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [editingVariantPrice, setEditingVariantPrice] = useState<{ [variantId: string]: string }>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      // 1. Fetch all doctors
      const { data: doctorsData, error: docError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'doctor')
        .order('created_at', { ascending: false });

      if (docError) {
        logger.error('AdminDashboard', 'Failed to fetch doctors', docError);
      } else if (doctorsData) {
        const mappedDoctors = doctorsData.map((d: any) => ({
            id: d.id,
            role: d.role,
            fullName: d.full_name,
            phone: d.phone,
            email: d.email,
            hospitalOrClinicName: d.hospital_or_clinic_name,
            medicalRegistrationNumber: d.medical_registration_number,
            specialty: d.specialty,
            approvalStatus: d.approval_status,
            approvedBy: d.approved_by,
            approvedAt: d.approved_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }));
        setDoctors(mappedDoctors);
        setPendingDoctors(mappedDoctors.filter((d: any) => d.approvalStatus === 'pending'));
      }

      // 2. Fetch all orders with itemized details
      const { data: ordersData, error: ordError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          subtotal,
          created_at,
          notes,
          courier_name,
          tracking_number,
          invoice_url,
          users (
            full_name,
            hospital_or_clinic_name,
            phone
          ),
          order_items (
            id,
            order_id,
            product_variant_id,
            quantity,
            unit_price_at_order,
            product_variants (
              art_no,
              size_label,
              products ( name )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (ordError) {
        logger.error('AdminDashboard', 'Failed to fetch orders', ordError);
      } else if (ordersData) {
        setOrders(
          ordersData.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number,
            status: o.status,
            subtotal: o.subtotal,
            createdAt: o.created_at,
            doctorName: o.users?.full_name || 'Doctor',
            hospitalName: o.users?.hospital_or_clinic_name || 'Clinic',
            phone: o.users?.phone || '',
            notes: o.notes,
            courierName: o.courier_name,
            trackingNumber: o.tracking_number,
            invoiceUrl: o.invoice_url,
            items: (o.order_items || []).map((oi: any) => ({
              id: oi.id,
              orderId: oi.order_id,
              variantId: oi.product_variant_id,
              quantity: oi.quantity,
              unitPrice: oi.unit_price_at_order,
              artNo: oi.product_variants?.art_no || '',
              sizeLabel: oi.product_variants?.size_label || '',
              productName: oi.product_variants?.products?.name || 'Instrument',
            })),
          }))
        );
      }

      // 3. Fetch products and variants for pricing management
      const { data: varData, error: varError } = await supabase
        .from('product_variants')
        .select(`
          id,
          product_id,
          art_no,
          size_label,
          price,
          is_active,
          products ( name )
        `)
        .order('art_no', { ascending: true })
        .limit(100);

      if (varError) {
        logger.error('AdminDashboard', 'Failed to fetch variants', varError);
      } else if (varData) {
        setVariants(
          varData.map((v: any) => ({
            id: v.id,
            productId: v.product_id,
            productName: v.products?.name || 'Surgical Instrument',
            artNo: v.art_no,
            sizeLabel: v.size_label,
            price: v.price,
            isActive: v.is_active,
          }))
        );
      }
    } catch (err) {
      logger.error('AdminDashboard', 'Error fetching admin data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateDoctorApproval = async (doctorId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          approval_status: status,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', doctorId);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', `Doctor account marked as ${status}.`);
      setDoctors((prev) => prev.map((d) => (d.id === doctorId ? { ...d, approvalStatus: status } : d)));
      setPendingDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    } catch (err) {
      logger.error('AdminDashboard', 'Update doctor failed', err);
    }
  };

  // State machine guarded transitions (FR-10, FR-13)
  const handleTransitionOrderStatus = async (orderId: string, nextStatus: OrderStatus, courierPayload?: any) => {
    try {
      const updatePayload: any = { status: nextStatus };
      if (nextStatus === 'dispatched' && courierPayload) {
        updatePayload.courier_name = courierPayload.courierName;
        updatePayload.tracking_number = courierPayload.trackingNumber;
      }

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) {
        Alert.alert('Transition Error', error.message);
        return;
      }

      Alert.alert('Status Updated', `Order transitioned to ${nextStatus}.`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      if (nextStatus === 'dispatched') {
        setDispatchingOrderId(null);
        setCourierName('');
        setTrackingNumber('');
      }
    } catch (err) {
      logger.error('AdminDashboard', 'Update status failed', err);
    }
  };

  const handleDispatchOrder = (orderId: string) => {
    if (!courierName.trim() || !trackingNumber.trim()) {
      Alert.alert('Validation Error', 'Please provide both courier name and tracking number.');
      return;
    }
    handleTransitionOrderStatus(orderId, 'dispatched', { courierName, trackingNumber });
  };

  const handleSaveInvoiceUrl = async (orderId: string) => {
    if (!invoiceUrlInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid invoice URL or PDF link.');
      return;
    }
    try {
      const { error } = await supabase
        .from('orders')
        .update({ invoice_url: invoiceUrlInput.trim() })
        .eq('id', orderId);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Invoice URL attached to order.');
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, invoiceUrl: invoiceUrlInput.trim() } : o))
      );
      setAttachingInvoiceOrderId(null);
      setInvoiceUrlInput('');
    } catch (err: any) {
      logger.error('AdminDashboard', 'Save invoice URL failed', err);
    }
  };

  // Inline Line Item Price Editor for requested orders (FR-10, T4.2.2)
  const handleSaveItemPrice = async (orderId: string, itemId: string) => {
    const rawVal = editingItemPrice[itemId];
    if (rawVal === undefined || rawVal === '') return;

    const numVal = parseFloat(rawVal);
    if (isNaN(numVal) || numVal < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid non-negative number.');
      return;
    }

    try {
      const { error } = await supabase
        .from('order_items')
        .update({ unit_price_at_order: numVal })
        .eq('id', itemId);

      if (error) {
        Alert.alert('Pricing Error', error.message);
        return;
      }

      Alert.alert('Price Saved', `Unit price updated to ₹${numVal}. Order subtotal recalculated.`);
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id !== orderId) return ord;
          const updatedItems = ord.items.map((it) =>
            it.id === itemId ? { ...it, unitPrice: numVal } : it
          );
          // Check if all items priced
          const allPriced = updatedItems.every((it) => it.unitPrice !== null);
          const newSubtotal = allPriced
            ? updatedItems.reduce((acc, it) => acc + (it.unitPrice || 0) * it.quantity, 0)
            : null;
          return {
            ...ord,
            items: updatedItems,
            subtotal: newSubtotal,
          };
        })
      );
    } catch (err) {
      logger.error('AdminDashboard', 'Save line item price failed', err);
    }
  };

  // Variant Price Editor (FR-11, T4.2.4)
  const handleSaveVariantPrice = async (variantId: string) => {
    const rawVal = editingVariantPrice[variantId];
    if (rawVal === undefined || rawVal === '') return;

    const numVal = parseFloat(rawVal);
    if (isNaN(numVal) || numVal < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ price: numVal })
        .eq('id', variantId);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', `Catalog price set to ₹${numVal}.`);
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, price: numVal } : v))
      );
    } catch (err) {
      logger.error('AdminDashboard', 'Save variant price failed', err);
    }
  };

  // Toggle variant active state (FR-11, T4.2.4)
  const handleToggleVariantActive = async (variantId: string, currentActive: boolean) => {
    try {
      const nextActive = !currentActive;
      const { error } = await supabase
        .from('product_variants')
        .update({ is_active: nextActive })
        .eq('id', variantId);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, isActive: nextActive } : v))
      );
    } catch (err) {
      logger.error('AdminDashboard', 'Toggle variant active failed', err);
    }
  };

  // Filtered orders list (FR-10 search & status filter)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.doctorName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.hospitalName.toLowerCase().includes(orderSearch.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, statusFilter]);

  const handleExportOrdersToCSV = () => {
    if (filteredOrders.length === 0) {
      Alert.alert('No Orders', 'There are no orders matching the current filter to export.');
      return;
    }

    const headers = [
      'Order Number',
      'Date',
      'Doctor Name',
      'Hospital/Clinic',
      'Phone',
      'Status',
      'Item Count',
      'Subtotal (INR)',
      'Courier Name',
      'Tracking Number',
      'Invoice URL',
      'Order Notes',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${new Date(o.createdAt).toLocaleDateString('en-IN')}"`,
      `"${o.doctorName.replace(/"/g, '""')}"`,
      `"${o.hospitalName.replace(/"/g, '""')}"`,
      `"${o.phone}"`,
      `"${o.status}"`,
      o.items.length,
      o.subtotal !== null ? o.subtotal : 'Unpriced',
      `"${(o.courierName || '').replace(/"/g, '""')}"`,
      `"${(o.trackingNumber || '').replace(/"/g, '""')}"`,
      `"${(o.invoiceUrl || '').replace(/"/g, '""')}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `speqtus_orders_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      Alert.alert(
        'Export Generated',
        `Generated CSV for ${filteredOrders.length} orders. On web, file downloads directly.`
      );
    }
  };

  // Filtered directory list
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const search = directorySearch.toLowerCase();
      const matchesSearch =
        (d.fullName || '').toLowerCase().includes(search) ||
        (d.hospitalOrClinicName || '').toLowerCase().includes(search) ||
        (d.phone || '').toLowerCase().includes(search) ||
        (d.medicalRegistrationNumber || '').toLowerCase().includes(search);

      const matchesStatus =
        directoryStatusFilter === 'all' || d.approvalStatus === directoryStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [doctors, directorySearch, directoryStatusFilter]);

  // Filtered variants list (FR-11)
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      return (
        v.artNo.toLowerCase().includes(productSearch.toLowerCase()) ||
        v.productName.toLowerCase().includes(productSearch.toLowerCase())
      );
    });
  }, [variants, productSearch]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 3-Tab Header */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'approvals' && styles.tabItemActive]}
          onPress={() => setActiveTab('approvals')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'approvals' && styles.tabTextActive,
            ]}
          >
            Approvals ({pendingDoctors.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'orders' && styles.tabTextActive,
            ]}
          >
            Orders ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}
          onPress={() => setActiveTab('products')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'products' && styles.tabTextActive,
            ]}
          >
            Prices & Catalog
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'directory' && styles.tabItemActive]}
          onPress={() => setActiveTab('directory')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'directory' && styles.tabTextActive,
            ]}
          >
            Directory
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: Pending Doctor Approvals */}
      {activeTab === 'approvals' && (
        <FlatList
          data={pendingDoctors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchData();
              }}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.doctorCard}>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{item.fullName}</Text>
                <Text style={styles.doctorDetail}>{item.hospitalOrClinicName}</Text>
                <Text style={styles.doctorPhone}>📞 +91 {item.phone}</Text>
                {item.medicalRegistrationNumber ? (
                  <Text style={styles.doctorReg}>Reg No: {item.medicalRegistrationNumber}</Text>
                ) : null}
                {item.specialty ? (
                  <Text style={styles.doctorSpecialty}>Specialty: {item.specialty}</Text>
                ) : null}
              </View>

              <View style={styles.approvalButtons}>
                <Button
                  title="Approve Doctor"
                  onPress={() => handleUpdateDoctorApproval(item.id, 'approved')}
                  variant="secondary"
                  style={styles.actionBtn}
                />
                <Button
                  title="Reject"
                  onPress={() => handleUpdateDoctorApproval(item.id, 'rejected')}
                  variant="danger"
                  style={styles.actionBtn}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending doctor approvals.</Text>
            </View>
          }
        />
      )}

      {/* TAB 2: Orders & State Machine & Line Item Pricing */}
      {activeTab === 'orders' && (
        <View style={{ flex: 1 }}>
          {/* Search & Filter Controls */}
          <View style={styles.filterSection}>
            <TextInput
              style={styles.orderSearchInput}
              placeholder="Search by Doctor, Clinic, or Order # (e.g. SPQ-)"
              value={orderSearch}
              onChangeText={setOrderSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPills}>
              {['all', 'requested', 'confirmed', 'dispatched', 'delivered', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.pill,
                    statusFilter === status && styles.pillActive,
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      statusFilter === status && styles.pillTextActive,
                    ]}
                  >
                    {status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.exportRow}>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleExportOrdersToCSV}
                accessibilityRole="button"
              >
                <Text style={styles.exportBtnText}>📥 Export Orders to CSV ({filteredOrders.length})</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  fetchData();
                }}
              />
            }
            renderItem={({ item }) => {
              const isExpanded = expandedOrderId === item.id;
              return (
                <View style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                      <Text style={styles.doctorName}>{item.doctorName}</Text>
                      <Text style={styles.doctorDetail}>{item.hospitalName}</Text>
                      <Text style={styles.doctorPhone}>📞 +91 {item.phone}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <StatusBadge status={item.status} type="order" />
                      <Text style={styles.orderTotalText}>
                        {item.subtotal !== null ? `₹${item.subtotal.toLocaleString('en-IN')}` : 'Quote Pending'}
                      </Text>
                    </View>
                  </View>

                  {item.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>Note: {item.notes}</Text>
                    </View>
                  )}

                  {/* Expand / Collapse Line Items (T4.2.2) */}
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setExpandedOrderId(isExpanded ? null : item.id)}
                  >
                    <Text style={styles.expandButtonText}>
                      {isExpanded ? 'Hide Items ▲' : `View & Price ${item.items.length} Items ▼`}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Item List with Inline Pricing */}
                  {isExpanded && (
                    <View style={styles.itemsContainer}>
                      <Text style={styles.itemsHeading}>Line Items ({item.items.length})</Text>
                      {item.items.map((it) => (
                        <View key={it.id} style={styles.itemRow}>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.itemName}>{it.productName}</Text>
                            <Text style={styles.itemArtNo}>{it.artNo} ({it.sizeLabel})</Text>
                            <Text style={styles.itemQty}>Qty: {it.quantity}</Text>
                          </View>
                          <View style={{ flex: 2, alignItems: 'flex-end' }}>
                            {item.status === 'requested' ? (
                              <View style={styles.priceEditRow}>
                                <Text style={styles.rupeeSign}>₹</Text>
                                <TextInput
                                  style={styles.priceInput}
                                  placeholder={it.unitPrice !== null ? String(it.unitPrice) : 'Set price'}
                                  keyboardType="numeric"
                                  value={editingItemPrice[it.id] ?? (it.unitPrice !== null ? String(it.unitPrice) : '')}
                                  onChangeText={(txt) =>
                                    setEditingItemPrice((prev) => ({ ...prev, [it.id]: txt }))
                                  }
                                />
                                <TouchableOpacity
                                  style={styles.priceSaveBtn}
                                  onPress={() => handleSaveItemPrice(item.id, it.id)}
                                >
                                  <Text style={styles.priceSaveText}>Save</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <Text style={styles.lockedPriceText}>
                                {it.unitPrice !== null ? `₹${it.unitPrice} / unit` : 'Unpriced'}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* State Machine Transition Action Bar (FR-10, FR-13 strictly enforced) */}
                  <View style={styles.statusBar}>
                    {item.status === 'requested' && (
                      <View style={styles.actionsRow}>
                        <Button
                          title="Confirm Order"
                          onPress={() => handleTransitionOrderStatus(item.id, 'confirmed')}
                          variant="secondary"
                          style={styles.stateBtn}
                        />
                        <Button
                          title="Cancel"
                          onPress={() => handleTransitionOrderStatus(item.id, 'cancelled')}
                          variant="danger"
                          style={styles.stateBtn}
                        />
                      </View>
                    )}
                    {item.status === 'confirmed' && (
                      <View style={styles.actionsCol}>
                        {dispatchingOrderId === item.id ? (
                          <View style={styles.dispatchForm}>
                            <Text style={styles.dispatchTitle}>Courier Information</Text>
                            <TextInput
                              style={styles.dispatchInput}
                              placeholder="Courier Name (e.g. Blue Dart)"
                              value={courierName}
                              onChangeText={setCourierName}
                            />
                            <TextInput
                              style={styles.dispatchInput}
                              placeholder="Tracking Number / AWB"
                              value={trackingNumber}
                              onChangeText={setTrackingNumber}
                            />
                            <View style={styles.actionsRow}>
                              <Button
                                title="Confirm Dispatch"
                                onPress={() => handleDispatchOrder(item.id)}
                                variant="primary"
                                style={styles.stateBtn}
                              />
                              <Button
                                title="Cancel"
                                onPress={() => setDispatchingOrderId(null)}
                                variant="outline"
                                style={styles.stateBtn}
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.actionsRow}>
                            <Button
                              title="Dispatch"
                              onPress={() => {
                                setDispatchingOrderId(item.id);
                                setCourierName('');
                                setTrackingNumber('');
                              }}
                              variant="primary"
                              style={styles.stateBtn}
                            />
                            <Button
                              title="Cancel Order"
                              onPress={() => handleTransitionOrderStatus(item.id, 'cancelled')}
                              variant="danger"
                              style={styles.stateBtn}
                            />
                          </View>
                        )}
                      </View>
                    )}
                    {item.status === 'dispatched' && (
                      <View style={styles.actionsRow}>
                        <Button
                          title="Mark Delivered"
                          onPress={() => handleTransitionOrderStatus(item.id, 'delivered')}
                          variant="secondary"
                          style={styles.stateBtn}
                        />
                      </View>
                    )}
                  </View>

                  {/* Tax Invoice Management (T5.F.10) */}
                  <View style={styles.invoiceSection}>
                    {item.invoiceUrl ? (
                      <View style={styles.invoiceRow}>
                        <Text style={styles.invoiceAttachedText}>📄 Tax Invoice Attached</Text>
                        <TouchableOpacity onPress={() => Linking.openURL(item.invoiceUrl!)}>
                          <Text style={styles.invoiceLinkText}>View PDF ↗</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setAttachingInvoiceOrderId(attachingInvoiceOrderId === item.id ? null : item.id);
                            setInvoiceUrlInput(item.invoiceUrl || '');
                          }}
                        >
                          <Text style={styles.invoiceEditText}>Edit Link</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.attachInvoiceBtn}
                        onPress={() => {
                          setAttachingInvoiceOrderId(attachingInvoiceOrderId === item.id ? null : item.id);
                          setInvoiceUrlInput('');
                        }}
                      >
                        <Text style={styles.attachInvoiceBtnText}>+ Attach GST Invoice PDF</Text>
                      </TouchableOpacity>
                    )}

                    {attachingInvoiceOrderId === item.id && (
                      <View style={styles.invoiceInputContainer}>
                        <TextInput
                          style={styles.dispatchInput}
                          placeholder="Paste PDF Invoice URL (e.g. https://...)"
                          value={invoiceUrlInput}
                          onChangeText={setInvoiceUrlInput}
                          autoCapitalize="none"
                        />
                        <View style={styles.actionsRow}>
                          <Button
                            title="Save Invoice URL"
                            onPress={() => handleSaveInvoiceUrl(item.id)}
                            variant="primary"
                            style={styles.stateBtn}
                          />
                          <Button
                            title="Cancel"
                            onPress={() => setAttachingInvoiceOrderId(null)}
                            variant="outline"
                            style={styles.stateBtn}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matching customer orders.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* TAB 3: Product Catalog & Variant Pricing Management (FR-11, T4.2.4) */}
      {activeTab === 'products' && (
        <View style={{ flex: 1 }}>
          <View style={styles.filterSection}>
            <TextInput
              style={styles.orderSearchInput}
              placeholder="Search catalog by Art No or Instrument Name"
              value={productSearch}
              onChangeText={setProductSearch}
            />
          </View>

          <FlatList
            data={filteredVariants}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.variantCard}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  <Text style={styles.artNoBold}>Art No: {item.artNo}</Text>
                  <Text style={styles.itemDetailText}>{item.sizeLabel}</Text>
                </View>

                <View style={styles.variantRightCol}>
                  <View style={styles.priceEditRow}>
                    <Text style={styles.rupeeSign}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder={item.price !== null ? String(item.price) : 'Set price'}
                      keyboardType="numeric"
                      value={editingVariantPrice[item.id] ?? (item.price !== null ? String(item.price) : '')}
                      onChangeText={(txt) =>
                        setEditingVariantPrice((prev) => ({ ...prev, [item.id]: txt }))
                      }
                    />
                    <TouchableOpacity
                      style={styles.priceSaveBtn}
                      onPress={() => handleSaveVariantPrice(item.id)}
                    >
                      <Text style={styles.priceSaveText}>Save</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.toggleActiveBtn,
                      item.isActive ? styles.toggleActive : styles.toggleInactive,
                    ]}
                    onPress={() => handleToggleVariantActive(item.id, item.isActive)}
                  >
                    <Text style={styles.toggleActiveText}>
                      {item.isActive ? 'Active in App' : 'Hidden / Inactive'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matching catalog variants found.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* TAB 4: Doctor Directory */}
      {activeTab === 'directory' && (
        <View style={{ flex: 1 }}>
          <View style={styles.filterSection}>
            <TextInput
              style={styles.orderSearchInput}
              placeholder="Search by Name, Hospital, Phone, Reg No"
              value={directorySearch}
              onChangeText={setDirectorySearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPills}>
              {['all', 'approved', 'pending', 'rejected'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.pill,
                    directoryStatusFilter === status && styles.pillActive,
                  ]}
                  onPress={() => setDirectoryStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      directoryStatusFilter === status && styles.pillTextActive,
                    ]}
                  >
                    {status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredDoctors}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  fetchData();
                }}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.doctorCard}>
                <View style={styles.orderTopRow}>
                  <Text style={styles.doctorName}>{item.fullName}</Text>
                  <StatusBadge status={item.approvalStatus || 'pending'} type="approval" />
                </View>
                <Text style={styles.doctorDetail}>{item.hospitalOrClinicName}</Text>
                <Text style={styles.doctorPhone}>📞 +91 {item.phone}</Text>
                {item.medicalRegistrationNumber ? (
                  <Text style={styles.doctorReg}>Reg No: {item.medicalRegistrationNumber}</Text>
                ) : null}
                {item.specialty ? (
                  <Text style={styles.doctorSpecialty}>Specialty: {item.specialty}</Text>
                ) : null}
                <Text style={styles.doctorDetail}>
                  Joined: {new Date(item.createdAt).toLocaleDateString('en-IN')}
                </Text>

                <View style={styles.approvalButtons}>
                  <Button
                    title="Approve"
                    onPress={() => {
                      Alert.alert('Confirm Approve', 'Are you sure you want to approve this doctor?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Approve', onPress: () => handleUpdateDoctorApproval(item.id, 'approved') },
                      ]);
                    }}
                    variant="secondary"
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Reject/Suspend"
                    onPress={() => {
                      Alert.alert('Confirm Reject', 'Are you sure you want to reject/suspend this doctor?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reject', onPress: () => handleUpdateDoctorApproval(item.id, 'rejected'), style: 'destructive' },
                      ]);
                    }}
                    variant="danger"
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matching doctors found.</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  filterSection: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderSearchInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
  },
  filterPills: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    marginRight: spacing.xs,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textOnPrimary,
  },
  listContent: {
    padding: spacing.base,
  },
  doctorCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  doctorInfo: {
    marginBottom: spacing.md,
  },
  doctorName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  doctorDetail: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doctorPhone: {
    fontSize: typography.fontSizes.xs,
    color: colors.textPrimary,
    marginTop: 4,
  },
  doctorReg: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  doctorSpecialty: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    marginTop: 2,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
  },
  orderCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  orderTotalText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
    marginTop: 4,
  },
  notesBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.sm,
  },
  notesText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  expandButton: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  expandButtonText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  itemsContainer: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  itemsHeading: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  itemArtNo: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  itemQty: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  priceEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeeSign: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginRight: 2,
  },
  priceInput: {
    width: 65,
    height: 30,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
  },
  priceSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginLeft: 4,
  },
  priceSaveText: {
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  lockedPriceText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  statusBar: {
    marginTop: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stateBtn: {
    flex: 1,
    paddingVertical: 8,
  },
  actionsCol: {
    width: '100%',
  },
  dispatchForm: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  dispatchTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dispatchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  variantCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  productName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  artNoBold: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginTop: 2,
  },
  itemDetailText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  variantRightCol: {
    flex: 2,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  toggleActiveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  toggleActive: {
    backgroundColor: '#dcfce7',
  },
  toggleInactive: {
    backgroundColor: '#fee2e2',
  },
  toggleActiveText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  exportRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  exportBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  exportBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  invoiceSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  invoiceAttachedText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: '#059669',
  },
  invoiceLinkText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  invoiceEditText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  attachInvoiceBtn: {
    paddingVertical: 4,
  },
  attachInvoiceBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  invoiceInputContainer: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
});
