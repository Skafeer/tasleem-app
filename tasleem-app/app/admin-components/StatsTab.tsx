import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY   = '#0c6679';
const SUCCESS   = '#10b981';
const DANGER    = '#ef4444';
const WARNING   = '#f59e0b';
const INFO      = '#3b82f6';
const SECONDARY = '#f5a006';
const PURPLE    = '#8b5cf6';

const { width } = Dimensions.get('window');
const BAR_MAX_WIDTH = width - 80;

export default function StatsTab() {

  const { data: orders = [], isLoading: l1 } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => { const { data } = await api.get('/api/orders'); return data; },
    refetchInterval: 30000,
  });

  const { data: users = [], isLoading: l2 } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data; },
    refetchInterval: 30000,
  });

  const { data: withdrawals = [], isLoading: l3 } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => { const { data } = await api.get('/api/withdrawals'); return data; },
    refetchInterval: 30000,
  });

  if (l1 || l2 || l3) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={s.loadingTxt}>جاري تحميل الإحصائيات...</Text>
    </View>
  );

  // ── حسابات الطلبات ──
  const totalOrders     = (orders as any[]).length;
  const deliveredOrders = (orders as any[]).filter((o: any) => o.status === 'delivered');
  const cancelledOrders = (orders as any[]).filter((o: any) => o.status === 'cancelled');
  const pendingOrders   = (orders as any[]).filter((o: any) => ['pending','processing','preparing','shipping'].includes(o.status));
  const returnedOrders  = (orders as any[]).filter((o: any) => o.status === 'returned');
  const totalRevenue    = deliveredOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
  const totalProfit     = deliveredOrders.reduce((s: number, o: any) => s + (o.totalProfit || 0), 0);
  const deliveryRate    = totalOrders > 0 ? Math.round((deliveredOrders.length / totalOrders) * 100) : 0;

  // ── حسابات التجار ──
  const merchants       = (users as any[]).filter((u: any) => u.role !== 'admin');
  const totalMerchants  = merchants.length;
  const totalBalances   = merchants.reduce((s: number, u: any) => s + (u.balance || 0), 0);

  // أكثر تاجر مبيعاً (حسب عدد الطلبات)
  const merchantOrderCounts: Record<number, { name: string; count: number; profit: number }> = {};
  (orders as any[]).forEach((o: any) => {
    if (!o.merchantId) return;
    if (!merchantOrderCounts[o.merchantId]) {
      const m = merchants.find((u: any) => u.id === o.merchantId);
      merchantOrderCounts[o.merchantId] = { name: m?.storeName || `#${o.merchantId}`, count: 0, profit: 0 };
    }
    merchantOrderCounts[o.merchantId].count++;
    merchantOrderCounts[o.merchantId].profit += (o.totalProfit || 0);
  });
  const topMerchants = Object.values(merchantOrderCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxOrders = topMerchants[0]?.count || 1;

  // ── حسابات السحوبات ──
  const pendingW  = (withdrawals as any[]).filter((w: any) => w.status === 'pending');
  const approvedW = (withdrawals as any[]).filter((w: any) => w.status === 'approved');
  const paidW     = (withdrawals as any[]).filter((w: any) => w.status === 'paid');
  const rejectedW = (withdrawals as any[]).filter((w: any) => w.status === 'rejected');
  const totalPaidAmount    = paidW.reduce((s: number, w: any) => s + (w.amount || 0), 0);
  const totalPendingAmount = [...pendingW, ...approvedW].reduce((s: number, w: any) => s + (w.amount || 0), 0);

  // ── رسم chart الطلبات حسب الحالة ──
  const orderStatuses = [
    { label: 'مكتمل',     count: deliveredOrders.length, color: SUCCESS  },
    { label: 'نشط',       count: pendingOrders.length,   color: INFO     },
    { label: 'ملغي',      count: cancelledOrders.length, color: DANGER   },
    { label: 'مرتجع',     count: returnedOrders.length,  color: WARNING  },
  ];
  const maxStatusCount = Math.max(...orderStatuses.map(s => s.count), 1);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

      {/* ── بطاقات الملخص ── */}
      <Text style={s.sectionTitle}>📊 ملخص عام</Text>
      <View style={s.cardsGrid}>
        {[
          { label: 'إجمالي الطلبات',  value: totalOrders,                             color: INFO,     bg: '#eff6ff', icon: 'bag-outline' },
          { label: 'الإيرادات',        value: `${(totalRevenue/1000).toFixed(1)}k د.ع`, color: SUCCESS,  bg: '#ecfdf5', icon: 'cash-outline' },
          { label: 'الأرباح',          value: `${(totalProfit/1000).toFixed(1)}k د.ع`,  color: PRIMARY,  bg: PRIMARY+'15', icon: 'trending-up-outline' },
          { label: 'التجار',           value: totalMerchants,                           color: PURPLE,   bg: '#f5f3ff', icon: 'storefront-outline' },
          { label: 'نسبة التسليم',     value: `${deliveryRate}%`,                       color: SUCCESS,  bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
          { label: 'سحوبات معلقة',    value: pendingW.length + approvedW.length,       color: WARNING,  bg: '#fffbeb', icon: 'time-outline' },
        ].map((item, i) => (
          <View key={i} style={[s.summaryCard, { borderTopColor: item.color }]}>
            <View style={[s.summaryIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={[s.summaryVal, { color: item.color }]}>{item.value}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── إحصائيات الطلبات ── */}
      <Text style={s.sectionTitle}>📦 إحصائيات الطلبات</Text>
      <View style={s.card}>
        {orderStatuses.map((item, i) => (
          <View key={i} style={s.barRow}>
            <Text style={s.barCount}>{item.count}</Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, {
                width: (item.count / maxStatusCount) * BAR_MAX_WIDTH,
                backgroundColor: item.color,
              }]} />
            </View>
            <Text style={s.barLabel}>{item.label}</Text>
          </View>
        ))}
        <View style={s.divider} />
        <View style={s.rowStats}>
          <View style={s.rowStat}>
            <Text style={[s.rowStatVal, { color: SUCCESS }]}>{totalRevenue.toLocaleString()} د.ع</Text>
            <Text style={s.rowStatLabel}>إجمالي الإيرادات</Text>
          </View>
          <View style={s.rowStatDivider} />
          <View style={s.rowStat}>
            <Text style={[s.rowStatVal, { color: PRIMARY }]}>{totalProfit.toLocaleString()} د.ع</Text>
            <Text style={s.rowStatLabel}>إجمالي الأرباح</Text>
          </View>
        </View>
      </View>

      {/* ── إحصائيات التجار ── */}
      <Text style={s.sectionTitle}>🏪 إحصائيات التجار</Text>
      <View style={s.card}>
        <View style={s.rowStats}>
          <View style={s.rowStat}>
            <Text style={[s.rowStatVal, { color: PURPLE }]}>{totalMerchants}</Text>
            <Text style={s.rowStatLabel}>إجمالي التجار</Text>
          </View>
          <View style={s.rowStatDivider} />
          <View style={s.rowStat}>
            <Text style={[s.rowStatVal, { color: SUCCESS }]}>{totalBalances.toLocaleString()} د.ع</Text>
            <Text style={s.rowStatLabel}>إجمالي الأرصدة</Text>
          </View>
        </View>

        {topMerchants.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.subTitle}>🏆 أكثر التجار مبيعاً</Text>
            {topMerchants.map((m, i) => (
              <View key={i} style={s.merchantRow}>
                <View style={s.merchantMeta}>
                  <Text style={[s.merchantProfit, { color: SUCCESS }]}>{m.profit.toLocaleString()} د.ع</Text>
                  <Text style={s.merchantOrders}>{m.count} طلب</Text>
                </View>
                <View style={s.merchantBarWrap}>
                  <View style={[s.merchantBar, { width: (m.count / maxOrders) * (BAR_MAX_WIDTH * 0.55), backgroundColor: [PRIMARY, SECONDARY, PURPLE, SUCCESS, INFO][i] }]} />
                  <Text style={s.merchantName}>{m.name}</Text>
                </View>
                <View style={[s.rankBadge, { backgroundColor: [PRIMARY, SECONDARY, PURPLE, SUCCESS, INFO][i] + '20' }]}>
                  <Text style={[s.rankTxt, { color: [PRIMARY, SECONDARY, PURPLE, SUCCESS, INFO][i] }]}>#{i + 1}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      {/* ── إحصائيات السحوبات ── */}
      <Text style={s.sectionTitle}>💸 إحصائيات السحوبات</Text>
      <View style={s.card}>
        <View style={s.withdrawGrid}>
          {[
            { label: 'قيد المعالجة', count: pendingW.length,  amount: pendingW.reduce((s: number, w: any) => s + w.amount, 0),  color: WARNING, icon: 'time-outline' },
            { label: 'تم القبول',    count: approvedW.length, amount: approvedW.reduce((s: number, w: any) => s + w.amount, 0), color: INFO,    icon: 'checkmark-outline' },
            { label: 'تم الدفع',     count: paidW.length,     amount: paidW.reduce((s: number, w: any) => s + w.amount, 0),     color: SUCCESS, icon: 'cash-outline' },
            { label: 'مرفوض',        count: rejectedW.length, amount: rejectedW.reduce((s: number, w: any) => s + w.amount, 0), color: DANGER,  icon: 'close-circle-outline' },
          ].map((item, i) => (
            <View key={i} style={[s.withdrawBox, { borderColor: item.color + '40', backgroundColor: item.color + '08' }]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
              <Text style={[s.withdrawCount, { color: item.color }]}>{item.count}</Text>
              <Text style={s.withdrawLabel}>{item.label}</Text>
              <Text style={[s.withdrawAmount, { color: item.color }]}>{item.amount.toLocaleString()} د.ع</Text>
            </View>
          ))}
        </View>
        <View style={s.divider} />
        <View style={s.rowStats}>
          <View style={s.rowStat}>
            <Text style={[s.rowStatVal, { color: SUCCESS }]}>{totalPaidAmount.toLocaleString()} د.ع</Text>
            <Text style={s.rowStatLabel}>إجمالي المدفوع</Text>
          </View>
          <View style={s.rowStatDivider} />
          <View style={s.rowStat}>
            <Text style={[s.rowStatVal, { color: WARNING }]}>{totalPendingAmount.toLocaleString()} د.ع</Text>
            <Text style={s.rowStatLabel}>قيد الانتظار</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { padding: 12, paddingBottom: 50 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 10, marginTop: 6 },

  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, width: (width - 44) / 2,
    alignItems: 'center', gap: 6, borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryIcon:  { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryVal:   { fontSize: 20, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },

  barRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  barLabel: { fontSize: 12, color: '#374151', fontWeight: '600', width: 50, textAlign: 'right' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden' },
  barFill:  { height: 10, borderRadius: 5 },
  barCount: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', width: 28, textAlign: 'left' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  rowStats:      { flexDirection: 'row-reverse' },
  rowStat:       { flex: 1, alignItems: 'center', gap: 4 },
  rowStatDivider:{ width: 1, backgroundColor: '#f3f4f6' },
  rowStatVal:    { fontSize: 15, fontWeight: 'bold' },
  rowStatLabel:  { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  subTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textAlign: 'right', marginBottom: 12 },
  merchantRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
  rankBadge:      { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rankTxt:        { fontSize: 12, fontWeight: 'bold' },
  merchantBarWrap:{ flex: 1, gap: 4 },
  merchantName:   { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'right' },
  merchantBar:    { height: 6, borderRadius: 3 },
  merchantMeta:   { alignItems: 'flex-start', gap: 2 },
  merchantOrders: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  merchantProfit: { fontSize: 11, fontWeight: '700' },

  withdrawGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  withdrawBox:    { width: (width - 68) / 2, borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1.5 },
  withdrawCount:  { fontSize: 22, fontWeight: 'bold' },
  withdrawLabel:  { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  withdrawAmount: { fontSize: 11, fontWeight: '700' },
});
