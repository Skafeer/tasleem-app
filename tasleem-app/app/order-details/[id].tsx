import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

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

// Skeleton Component
function SkeletonDetails() {
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
    <ScrollView style={{ flex: 1, backgroundColor: BG }}>
      <Animated.View style={{ opacity: anim }}>
        <View style={sk.headerSkeleton} />
        <View style={sk.cardSkeleton}>
          <View style={sk.line} />
          <View style={[sk.line, { width: '60%' }]} />
          <View style={[sk.line, { width: '80%' }]} />
        </View>
        <View style={sk.cardSkeleton}>
          <View style={sk.line} />
          <View style={[sk.line, { width: '50%' }]} />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const sk = StyleSheet.create({
  headerSkeleton: { height: 140, backgroundColor: '#fff', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e8edf2' },
  cardSkeleton: { backgroundColor: '#fff', borderRadius: 20, padding: 18, margin: 16, marginTop: 0, gap: 12 },
  line: { height: 14, backgroundColor: '#e8edf2', borderRadius: 7, width: '100%' },
});

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/orders/${id}`);
      return data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(d).toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <SkeletonDetails />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.center}>
          <View style={s.emptyIconBox}>
            <Ionicons name="cube-outline" size={48} color="#9ca3af" />
          </View>
          <Text style={s.emptyTitle}>لم يتم العثور على الطلب</Text>
          <TouchableOpacity style={s.backBtnEmpty} onPress={() => router.back()}>
            <Text style={s.backBtnEmptyText}>العودة للطلبات</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS[order.status] || STATUS.pending;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* Header - بدون تدرج لوني */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <Text style={s.headerTitle}>تفاصيل الطلب #{order.id}</Text>
            <Text style={s.headerSub}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>

        {/* بطاقة المبلغ والحالة - بدون تدرج */}
        <View style={s.summaryCard}>
          <View style={s.summaryLeft}>
            <Text style={s.summaryLabel}>المبلغ الإجمالي</Text>
            <Text style={s.summaryAmount}>{order.totalAmount?.toLocaleString()}</Text>
            <Text style={s.summaryCurrency}>د.ع</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={16} color={status.color} />
            <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}>

        {/* معلومات الزبون */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="person-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={s.cardTitle}>معلومات الزبون</Text>
          </View>

          <View style={s.infoGrid}>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>الاسم</Text>
              <Text style={s.infoValue}>{order.customerName || '—'}</Text>
            </View>
            <View style={s.infoDivider} />
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>الهاتف</Text>
              <Text style={s.infoValue}>{order.customerPhone || '—'}</Text>
            </View>
          </View>

          <View style={s.separator} />

          <View style={s.addressRow}>
            <View style={[s.cardIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="location-outline" size={16} color="#10b981" />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.infoLabel}>العنوان</Text>
              <Text style={s.infoValue}>
                {order.province || ''} {order.address ? ` — ${order.address}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* المنتجات */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="cube-outline" size={18} color="#8b5cf6" />
            </View>
            <Text style={s.cardTitle}>المنتجات ({order.items?.length || 0})</Text>
          </View>

          {order.items?.map((item: any, i: number) => (
            <View key={item.id} style={[s.productRow, i === order.items.length - 1 && { borderBottomWidth: 0 }]}>
              {item.product?.images || item.product?.imageUrl ? (
                <Image
                  source={{ uri: (item.product.images?.split(',')[0] || item.product.imageUrl) }}
                  style={s.productImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.productIcon}>
                  <Ionicons name="cube-outline" size={22} color={PRIMARY} />
                </View>
              )}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.productName}>{item.product?.name || 'منتج'}</Text>
                <Text style={s.productMeta}>
                  {item.quantity} × {item.price?.toLocaleString()} د.ع
                </Text>
              </View>
              <Text style={s.productTotal}>
                {(item.quantity * item.price)?.toLocaleString()} د.ع
              </Text>
            </View>
          ))}
        </View>

        {/* ملخص مالي - بدون تدرج لوني */}
        <View style={s.darkCard}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#f3f4f6' }]}>
              <Ionicons name="receipt-outline" size={18} color="#6b7280" />
            </View>
            <Text style={[s.cardTitle, { color: '#374151' }]}>ملخص التكاليف والربح</Text>
          </View>

          <View style={s.darkRow}>
            <Text style={s.darkVal}>{(order.totalAmount - (order.shippingCost || 0))?.toLocaleString()} د.ع</Text>
            <Text style={s.darkLabel}>سعر البيع</Text>
          </View>
          
          <View style={s.darkRow}>
            <Text style={s.darkVal}>{order.shippingCost?.toLocaleString()} د.ع</Text>
            <Text style={s.darkLabel}>أجرة التوصيل</Text>
          </View>

          <View style={s.darkDivider} />

          <View style={s.darkRow}>
            <Text style={[s.darkVal, { fontSize: 18, fontWeight: 'bold', color: '#111827' }]}>
              {order.totalAmount?.toLocaleString()} د.ع
            </Text>
            <Text style={[s.darkLabel, { fontWeight: 'bold', color: '#374151' }]}>المبلغ المستحق من الزبون</Text>
          </View>
          
          <View style={s.profitRow}>
            <View style={s.profitContent}>
              <Ionicons name="trending-up-outline" size={18} color="#10b981" />
              <Text style={s.profitLabel}>ربحك من هذا الطلب</Text>
            </View>
            <Text style={s.profitVal}>+{order.totalProfit?.toLocaleString()} د.ع 🎉</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  backBtnEmpty: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnEmptyText: { color: '#fff', fontWeight: '600' },

  // ── Header (بدون تدرج) ──
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  headerSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'right',
  },

  // ── Summary Card ──
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  summaryLeft: { alignItems: 'flex-end' },
  summaryLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: 'bold', color: PRIMARY },
  summaryCurrency: { fontSize: 14, color: '#9ca3af' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: { fontSize: 13, fontWeight: 'bold' },

  scroll: { padding: 16, paddingBottom: 40 },

  // ── Cards ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },

  // ── Info Grid ──
  infoGrid: { flexDirection: 'row', gap: 0 },
  infoBlock: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 8 },
  infoDivider: { width: 1, backgroundColor: '#e8edf2' },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right' },
  separator: { height: 1, backgroundColor: '#e8edf2', marginVertical: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },

  // ── Products ──
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  productImg: { width: 52, height: 52, borderRadius: 12 },
  productIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 3, textAlign: 'right' },
  productMeta: { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  productTotal: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },

  // ── Financial Summary (بدون تدرج) ──
  darkCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  darkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  darkLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  darkVal: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  darkDivider: {
    height: 1,
    backgroundColor: '#e8edf2',
    marginVertical: 8,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  profitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profitVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  profitLabel: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
});