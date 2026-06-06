import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';
const { width } = Dimensions.get('window');
const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');

export default function StatsScreen() {
  const router = useRouter();

  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ['merchant-orders-stats'],
    queryFn: async () => { 
      const { data } = await api.get('/api/orders?limit=9999&page=1'); 
      const r = data?.data || data; 
      return Array.isArray(r) ? r : []; 
    },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { 
      const { data } = await api.get('/api/auth/me'); 
      return data; 
    },
  });

  // ✅ تعديل: استخدام API الخاص بسحوبات المستخدم فقط (للتاجر)
  const { data: withdrawalsRes } = useQuery({
    queryKey: ['merchant-withdrawals-stats'],
    queryFn: async () => { 
      const { data } = await api.get('/api/withdrawals/my'); 
      return data; 
    },
  });

  const all = Array.isArray(ordersRes) ? ordersRes as any[] : ((ordersRes as any)?.data || []) as any[];
  const ws = Array.isArray(withdrawalsRes) ? withdrawalsRes as any[] : [] as any[];

  const totalOrders = all.length;
  const delivered = all.filter(o => o.status === 'delivered');
  
  // ✅ تعديل الحالات النشطة: processing و shipping فقط
  const processing = all.filter(o => ['processing', 'shipping'].includes(o.status)).length;
  const returned = all.filter(o => o.status === 'returned').length;
  const cancelled = all.filter(o => o.status === 'cancelled').length;
  const totalRevenue = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalProfit = delivered.reduce((s, o) => s + (o.totalProfit || 0), 0);
  const totalWithdrawn = ws.filter(w => w.status === 'paid').reduce((s: number, w: any) => s + w.amount, 0);
  const deliveryRate = totalOrders > 0 ? Math.round((delivered.length / totalOrders) * 100) : 0;
  const returnRate = totalOrders > 0 ? Math.round((returned / totalOrders) * 100) : 0;

  // ✅ إحصائيات الطلبات الجديدة
  const orderStats = [
    { icon: 'cube-outline', label: 'إجمالي الطلبات', value: totalOrders, color: '#6b7280', bg: '#f3f4f6' },
    { icon: 'checkmark-circle-outline', label: 'تم التوصيل', value: delivered.length, color: '#059669', bg: '#ecfdf5' },
    { icon: 'refresh-outline', label: 'قيد المعالجة', value: processing, color: '#3b82f6', bg: '#eff6ff' },
    { icon: 'arrow-undo-outline', label: 'تم الرفض', value: returned, color: '#dc2626', bg: '#fef2f2' },
    { icon: 'close-circle-outline', label: 'تم الإلغاء', value: cancelled, color: '#9ca3af', bg: '#f9fafb' },
  ];

  const financialStats = [
    { icon: 'cash-outline', label: 'إجمالي المبيعات', value: fmt(totalRevenue), color: '#8b5cf6' },
    { icon: 'trending-up-outline', label: 'صافي الأرباح', value: fmt(totalProfit), color: '#059669' },
    { icon: 'arrow-up-circle-outline', label: 'إجمالي السحوبات', value: fmt(totalWithdrawn), color: '#f97316' },
    { icon: 'wallet-outline', label: 'الرصيد الحالي', value: fmt(user?.balance || 0), color: PRIMARY },
  ];

  if (ordersLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <View style={s.headerContent}>
            <View style={{ width: 40 }} />
            <Text style={s.headerTitle}>الإحصائيات</Text>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>جاري تحميل الإحصائيات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header RTL (زر رجوع يمين، عنوان وسط) ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>الإحصائيات</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── بطاقة الأرباح الرئيسية ── */}
        <View style={s.mainCard}>
          <View style={s.mainCardHeader}>
            <View style={s.mainIcon}>
              <Ionicons name="trending-up-outline" size={24} color={PRIMARY} />
            </View>
            <Text style={s.mainLabel}>صافي الأرباح المحققة</Text>
          </View>
          <Text style={s.mainValue}>{fmt(totalProfit)} <Text style={s.mainUnit}>د.ع</Text></Text>
          <View style={s.mainChips}>
            <View style={[s.chip, s.chipTotal]}>
              <Ionicons name="cube-outline" size={12} color={PRIMARY} />
              <Text style={s.chipText}>{totalOrders} طلب</Text>
            </View>
            <View style={[s.chip, s.chipDelivery]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
              <Text style={[s.chipText, { color: '#059669' }]}>{deliveryRate}% توصيل</Text>
            </View>
          </View>
        </View>

        {/* ── إحصائيات الطلبات ── */}
        <Text style={s.sectionTitle}>إحصائيات الطلبات</Text>
        <View style={s.statsGrid}>
          {orderStats.map((item, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: item.bg }]}>
              <View style={[s.statIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.statValue}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── الإحصائيات المالية ── */}
        <Text style={s.sectionTitle}>الإحصائيات المالية</Text>
        <View style={s.financialList}>
          {financialStats.map((item, i) => (
            <View key={i} style={s.financialCard}>
              <View style={[s.financialIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={s.financialInfo}>
                <Text style={s.financialLabel}>{item.label}</Text>
                <Text style={[s.financialValue, { color: item.color }]}>{item.value} <Text style={s.financialUnit}>د.ع</Text></Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── معدل الأداء ── */}
        <Text style={s.sectionTitle}>معدل الأداء</Text>
        <View style={s.performanceCard}>
          <View style={s.performanceRow}>
            <Text style={s.performanceLabel}>نسبة نجاح التوصيل</Text>
            <Text style={[s.performanceValue, { color: '#059669' }]}>{deliveryRate}%</Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${deliveryRate}%`, backgroundColor: '#059669' }]} />
          </View>

          <View style={[s.performanceRow, { marginTop: 16 }]}>
            <Text style={s.performanceLabel}>نسبة الإرجاع</Text>
            <Text style={[s.performanceValue, { color: '#dc2626' }]}>{returnRate}%</Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${returnRate}%`, backgroundColor: '#dc2626' }]} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header RTL (زر رجوع يمين، عنوان وسط) ──
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
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
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── بطاقة الأرباح الرئيسية ──
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  mainIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  mainValue: {
    fontSize: 34,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'right',
    marginBottom: 14,
  },
  mainUnit: {
    fontSize: 16,
    color: '#9ca3af',
  },
  mainChips: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipTotal: {
    backgroundColor: PRIMARY + '12',
  },
  chipDelivery: {
    backgroundColor: '#ecfdf5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },

  // ── إحصائيات الطلبات ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
    marginBottom: 14,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 3,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'right',
  },

  // ── الإحصائيات المالية ──
  financialList: {
    gap: 10,
    marginBottom: 24,
  },
  financialCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  financialIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  financialInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  financialLabel: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
  },
  financialValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  financialUnit: {
    fontSize: 12,
    color: '#9ca3af',
  },

  // ── معدل الأداء ──
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  performanceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});