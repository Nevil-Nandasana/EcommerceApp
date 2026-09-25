/**
 * Speqtus Medical Ordering Platform — Bottom Tab Layout
 * 5 main tabs: Categories, Search, Cart, Orders, Profile
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/constants/colors';
import { useCartStore } from '@/lib/cart';
import { Text } from 'react-native';

export default function TabLayout() {
  const totalCartItems = useCartStore((state) => state.getTotalItems());

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textOnPrimary,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catalog',
          tabBarLabel: 'Catalog',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📋</Text>,
          headerTitle: 'Speqtus Medical Catalog',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔍</Text>,
          headerTitle: 'Search Instruments',
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarLabel: 'Cart',
          tabBarBadge: totalCartItems > 0 ? totalCartItems : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent },
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🛒</Text>,
          headerTitle: 'Order Request Cart',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📦</Text>,
          headerTitle: 'My Past Orders',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
          headerTitle: 'Doctor Account',
        }}
      />
    </Tabs>
  );
}
