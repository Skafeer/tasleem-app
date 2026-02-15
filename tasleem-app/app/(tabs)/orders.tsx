import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const STATUS: any = {
  pending:          { label: 'قيد الانتظار', color: '#d97706', bg: '#fef3c7', icon: 'time-outline' },
  processing:       { label: 'قيد التجهيز',  color: '#2563eb', bg: '#dbeafe', icon: 'cube-outline' },
  out_for_delivery: { label: 'في الطريق',    color: '#7c3aed', bg: '#ede9fe', icon: 'bicycle-outline' },
  delivered:        { label: 'تم التوصيل',   color: '#059669', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  returned:         { label: 'راجع',          color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline' },
};

const TABS = [
  { key: 'active',    label: 'نشط' },
  { key: 'delivered', label: 'مكتمل' },
  { key: 'returned',  label: 'راجع' },
];

const TAB_ACTIVE_COLORS: any = {
  active:    { bg: '#eff6ff', text: '#2563eb' },
  delivered: { bg: '#f0fdf4', text: '#059669' },
  returned:  { bg: '#fef2f2', text: '#dc2626' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get('/api/orders');
      return Array.isArray(data) ? data : [];
    },
  });

  const getFiltered = (tab: string) => {
    const sorted = [...(orders as any[])].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    return sorted.filter((o: any) => {
      const matchSearch =
        o.id.toString().includes(search) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone?.includes(search);

      if (tab === 'active')
        return matchSearch && ['pending', 'processing', 'out_for_delivery'].includes(o.status);
      return matchSearch && o.status === tab;
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-IQ', {
      month: 'long', day: 'numeric'
    });
  };

  const renderOrder = ({ item }: any) => {
    const status = STATUS[item.status] || STATUS.pending;
    return (
      <TouchableOpacity style={s.orderCard}
        onPress={() => router.push(`/order-details/${item.id}`)}>
        <Ionicons name="chevron-back" size={20} color="#d1d5db" />
        <View style={s.orderInfo}>
          <View style={s.orderTop}>
            <View style={[s.badge, { backgroundColor: status.bg }]}>
              <Text style={[s.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={s.orderId}>طلب #{item.id}</Text>
          </View>
          <View style={s.orderBottom}>
            <Text style={s.orderDate}>{formatDate(item.createdAt)}</Text>
            <Text style={s.orderAmount}>{item.totalAmount?.toLocaleString()} د.ع</Text>
          </View>
        </View>
        <View style={[s.orderIcon, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={22} color={status.color} />
        </View>
      </TouchableOpacity>
    );
  };

  const filtered = getFiltered(activeTab);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>طلباتي</Text>
        <Text style={s.subtitle}>تتبع حالة طلباتك وأرباحك</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث برقم الطلب، اسم الزبون، أو رقم الهاتف..."
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const colors = TAB_ACTIVE_COLORS[tab.key];
          return (
            <TouchableOpacity key={tab.key}
              style={[s.tabBtn, isActive && { backgroundColor: colors.bg }]}
              onPress={() => setActiveTab(tab.key)}>
              <Text style={[s.tabText, isActive && { color: colors.text }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="cube-outline" size={48} color="#e5e7eb" />
              <Text style={s.emptyText}>لا توجد طلبات في هذه القائمة</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'right', marginTop: 2 },
  searchWrap: { padding: 16, backgroundColor: '#fff' },
  searchBox: { flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 16, paddingHorizontal: 14,
    height: 50, gap: 10, borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },
  tabsBar: { flexDirection: 'row', margin: 16, backgroundColor: '#fff',
    borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  tabBtn: { flex: 1, height: 44, justifyContent: 'center',
    alignItems: 'center', borderRadius: 12 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#9ca3af' },
  orderCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: '#f9fafb' },
  orderIcon: { width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center' },
  orderInfo: { flex: 1 },
  orderTop: { flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  orderBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  orderAmount: { fontSize: 13, color: '#9ca3af' },
  orderDate: { fontSize: 13, color: '#9ca3af' },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});
