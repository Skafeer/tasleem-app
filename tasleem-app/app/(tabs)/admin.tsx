import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useNavigation, DrawerActions } from '@react-navigation/native'; // ✅ استيراد DrawerActions من هنا
import api from '../../src/lib/api';

import ProductsTab    from '../admin-components/ProductsTab';
import OrdersTab      from '../admin-components/OrdersTab';
import WithdrawalsTab from '../admin-components/WithdrawalsTab';
import MerchantsTab   from '../admin-components/MerchantsTab';
import PromosTab      from '../admin-components/PromosTab';
import StatsTab       from '../admin-components/StatsTab';
import NotificationsTab from '../admin-components/NotificationsTab';
import BannersTab     from '../admin-components/BannersTab';
import AdminsTab      from '../admin-components/AdminsTab';
import SupportTab     from '../admin-components/SupportTab';
import CategoriesTab  from '../admin-components/CategoriesTab';
import InventoryTab   from '../admin-components/InventoryTab';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const Drawer = createDrawerNavigator();

// مكون مخصص لقائمة الدراور
function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 20 }}>
      <View style={styles.drawerHeader}>
        <View style={styles.drawerHeaderIcon}>
          <Ionicons name="shield-checkmark" size={28} color={PRIMARY} />
        </View>
        <Text style={styles.drawerHeaderTitle}>لوحة الإدارة</Text>
        <Text style={styles.drawerHeaderSub}>مدير النظام</Text>
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

// مكون زر الهامبرغر
function HamburgerButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.hamburgerBtn}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())} // ✅ يعمل الآن
    >
      <Ionicons name="menu-outline" size={24} color="#111827" />
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/me');
      return data;
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data } = await api.get('/api/orders');
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/api/products');
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users');
      return data;
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: promos = [] } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data } = await api.get('/api/promo-codes');
      return data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  const isSuperAdmin = (user as any)?.is_super_admin || (user as any)?.isSuperAdmin || false;

  let userPermissions: string[] = [];
  try {
    userPermissions = JSON.parse((user as any)?.permissions || '[]');
  } catch {}

  // تعريف شاشات الدراور بناءً على الصلاحيات
  const screens = [
    { name: 'Orders', component: OrdersTab, label: 'الطلبات', icon: 'bag-handle-outline' },
    { name: 'Products', component: ProductsTab, label: 'المنتجات', icon: 'cube-outline' },
    { name: 'Withdrawals', component: WithdrawalsTab, label: 'السحوبات', icon: 'cash-outline' },
    { name: 'Merchants', component: MerchantsTab, label: 'التجار', icon: 'people-outline' },
    { name: 'Promos', component: PromosTab, label: 'الأكواد', icon: 'pricetag-outline' },
    { name: 'Banners', component: BannersTab, label: 'البنرات', icon: 'images-outline' },
    { name: 'Stats', component: StatsTab, label: 'إحصائيات', icon: 'bar-chart-outline' },
    { name: 'Inventory', component: InventoryTab, label: 'المخزون', icon: 'layers-outline' },
    { name: 'Categories', component: CategoriesTab, label: 'الفئات', icon: 'grid-outline' },
    { name: 'Notifications', component: NotificationsTab, label: 'الإشعارات', icon: 'notifications-outline' },
    { name: 'Admins', component: AdminsTab, label: 'الأدمنية', icon: 'shield-half-outline' },
    { name: 'Support', component: SupportTab, label: 'الدعم', icon: 'headset-outline' },
  ];

  const visibleScreens = screens.filter(s => {
    if (s.name === 'Admins') return isSuperAdmin;
    if (s.name === 'Support') return isSuperAdmin || userPermissions.includes('notifications');
    if (isSuperAdmin) return true;
    return userPermissions.includes(s.name.toLowerCase());
  });

  // حساب الأعداد للشاشات
  const merchantCount = (users as any[]).filter((u: any) => u.role !== 'admin').length;
  const pendingWithdrawals = (withdrawals as any[]).filter((w: any) => w.status === 'pending').length;

  const getBadge = (name: string) => {
    if (name === 'Orders') return (orders as any[]).length;
    if (name === 'Products') return (products as any[]).length;
    if (name === 'Withdrawals') return pendingWithdrawals;
    if (name === 'Merchants') return merchantCount;
    if (name === 'Promos') return (promos as any[]).length;
    return 0;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Drawer.Navigator
        initialRouteName="Orders"
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#e8edf2' },
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
          headerTitleAlign: 'center',
          headerRight: () => <HamburgerButton />,
          drawerStyle: {
            width: 280,
            backgroundColor: '#fff',
          },
          drawerActiveTintColor: PRIMARY,
          drawerInactiveTintColor: '#6b7280',
          drawerActiveBackgroundColor: PRIMARY + '12',
          drawerItemStyle: { borderRadius: 12, marginHorizontal: 10 },
          drawerLabelStyle: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        {visibleScreens.map((s) => {
          const badge = getBadge(s.name);
          return (
            <Drawer.Screen
              key={s.name}
              name={s.name}
              component={s.component}
              options={{
                title: s.label,
                drawerIcon: ({ color, size }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={s.icon as any} size={size || 20} color={color} />
                    {badge > 0 && (
                      <View style={[styles.drawerBadge, { backgroundColor: color }]}>
                        <Text style={styles.drawerBadgeText}>{badge}</Text>
                      </View>
                    )}
                  </View>
                ),
              }}
            />
          );
        })}
      </Drawer.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  hamburgerBtn: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
  },
  drawerHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    marginBottom: 10,
  },
  drawerHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  drawerHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  drawerHeaderSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  drawerBadge: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  drawerBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});