import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, PanResponder, Dimensions, RefreshControl, FlatList,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const CLOSE_THRESHOLD = DRAWER_WIDTH * 0.2;

const TABS = [
  { key: 'orders',      label: 'الطلبات',   icon: 'bag-handle-outline',   component: OrdersTab },
  { key: 'products',    label: 'المنتجات',  icon: 'cube-outline',         component: ProductsTab },
  { key: 'withdrawals', label: 'السحوبات',  icon: 'cash-outline',         component: WithdrawalsTab },
  { key: 'merchants',   label: 'التجار',    icon: 'people-outline',       component: MerchantsTab },
  { key: 'inventory',   label: 'المخزون',   icon: 'layers-outline',       component: InventoryTab },
  { key: 'notifications', label: 'الإشعارات', icon: 'notifications-outline', component: NotificationsTab },
  { key: 'support',     label: 'الدعم',     icon: 'headset-outline',      component: SupportTab },
  { key: 'stats',       label: 'إحصائيات',  icon: 'bar-chart-outline',    component: StatsTab },
  { key: 'categories',  label: 'الفئات',    icon: 'grid-outline',         component: CategoriesTab },
  { key: 'banners',     label: 'البنرات',   icon: 'images-outline',       component: BannersTab },
  { key: 'promos',      label: 'الأكواد',   icon: 'pricetag-outline',     component: PromosTab },
  { key: 'admins',      label: 'الأدمنية',  icon: 'shield-half-outline',  component: AdminsTab },
];

export default function AdminScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Animations
  const translateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // 🔓 فتح السلايد
  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        speed: 10,
        bounciness: 6,
      }),
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        speed: 10,
        bounciness: 6,
      }),
    ]).start();
  };

  // 🔒 إغلاق السلايد
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SCREEN_WIDTH,
        duration: 280,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      translateX.setValue(-SCREEN_WIDTH);
      opacity.setValue(0);
    });
  };

  const toggleDrawer = () => {
    if (isDrawerOpen) closeDrawer();
    else openDrawer();
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    closeDrawer();
  };

  // PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isDrawerOpen) return false;
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newX = Math.min(0, gestureState.dx - SCREEN_WIDTH);
        translateX.setValue(newX);
        const newOpacity = Math.max(0, Math.min(1, (gestureState.dx + SCREEN_WIDTH) / SCREEN_WIDTH));
        opacity.setValue(newOpacity);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > CLOSE_THRESHOLD) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
    })
  ).current;

  // بيانات الصلاحيات والإحصائيات
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

  const visibleTabs = TABS.filter(t => {
    if (t.key === 'admins') return isSuperAdmin;
    if (t.key === 'support') return isSuperAdmin || userPermissions.includes('notifications');
    if (isSuperAdmin) return true;
    return userPermissions.includes(t.key);
  });

  const merchantCount = (users as any[]).filter((u: any) => u.role !== 'admin').length;
  const pendingWithdrawals = (withdrawals as any[]).filter((w: any) => w.status === 'pending').length;

  const getBadge = (key: string) => {
    if (key === 'orders') return (orders as any[]).length;
    if (key === 'products') return (products as any[]).length;
    if (key === 'withdrawals') return pendingWithdrawals;
    if (key === 'merchants') return merchantCount;
    if (key === 'promos') return (promos as any[]).length;
    return 0;
  };

  const ActiveComponent = visibleTabs.find(t => t.key === activeTab)?.component || OrdersTab;

  const renderDrawerItem = ({ item }: { item: any }) => {
    const badge = getBadge(item.key);
    const isActive = activeTab === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.drawerItem, isActive && styles.drawerItemActive]}
        onPress={() => handleTabChange(item.key)}
        activeOpacity={0.7}
      >
        <View style={styles.drawerItemContent}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={isActive ? PRIMARY : '#6b7280'}
          />
          <Text style={[styles.drawerItemLabel, isActive && styles.drawerItemLabelActive]}>
            {item.label}
          </Text>
          {badge > 0 && (
            <View style={[styles.drawerBadge, isActive && styles.drawerBadgeActive]}>
              <Text style={[styles.drawerBadgeText, isActive && styles.drawerBadgeTextActive]}>
                {badge}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* خلفية معتمة */}
      {isDrawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeDrawer}
        />
      )}

      {/* المحتوى الرئيسي */}
      <View style={styles.mainContent} {...panResponder.panHandlers}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.hamburgerBtn}>
            <Ionicons name="menu-outline" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>لوحة الإدارة</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 50 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          showsVerticalScrollIndicator={false}
        >
          <ActiveComponent />
        </ScrollView>
      </View>

      {/* السلايد الجانبي */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity style={styles.drawerCloseBtn} onPress={closeDrawer}>
          <Ionicons name="close-outline" size={24} color="#6b7280" />
        </TouchableOpacity>

        <View style={styles.drawerHeader}>
          <View style={styles.drawerHeaderIcon}>
            <Ionicons name="shield-checkmark" size={28} color={PRIMARY} />
          </View>
          <Text style={styles.drawerHeaderTitle}>لوحة الإدارة</Text>
          <Text style={styles.drawerHeaderSub}>مدير النظام</Text>
        </View>

        <FlatList
          data={visibleTabs}
          keyExtractor={(item) => item.key}
          renderItem={renderDrawerItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  mainContent: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  hamburgerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    paddingHorizontal: 16,
  },
  drawerCloseBtn: {
    alignSelf: 'flex-start',
    padding: 8,
    marginTop: 12,
    marginBottom: 4,
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
  drawerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 10,
    borderRadius: 12,
  },
  drawerItemActive: {
    backgroundColor: PRIMARY + '12',
  },
  drawerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
  drawerItemLabelActive: {
    color: PRIMARY,
  },
  drawerBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  drawerBadgeActive: {
    backgroundColor: PRIMARY,
  },
  drawerBadgeText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  drawerBadgeTextActive: {
    color: '#fff',
  },
});