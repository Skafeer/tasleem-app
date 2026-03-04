import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, useWindowDimensions,
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

const PRIMARY   = '#0c6679';
const SECONDARY = '#f5a006';
const DANGER    = '#ef4444';
const SUCCESS   = '#10b981';

export default function AdminScreen() {
  const qc = useQueryClient();
  const [tab, setTab]           = useState<'orders'|'products'|'withdrawals'|'users'|'promos'|'stats'>('orders');
  const [search, setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders      = [] } = useQuery({ queryKey: ['admin-orders'],     queryFn: async () => { const { data } = await api.get('/api/orders');        return data; }, refetchInterval: 30000 });
  const { data: products    = [] } = useQuery({ queryKey: ['products'],          queryFn: async () => { const { data } = await api.get('/api/products');       return data; } });
  const { data: users       = [] } = useQuery({ queryKey: ['admin-users'],       queryFn: async () => { const { data } = await api.get('/api/admin/users');    return data; } });
  const { data: withdrawals = [] } = useQuery({ queryKey: ['admin-withdrawals'], queryFn: async () => { const { data } = await api.get('/api/withdrawals');    return data; } });
  const { data: promos      = [] } = useQuery({ queryKey: ['promo-codes'],       queryFn: async () => { const { data } = await api.get('/api/promo-codes');    return data; } });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  // ── إحصائيات سريعة ──
  const merchantCount      = (users      as any[]).filter((u: any) => u.role !== 'admin').length;
  const pendingWithdrawals = (withdrawals as any[]).filter((w: any) => w.status === 'pending').length;
  const deliveredOrders    = (orders     as any[]).filter((o: any) => o.status === 'delivered');
  const totalRevenue       = deliveredOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
  const totalProfit        = deliveredOrders.reduce((s: number, o: any) => s + (o.totalProfit  || 0), 0);

  const TABS = [
    { key: 'orders',      label: 'الطلبات',     icon: 'bag-outline',        count: (orders as any[]).length },
    { key: 'products',    label: 'المنتجات',    icon: 'cube-outline',       count: (products as any[]).length },
    { key: 'withdrawals', label: 'السحوبات',    icon: 'cash-outline',       count: pendingWithdrawals },
    { key: 'users',       label: 'التجار',      icon: 'people-outline',     count: merchantCount },
    { key: 'promos',      label: 'الأكواد',     icon: 'pricetag-outline',   count: (promos as any[]).length },
    { key: 'stats',       label: 'إحصائيات',    icon: 'bar-chart-outline',  count: 0 },
  ];

  return (
    <SafeAreaView style={s.container}>

      {/* HEADER */}
      <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s.headerIconBox}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
        </View>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>لوحة الإدارة</Text>
          <Text style={s.headerSub}>مرحباً مدير النظام 👋</Text>
        </View>
        <TouchableOpacity style={s.headerIconBox} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* STATS ROW */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.statsScroll} contentContainerStyle={s.statsContent}>
        {[
          { label: 'الإيرادات',      value: `${(totalRevenue / 1000).toFixed(1)}k`, icon: 'cash-outline',       color: SUCCESS,   bg: '#ecfdf5'     },
          { label: 'الأرباح',        value: `${(totalProfit  / 1000).toFixed(1)}k`, icon: 'trending-up-outline', color: PRIMARY,   bg: PRIMARY+'15'  },
          { label: 'الطلبات',        value: (orders as any[]).length,                icon: 'bag-outline',         color: '#3b82f6', bg: '#eff6ff'     },
          { label: 'التجار',         value: merchantCount,                           icon: 'storefront-outline',  color: '#8b5cf6', bg: '#f5f3ff'     },
          { label: 'المنتجات',       value: (products as any[]).length,              icon: 'cube-outline',        color: SECONDARY, bg: '#fffbeb'     },
          { label: 'سحوبات معلقة',   value: pendingWithdrawals,                      icon: 'time-outline',        color: DANGER,    bg: '#fef2f2'     },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <View style={[s.statIconBox, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color} />
            </View>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabActive]}
            onPress={() => { setTab(t.key as any); setSearch(''); }}>
            <Ionicons name={t.icon as any} size={15} color={tab === t.key ? PRIMARY : '#9ca3af'} />
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            {t.count > 0 && (
              <View style={[s.badge, tab === t.key && s.badgeActive]}>
                <Text style={[s.badgeText, tab === t.key && s.badgeTextActive]}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* SEARCH */}
      {(tab === 'orders' || tab === 'products') && (
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={17} color="#9ca3af" />
          <TextInput style={s.searchInput} placeholder="بحث..."
            value={search} onChangeText={setSearch}
            placeholderTextColor="#9ca3af" textAlign="right" />
          {search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MAIN CONTENT */}
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}>

        {tab === 'orders'      && <OrdersTab />}
        {tab === 'products'    && <ProductsTab />}
        {tab === 'withdrawals' && <WithdrawalsTab />}
        {tab === 'users'       && <MerchantsTab />}
        {tab === 'promos'      && <PromosTab />}
        {tab === 'stats'       && <StatsTab />}

      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerCenter:  { alignItems: 'center' },
  headerTitle:   { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Stats
  statsScroll:  { maxHeight: 105 },
  statsContent: { padding: 12, gap: 10 },
  statCard:     { backgroundColor: '#fff', borderRadius: 20, padding: 12, minWidth: 105, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  statIconBox:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue:    { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  statLabel:    { fontSize: 10, color: '#6b7280', marginTop: 2, textAlign: 'center' },

  // Tabs
  tabsScroll:      { maxHeight: 58 },
  tabsContent:     { paddingHorizontal: 12, gap: 10, alignItems: 'center' },
  tabBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb' },
  tabActive:       { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  tabText:         { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  tabTextActive:   { color: PRIMARY, fontWeight: '700' },
  badge:           { backgroundColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeActive:     { backgroundColor: PRIMARY },
  badgeText:       { fontSize: 10, color: '#9ca3af', fontWeight: 'bold' },
  badgeTextActive: { color: '#fff' },

  // Search
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 8, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1.5, borderColor: '#e5e7eb', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
});
