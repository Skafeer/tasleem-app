import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const BG      = '#f2f6f9';

const STATUS: any = {
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', icon: 'sync-outline' },
  preparing:  { label: 'قيد التجهيز',  color: '#8b5cf6', bg: '#f5f3ff', icon: 'cube-outline' },
  shipping:   { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', icon: 'bicycle-outline' },
  delivered:  { label: 'تم التوصيل',  color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  cancelled:  { label: 'ملغي',         color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
  returned:   { label: 'راجع',          color: '#f97316', bg: '#fff7ed', icon: 'arrow-undo-outline' },
  postponed:  { label: 'مؤجل',         color: '#6b7280', bg: '#f9fafb', icon: 'pause-circle-outline' },
};

const TABS = [
  { key: 'active',    label: 'نشط',   icon: 'flash-outline' },
  { key: 'delivered', label: 'مكتمل', icon: 'checkmark-circle-outline' },
  { key: 'cancelled', label: 'ملغي',  icon: 'close-circle-outline' },
  { key: 'postponed', label: 'مؤجل',  icon: 'pause-circle-outline' },
  { key: 'returned',  label: 'راجع',  icon: 'arrow-undo-outline' },
];

const TAB_COLORS: any = {
  active:    { bg: '#eff6ff', text: '#3b82f6', border: '#3b82f6' },
  delivered: { bg: '#ecfdf5', text: '#10b981', border: '#10b981' },
  cancelled: { bg: '#fef2f2', text: '#ef4444', border: '#ef4444' },
  postponed: { bg: '#f9fafb', text: '#6b7280', border: '#6b7280' },
  returned:  { bg: '#fff7ed', text: '#f97316', border: '#f97316' },
};

const CANCELLABLE = ['pending', 'processing'];
const PAGE_SIZE   = 20;

// ── Skeleton ──
function SkeletonOrder() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[sko.card, { opacity: anim }]}>
      <View style={sko.icon} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={sko.line} />
        <View style={[sko.line, { width: '50%' }]} />
      </View>
      <View style={sko.badge} />
    </Animated.View>
  );
}

