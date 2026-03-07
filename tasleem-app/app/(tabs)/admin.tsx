import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
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

const PRIMARY   = '#0c6679';
const SECONDARY = '#f5a006';
const DANGER    = '#ef4444';
const SUCCESS   = '#10b981';

const TABS = [
  { key: 'orders',      label: 'الطلبات',   icon: 'bag-handle-outline',    activeIcon: 'bag-handle' },
  { key: 'products',    label: 'المنتجات',  icon: 'cube-outline',           activeIcon: 'cube' },
  { key: 'withdrawals', label: 'السحوبات',  icon: 'cash-outline',           activeIcon: 'cash' },
  { key: 'users',       label: 'التجار',    icon: 'people-outline',         activeIcon: 'people' },
  { key: 'promos',      label: 'الأكواد',   icon: 'pricetag-outline',       activeIcon: 'pricetag' },
  { key: 'banners',     label: 'البنرات',   icon: 'images-outline',         activeIcon: 'images' },
  { key: 'stats',       label: 'إحصائيات', icon: 'bar-chart-outline',      activeIcon: 'bar-chart' },
  { key: 'notifications', label: 'الإشعارات',  icon: 'notifications-outline',  activeIcon: 'notifications' },
  { key: 'admins',         label: 'الأدمنية',   icon: 'shield-half-outline',    activeIcon: 'shield-half'   },
];

export default function AdminScreen() {
  const qc = useQueryClient();
  const [tab, setTab]               = useState<string>('orders');
  const [refreshing, setRefreshing] = useState(false);

  const { data: user        } = useQuery({ queryKey: ['user'], queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; } });

  const { data: orders      = [] } = useQuery({ queryKey: ['admin-orders'],     queryFn: async () => { const { data } = await api.get('/api/orders');       return data; }, refetchInterval: 30000 });
  const { data: products    = [] } = useQuery({ queryKey: ['products'],          queryFn: async () => { const { data } = await api.get('/api/products');      return data; } });
  const { data: users       = [] } = useQuery({ queryKey: ['admin-users'],       queryFn: async () => { const { data } = await api.get('/api/admin/users');   return data; } });
  const { data: withdrawals = [] } = useQuery({ queryKey: ['admin-withdrawals'], queryFn: async () => { const { data } = await api.get('/api/withdrawals');   return data; } });
  const { data: promos      = [] } = useQuery({ queryKey: ['promo-codes'],       queryFn: async () => { const { data } = await api.get('/api/promo-codes');   return data; } });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  const isSuperAdmin = (user as any)?.is_super_admin || (user as any)?.isSuperAdmin || false;
  let userPermissions: string[] = [];
  try { userPermissions = JSON.parse((user as any)?.permissions || '[]'); } catch {}

  // الفلترة حسب الصلاحيات
  const visibleTabs = TABS.filter(t => {
    if (t.key === 'admins') return isSuperAdmin;
    if (isSuperAdmin) return true;
    return userPermissions.includes(t.key);
  });

  const merchantCount      = (users      as any[]).filter((u: any) => u.role !== 'admin').length;
  const pendingWithdrawals = (withdrawals as any[]).filter((w: any) => w.status === 'pending').length;

  const getBadge = (key: string) => {
    if (key === 'orders')      return (orders as any[]).length;
    if (key === 'products')    return (products as any[]).length;
    if (key === 'withdrawals') return pendingWithdrawals;
    if (key === 'users')       return merchantCount;
    if (key === 'promos')      return (promos as any[]).length;
    return 0;
  };

  const currentTab = TABS.find(t => t.key === tab);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>

      {/* HEADER */}
      <LinearGradient colors={[PRIMARY, '#085e72']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.headerTop}>
          <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={19} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>لوحة الإدارة</Text>
            <Text style={s.headerSub}>مرحباً مدير النظام 👋</Text>
          </View>

          <View style={s.headerBadge}>
            <Ionicons name="shield-checkmark" size={18} color={PRIMARY} />
          </View>
        </View>

        {/* TABS داخل الهيدر */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsContent}>
          {TABS.map(t => {
            const isActive = tab === t.key;
            const badge    = getBadge(t.key);
            return (
              <TouchableOpacity key={t.key}
                style={[s.tabBtn, isActive && s.tabBtnActive]}
                onPress={() => setTab(t.key)}>
                <Ionicons
                  name={(isActive ? t.activeIcon : t.icon) as any}
                  size={14}
                  color={isActive ? PRIMARY : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[s.tabText, isActive && s.tabTextActive]}>{t.label}</Text>
                {badge > 0 && (
                  <View style={[s.tabBadge, isActive && s.tabBadgeActive]}>
                    <Text style={[s.tabBadgeTxt, isActive && s.tabBadgeTxtActive]}>{badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* عنوان القسم الحالي */}
      <View style={s.sectionBar}>
        <Ionicons name={currentTab?.activeIcon as any} size={16} color={PRIMARY} />
        <Text style={s.sectionBarTxt}>{currentTab?.label}</Text>
      </View>

      {/* MAIN CONTENT */}
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}>

        {tab === 'orders'      && <OrdersTab />}
        {tab === 'products'    && <ProductsTab />}
        {tab === 'withdrawals' && <WithdrawalsTab />}
        {tab === 'users'       && <MerchantsTab />}
        {tab === 'promos'      && <PromosTab />}
        {tab === 'banners'     && <BannersTab />}
        {tab === 'stats'       && <StatsTab />}
        {tab === 'notifications' && <NotificationsTab />}

      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  // Header
  header: { paddingBottom: 14 },

  headerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle:     { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub:       { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  headerBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Tabs
  tabsContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },

  tabBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tabText:       { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  tabTextActive: { color: PRIMARY, fontWeight: '700' },

  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: PRIMARY },
  tabBadgeTxt:       { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  tabBadgeTxtActive: { color: '#fff' },

  // Section bar
  sectionBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  sectionBarTxt: { fontSize: 14, fontWeight: '700', color: '#111827' },
});
