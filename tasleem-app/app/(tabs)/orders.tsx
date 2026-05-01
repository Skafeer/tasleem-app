import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator, Alert, Animated,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

// ── حالات الطلب ──
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
  { key: 'active',    label: 'نشط',    icon: 'flash-outline' },
  { key: 'delivered', label: 'مكتمل',  icon: 'checkmark-circle-outline' },
  { key: 'cancelled', label: 'ملغي',   icon: 'close-circle-outline' },
  { key: 'postponed', label: 'مؤجل',   icon: 'pause-circle-outline' },
  { key: 'returned',  label: 'راجع',   icon: 'arrow-undo-outline' },
];

const TAB_COLORS: any = {
  active:    { bg: '#eff6ff', text: '#3b82f6', border: '#3b82f6' },
  delivered: { bg: '#ecfdf5', text: '#10b981', border: '#10b981' },
  cancelled: { bg: '#fef2f2', text: '#ef4444', border: '#ef4444' },
  postponed: { bg: '#f9fafb', text: '#6b7280', border: '#6b7280' },
  returned:  { bg: '#fff7ed', text: '#f97316', border: '#f97316' },
};

const CANCELLABLE = ['pending', 'processing'];

// ── Skeleton Order Card ──
function SkeletonOrderCard() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[sk.card, { opacity: anim }]}>
      <View style={sk.row}>
        <View style={sk.icon} />
        <View style={sk.content}>
          <View style={sk.line} />
          <View style={[sk.line, { width: '60%' }]} />
          <View style={[sk.line, { width: '40%' }]} />
        </View>
      </View>
      <View style={sk.footer}>
        <View style={sk.btn} />
        <View style={[sk.btn, { width: 80 }]} />
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: 'row', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#e8edf2' },
  content: { flex: 1, gap: 8 },
  line: { height: 12, backgroundColor: '#e8edf2', borderRadius: 6, width: '80%' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  btn: { flex: 1, height: 36, backgroundColor: '#e8edf2', borderRadius: 10 },
});

export default function OrdersScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // ✅ جلب بيانات المستخدم الحالي لمعرفة دوره
  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders', currentUser?.id],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    enabled: !!currentUser,
    queryFn: async () => {
      // ✅ إذا كان أدمن، أرسل merchantId الخاص به فقط — ليس كل الطلبات
      const merchantId = currentUser?.id;
      const { data } = await api.get(`/api/orders?limit=100&page=1&merchantId=${merchantId}`);
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
      qc.invalidateQueries({ queryKey: ['wallet'] });
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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getFiltered = useCallback((tab: string) => {
    const sorted = [...(orders as any[])].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
    return sorted.filter((o: any) => {
      const matchSearch = !search || 
        o.id.toString().includes(search) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone?.includes(search);
      if (tab === 'active') {
        return matchSearch && ['pending', 'processing', 'preparing', 'shipping'].includes(o.status);
      }
      return matchSearch && o.status === tab;
    });
  }, [orders, search]);

  const filtered = useMemo(() => getFiltered(activeTab), [getFiltered, activeTab]);
  const activeCount = useMemo(() => getFiltered('active').length, [getFiltered]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    return dt.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderOrder = ({ item: o }: any) => {
    const status = STATUS[o.status] || STATUS.pending;
    const canCancel = CANCELLABLE.includes(o.status);

    return (
      <TouchableOpacity
        style={s.orderCard}
        onPress={() => router.push(`/order-details/${o.id}`)}
        activeOpacity={0.92}>
        
        {/* رأس البطاقة */}
        <View style={s.cardHeader}>
          <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={s.orderId}>طلب #{o.id}</Text>
        </View>

        {/* معلومات الزبون */}
        <View style={s.customerInfo}>
          <Ionicons name="person-outline" size={14} color="#9ca3af" />
          <Text style={s.customerName}>{o.customerName || 'بدون اسم'}</Text>
          {o.province && (
            <View style={s.locationTag}>
              <Ionicons name="location-outline" size={10} color="#6b7280" />
              <Text style={s.locationText}>{o.province}</Text>
            </View>
          )}
        </View>

        {/* التاريخ */}
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
          <Text style={s.dateText}>{formatDate(o.createdAt)}</Text>
        </View>

        {/* السعر والربح */}
        <View style={s.amountRow}>
          {o.totalProfit != null && (
            <View style={s.profitTag}>
              <Ionicons name="trending-up-outline" size={12} color="#10b981" />
              <Text style={s.profitText}>ربح: {o.totalProfit?.toLocaleString()} د.ع</Text>
            </View>
          )}
          <Text style={s.orderAmount}>
            {o.totalAmount?.toLocaleString()} <Text style={s.currency}>د.ع</Text>
          </Text>
        </View>

        {/* أزرار الإجراءات */}
        <View style={s.cardFooter}>
          <TouchableOpacity
            style={[s.cancelBtn, !canCancel && s.cancelBtnDisabled]}
            onPress={() => canCancel && confirmCancel(o)}
            disabled={!canCancel || cancelOrder.isPending}>
            <Ionicons name="close-circle-outline" size={16} color={canCancel ? '#ef4444' : '#d1d5db'} />
            <Text style={[s.cancelBtnText, !canCancel && s.cancelBtnTextDisabled]}>
              {canCancel ? 'إلغاء الطلب' : 'لا يمكن الإلغاء'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={s.detailsBtn}
            onPress={() => router.push(`/order-details/${o.id}`)}>
            <Ionicons name="eye-outline" size={16} color={PRIMARY} />
            <Text style={s.detailsBtnText}>التفاصيل</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top' , 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>طلباتي</Text>
            <Text style={s.headerSub}>تتبع حالة طلباتك</Text>
          </View>
          {activeCount > 0 && (
            <View style={s.activeBadge}>
              <Text style={s.activeBadgeText}>{activeCount}</Text>
              <Text style={s.activeBadgeLabel}>طلب نشط</Text>
            </View>
          )}
        </View>

        {/* شريط البحث */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث برقم الطلب أو اسم الزبون..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── التبويبات ── */}
      <View style={s.tabsWrapper}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={t => t.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsContent}
          renderItem={({ item: tab }) => {
            const isActive = activeTab === tab.key;
            const colors = TAB_COLORS[tab.key];
            const count = getFiltered(tab.key).length;
            return (
              <TouchableOpacity
                style={[s.tabBtn, isActive && { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => setActiveTab(tab.key)}>
                <Ionicons name={tab.icon as any} size={14} color={isActive ? colors.text : '#9ca3af'} />
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

      {/* ── قائمة الطلبات ── */}
      {isLoading ? (
        <View style={{ paddingTop: 8 }}>
          {[...Array(4)].map((_, i) => <SkeletonOrderCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <View style={s.emptyIconBox}>
                <Ionicons name="cube-outline" size={40} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>لا توجد طلبات</Text>
              <Text style={s.emptyText}>
                {search ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد طلبات في هذه القائمة'}
              </Text>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  headerSub: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: PRIMARY + '15',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  activeBadgeLabel: {
    fontSize: 10,
    color: PRIMARY,
  },

  // ── Search ──
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' },

  // ── Tabs ──
  tabsWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // ── Order Card ──
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },

  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  locationText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  currency: {
    fontSize: 10,
    color: '#9ca3af',
  },
  profitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  profitText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
  },

  cardFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelBtnDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  cancelBtnTextDisabled: {
    color: '#d1d5db',
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: PRIMARY + '10',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});