const sko = StyleSheet.create({
  card:  { backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  icon:  { width: 46, height: 46, borderRadius: 14, backgroundColor: '#e8edf2' },
  line:  { height: 12, backgroundColor: '#e8edf2', borderRadius: 6, width: '75%' },
  badge: { width: 60, height: 26, borderRadius: 8, backgroundColor: '#e8edf2' },
});

export default function OrdersScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await api.get(`/api/orders?limit=${PAGE_SIZE}&page=1`);
      const result = data?.data || data;
      return Array.isArray(result) ? result : [];
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/api/orders/${id}/status`, { status: 'cancelled' });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('تم إلغاء الطلب');
    },
    onError: () => toast.error('فشل إلغاء الطلب'),
  });

  const confirmCancel = (o: any) => {
    Alert.alert(
      'إلغاء الطلب',
      `هل أنت متأكد من إلغاء الطلب #${o.id}؟`,
      [
        { text: 'تراجع', style: 'cancel' },
        { text: 'إلغاء الطلب', style: 'destructive', onPress: () => cancelOrder.mutate(o.id) },
      ]
    );
  };

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
        return matchSearch && ['pending', 'processing', 'preparing', 'shipping'].includes(o.status);
      return matchSearch && o.status === tab;
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filtered    = getFiltered(activeTab);
  const activeCount = getFiltered('active').length;

  const renderOrder = ({ item: o }: any) => {
    const status    = STATUS[o.status] || STATUS.pending;
    const canCancel = CANCELLABLE.includes(o.status);
    return (
      <View style={s.orderCard}>
        <TouchableOpacity style={s.cardPressable} onPress={() => router.push(`/order-details/${o.id}`)} activeOpacity={0.7}>
          <View style={s.cardTop}>
            <View style={[s.orderIcon, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={22} color={status.color} />
            </View>
            <View style={s.orderInfo}>
              <View style={s.orderTopRow}>
                <View style={[s.badge, { backgroundColor: status.bg }]}>
                  <Text style={[s.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
                <Text style={s.orderId}>طلب #{o.id}</Text>
              </View>
              {(o.customerName || o.province) && (
                <View style={s.customerRow}>
                  {o.province ? (
                    <View style={s.provinceTag}>
                      <Ionicons name="location-outline" size={10} color="#6b7280" />
                      <Text style={s.provinceText}>{o.province}</Text>
                    </View>
                  ) : null}
                  <Text style={s.customerName} numberOfLines={1}>{o.customerName}</Text>
                </View>
              )}
              <View style={s.dateRow}>
                <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
                <Text style={s.dateText}>{formatDate(o.createdAt)}</Text>
              </View>
              <View style={s.amountRow}>
                {o.totalProfit != null && (
                  <View style={s.profitTag}>
                    <Ionicons name="trending-up-outline" size={11} color="#10b981" />
                    <Text style={s.profitText}>ربح: {o.totalProfit?.toLocaleString()} د.ع</Text>
                  </View>
                )}
                <Text style={s.orderAmount}>
                  {o.totalAmount?.toLocaleString()} <Text style={{ fontSize: 11, color: '#9ca3af' }}>د.ع</Text>
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={s.cardFooter}>
          <TouchableOpacity
            style={[s.cancelBtn, !canCancel && s.cancelBtnDisabled]}
            onPress={() => canCancel && confirmCancel(o)}
            disabled={!canCancel || cancelOrder.isPending}
            activeOpacity={canCancel ? 0.7 : 1}>
            <Ionicons name="close-circle-outline" size={15} color={canCancel ? '#ef4444' : '#d1d5db'} />
            <Text style={[s.cancelBtnText, !canCancel && s.cancelBtnTextDisabled]}>
              {canCancel ? 'إلغاء الطلب' : 'لا يمكن الإلغاء'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.detailsBtn} onPress={() => router.push(`/order-details/${o.id}`)}>
            <Ionicons name="eye-outline" size={15} color={PRIMARY} />
            <Text style={s.detailsBtnText}>التفاصيل</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          {/* العنوان يمين — الكبير فوق، الصغير تحت */}
          <View style={s.headerTitles}>
            <Text style={s.headerTitle}>طلباتي</Text>
            <Text style={s.headerSub}>تتبع حالة طلباتك وأرباحك</Text>
          </View>
          {/* Badge العدد يسار */}
          {activeCount > 0 && (
            <View style={s.activeCountBadge}>
              <Text style={s.activeCountNum}>{activeCount}</Text>
              <Text style={s.activeCountLabel}>نشط</Text>
            </View>
          )}
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث برقم الطلب أو اسم الزبون..."
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            placeholderTextColor="#9ca3af"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabsWrap}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={t => t.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item: tab }) => {
            const isActive = activeTab === tab.key;
            const colors   = TAB_COLORS[tab.key];
            const count    = getFiltered(tab.key).length;
            return (
              <TouchableOpacity
                style={[s.tabBtn, isActive && { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => setActiveTab(tab.key)}>
                <Ionicons name={tab.icon as any} size={13} color={isActive ? colors.text : '#9ca3af'} />
                <Text style={[s.tabText, isActive && { color: colors.text }]}>{tab.label}</Text>
                {count > 0 && (
                  <View style={[s.tabBadge, isActive && { backgroundColor: colors.border }]}>
                    <Text style={[s.tabBadgeText, isActive && { color: '#fff' }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <View style={{ paddingTop: 8 }}>
          {[...Array(5)].map((_, i) => <SkeletonOrder key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}>
                <Ionicons name="cube-outline" size={40} color={PRIMARY} />
              </View>
              <Text style={s.emptyTitle}>لا توجد طلبات</Text>
              <Text style={s.emptyText}>لا توجد طلبات في هذه القائمة</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
  header: {
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e8edf2',
  },
  headerContent: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingTop: 4, marginBottom: 14,
  },
  headerTitles: { alignItems: 'flex-end' },
  headerTitle:  { fontSize: 24, fontWeight: '900', color: '#0d1b2a' },
  headerSub:    { fontSize: 11, color: '#64748b', marginTop: 3 },

  activeCountBadge: {
    backgroundColor: 'rgba(12,102,121,0.1)', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(12,102,121,0.2)',
  },
  activeCountNum:   { fontSize: 22, fontWeight: '900', color: PRIMARY },
  activeCountLabel: { fontSize: 11, color: PRIMARY, fontWeight: '700', marginTop: 1 },

  searchBox: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#f2f6f9', borderRadius: 14,
    paddingHorizontal: 12, height: 44, gap: 8,
    borderWidth: 1.5, borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0d1b2a' },

  // ── Tabs ──
  tabsWrap: {
    paddingVertical: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e8edf2',
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f2f6f9', borderWidth: 1.5, borderColor: '#e8edf2',
  },
  tabText:      { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  tabBadge:     { backgroundColor: '#e8edf2', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },

  // ── Order Card ──
  orderCard: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#e8edf2',
    shadowColor: '#0d1b2a', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden',
  },
  cardPressable: { padding: 14 },
  cardTop:       { flexDirection: 'row-reverse', gap: 12, alignItems: 'flex-start' },
  orderIcon:     { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  orderInfo:     { flex: 1, gap: 6 },
  orderTopRow:   { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  orderId:       { fontSize: 15, fontWeight: '800', color: '#0d1b2a' },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText:     { fontSize: 11, fontWeight: '700' },

  customerRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 13, color: '#374151', fontWeight: '600', textAlign: 'right', flex: 1 },
  provinceTag:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 3,
    backgroundColor: '#f2f6f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  provinceText: { fontSize: 10, color: '#64748b', fontWeight: '600' },

  dateRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 11, color: '#9ca3af' },

  amountRow:   { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  orderAmount: { fontSize: 15, fontWeight: '800', color: '#0d1b2a' },
  profitTag:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  profitText:  { fontSize: 11, color: '#10b981', fontWeight: '700' },

  cardFooter: {
    flexDirection: 'row-reverse', borderTopWidth: 1,
    borderTopColor: '#e8edf2', paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  cancelBtn:             { flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  cancelBtnDisabled:     { backgroundColor: '#f2f6f9', borderColor: '#e8edf2' },
  cancelBtnText:         { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  cancelBtnTextDisabled: { color: '#d1d5db' },
  detailsBtn:     { flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 12,
    backgroundColor: PRIMARY + '10', borderWidth: 1, borderColor: PRIMARY + '30' },
  detailsBtnText: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  // ── Empty ──
  emptyBox:   { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
  emptyText:  { fontSize: 13, color: '#9ca3af' },
});
