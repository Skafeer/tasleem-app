import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY  = '#0c6679';
const { width } = Dimensions.get('window');
const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');

export default function StatsScreen() {
  const router = useRouter();

  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ['merchant-orders-stats'],
    queryFn: async () => { const { data } = await api.get('/api/orders?limit=9999&page=1'); const r = data?.data || data; return Array.isArray(r) ? r : []; },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: withdrawalsRes } = useQuery({
    queryKey: ['merchant-withdrawals-stats'],
    queryFn: async () => { const { data } = await api.get('/api/withdrawals'); return data; },
  });

  const all          = Array.isArray(ordersRes) ? ordersRes as any[] : ((ordersRes as any)?.data || []) as any[];
  const ws           = Array.isArray(withdrawalsRes) ? withdrawalsRes as any[] : [] as any[];

  const totalOrders  = all.length;
  const delivered    = all.filter(o => o.status === 'delivered');
  const pending      = all.filter(o => o.status === 'pending').length;
  const processing   = all.filter(o => ['processing','preparing','shipping'].includes(o.status)).length;
  const returned     = all.filter(o => o.status === 'returned').length;
  const cancelled    = all.filter(o => o.status === 'cancelled').length;
  const totalRevenue = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalProfit  = delivered.reduce((s, o) => s + (o.totalProfit || 0), 0);
  const totalWithdrawn = ws.filter(w => w.status === 'paid').reduce((s: number, w: any) => s + w.amount, 0);
  const deliveryRate = totalOrders > 0 ? Math.round((delivered.length / totalOrders) * 100) : 0;
  const returnRate   = totalOrders > 0 ? Math.round((returned / totalOrders) * 100) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* هيدر */}
      <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>إحصائياتي</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* بطاقة الأرباح الرئيسية */}
        <View style={s.mainCard}>
          <Text style={s.mainLabel}>صافي الأرباح المحققة</Text>
          <Text style={s.mainVal}>{fmt(totalProfit)} <Text style={s.mainUnit}>د.ع</Text></Text>
          <View style={s.mainChips}>
            <View style={s.chip}>
              <Ionicons name="cube-outline" size={12} color="#fff" />
              <Text style={s.chipText}>{totalOrders} طلب</Text>
            </View>
            <View style={[s.chip, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#4ade80" />
              <Text style={[s.chipText, { color: '#4ade80' }]}>{deliveryRate}% توصيل</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {ordersLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={s.loadingText}>جاري تحميل الإحصائيات...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* إحصائيات الطلبات */}
          <Text style={s.secTitle}>إحصائيات الطلبات</Text>
          <View style={s.grid}>
            {[
              { icon: 'cube-outline',             label: 'إجمالي الطلبات', value: totalOrders,        color: '#6b7280', bg: '#f9fafb' },
              { icon: 'checkmark-circle-outline', label: 'تم التوصيل',     value: delivered.length,   color: '#059669', bg: '#f0fdf4' },
              { icon: 'time-outline',             label: 'قيد الانتظار',   value: pending,             color: '#d97706', bg: '#fffbeb' },
              { icon: 'refresh-outline',          label: 'قيد التجهيز',    value: processing,          color: '#2563eb', bg: '#eff6ff' },
              { icon: 'arrow-undo-outline',       label: 'راجع',           value: returned,            color: '#dc2626', bg: '#fef2f2' },
              { icon: 'close-circle-outline',     label: 'ملغي',           value: cancelled,           color: '#9ca3af', bg: '#f9fafb' },
            ].map((item, i) => (
              <View key={i} style={[s.statCard, { backgroundColor: item.bg }]}>
                <View style={[s.statIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={s.statVal}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* الإحصائيات المالية */}
          <Text style={s.secTitle}>الإحصائيات المالية</Text>
          <View style={s.finGrid}>
            {[
              { icon: 'cash-outline',             label: 'إجمالي المبيعات',  value: fmt(totalRevenue),   color: '#8b5cf6' },
              { icon: 'wallet-outline',            label: 'صافي الأرباح',     value: fmt(totalProfit),    color: '#059669' },
              { icon: 'arrow-up-circle-outline',   label: 'إجمالي السحوبات',  value: fmt(totalWithdrawn), color: '#f97316' },
              { icon: 'card-outline',              label: 'الرصيد الحالي',    value: fmt(user?.balance || 0), color: PRIMARY },
            ].map((item, i) => (
              <View key={i} style={s.finCard}>
                <View style={[s.finIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={s.finInfo}>
                  <Text style={s.finLabel}>{item.label}</Text>
                  <Text style={[s.finVal, { color: item.color }]}>{item.value} <Text style={s.finUnit}>د.ع</Text></Text>
                </View>
              </View>
            ))}
          </View>

          {/* معدل الأداء */}
          <Text style={s.secTitle}>معدل الأداء</Text>
          <View style={s.perfCard}>
            <View style={s.perfRow}>
              <Text style={s.perfLabel}>نسبة نجاح التوصيل</Text>
              <Text style={[s.perfVal, { color: '#059669' }]}>{deliveryRate}%</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${deliveryRate}%` as any, backgroundColor: '#059669' }]} />
            </View>

            <View style={[s.perfRow, { marginTop: 16 }]}>
              <Text style={s.perfLabel}>نسبة الإرجاع</Text>
              <Text style={[s.perfVal, { color: '#dc2626' }]}>{returnRate}%</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${returnRate}%` as any, backgroundColor: '#dc2626' }]} />
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { paddingHorizontal: 16, paddingBottom: 24 },
  headerRow:   { flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, marginBottom: 20 },
  backBtn:     { width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  mainCard:    { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 20 },
  mainLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginBottom: 8 },
  mainVal:     { fontSize: 34, fontWeight: 'bold', color: '#fff', textAlign: 'right', marginBottom: 14 },
  mainUnit:    { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  mainChips:   { flexDirection: 'row-reverse', gap: 10 },
  chip:        { flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:    { color: '#fff', fontSize: 12, fontWeight: '600' },

  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#9ca3af', fontSize: 14 },

  scroll:      { padding: 16, paddingBottom: 40 },
  secTitle:    { fontSize: 16, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 12, marginTop: 8 },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard:    { width: (width - 52) / 3, borderRadius: 16, padding: 14, alignItems: 'flex-end',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  statIcon:    { width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statVal:     { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  statLabel:   { fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' },

  finGrid:     { gap: 10, marginBottom: 24 },
  finCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  finIcon:     { width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center' },
  finInfo:     { flex: 1, gap: 4 },
  finLabel:    { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  finVal:      { fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  finUnit:     { fontSize: 12, color: '#9ca3af' },

  perfCard:    { backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  perfRow:     { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  perfLabel:   { fontSize: 13, color: '#6b7280' },
  perfVal:     { fontSize: 18, fontWeight: 'bold' },
  barBg:       { height: 10, backgroundColor: '#f3f4f6', borderRadius: 10, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 10 },
});
