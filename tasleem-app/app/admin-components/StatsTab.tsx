import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../src/lib/api';

const PRIMARY   = '#0c6679';
const SUCCESS   = '#10b981';
const DANGER    = '#ef4444';
const WARNING   = '#f59e0b';
const INFO      = '#3b82f6';
const SECONDARY = '#f5a006';
const PURPLE    = '#8b5cf6';

const { width } = Dimensions.get('window');
const BAR_W = width - 80;

const fmt  = (n: number) => n.toLocaleString('ar-IQ');
const fmtK = (n: number) => Math.round(n).toLocaleString('ar-IQ');

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export default function StatsTab() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

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
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data; },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  if (l1 || l2 || l3) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={s.loadingTxt}>جاري تحميل الإحصائيات...</Text>
    </View>
  );

  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const today     = now.toDateString();

  // ── حسابات الطلبات ──
  const allOrders      = orders as any[];
  const delivered      = allOrders.filter(o => o.status === 'delivered');
  const cancelled      = allOrders.filter(o => o.status === 'cancelled');
  const returned       = allOrders.filter(o => o.status === 'returned');
  const active         = allOrders.filter(o => ['pending','processing','preparing','shipping','postponed'].includes(o.status));
  const monthOrders    = allOrders.filter(o => { const d = new Date(o.createdAt); return d.getMonth()===thisMonth && d.getFullYear()===thisYear; });
  const todayOrders    = allOrders.filter(o => new Date(o.createdAt).toDateString() === today);
  const deliveryRate   = allOrders.length > 0 ? Math.round((delivered.length / allOrders.length) * 100) : 0;

  // ── الإيرادات (من سعر جملة التاجر = totalAmount) ──
  const totalRevenue   = delivered.reduce((s, o) => s + ((o.totalAmount || 0) - (o.shippingCost || 0)), 0);
  // ── الأرباح (الفرق بين سعر الشركة وسعر التاجر = totalProfit) ──
  const totalProfit    = delivered.reduce((s, o) => s + (o.totalProfit || 0), 0);

  // الإيرادات الشهرية (هذا الشهر)
  const monthDelivered = monthOrders.filter(o => o.status === 'delivered');
  const monthRevenue   = monthDelivered.reduce((s, o) => s + ((o.totalAmount || 0) - (o.shippingCost || 0)), 0);
  const monthProfit    = monthDelivered.reduce((s, o) => s + (o.totalProfit || 0), 0);

  // الإيرادات السنوية
  const yearDelivered  = delivered.filter(o => new Date(o.createdAt).getFullYear() === thisYear);
  const yearRevenue    = yearDelivered.reduce((s, o) => s + ((o.totalAmount || 0) - (o.shippingCost || 0)), 0);
  const yearProfit     = yearDelivered.reduce((s, o) => s + (o.totalProfit || 0), 0);

  // ── المستخدمين ──
  const merchants      = (users as any[]).filter(u => u.role !== 'admin');
  const newThisMonth   = merchants.filter(u => {
    const d = new Date(u.createdAt);
    return d.getMonth()===thisMonth && d.getFullYear()===thisYear;
  });

  // ── أكثر 5 مستخدمين نشاطاً ──
  const merchantMap: Record<number, { name: string; count: number; revenue: number; profit: number }> = {};
  allOrders.forEach(o => {
    if (!o.merchantId) return;
    if (!merchantMap[o.merchantId]) {
      const m = merchants.find(u => u.id === o.merchantId);
      merchantMap[o.merchantId] = { name: m?.storeName || `#${o.merchantId}`, count: 0, revenue: 0, profit: 0 };
    }
    merchantMap[o.merchantId].count++;
    if (o.status === 'delivered') {
      merchantMap[o.merchantId].revenue += ((o.totalAmount || 0) - (o.shippingCost || 0));
      merchantMap[o.merchantId].profit  += (o.totalProfit || 0);
    }
  });
  const top5 = Object.values(merchantMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCount = top5[0]?.count || 1;

  // ── الإيرادات الشهرية (آخر 6 أشهر) ──
  const last6: { label: string; revenue: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const m = d.getMonth(); const y = d.getFullYear();
    const mo = delivered.filter(o => { const od = new Date(o.createdAt); return od.getMonth()===m && od.getFullYear()===y; });
    last6.push({
      label: MONTHS[m],
      revenue: mo.reduce((s, o) => s + ((o.totalAmount || 0) - (o.shippingCost || 0)), 0),
      profit:  mo.reduce((s, o) => s + (o.totalProfit || 0), 0),
    });
  }
  const maxMonthRev = Math.max(...last6.map(m => m.revenue), 1);

  // ── السحوبات ──
  const ws          = withdrawals as any[];
  const pendingW    = ws.filter(w => w.status === 'pending');
  const approvedW   = ws.filter(w => w.status === 'approved');
  const paidW       = ws.filter(w => w.status === 'paid');
  const rejectedW   = ws.filter(w => w.status === 'rejected');
  const pendingWAmt = [...pendingW, ...approvedW].reduce((s, w) => s + (w.amount||0), 0);
  const paidWAmt    = paidW.reduce((s, w) => s + (w.amount||0), 0);

  const MERCHANT_COLORS = [PRIMARY, SECONDARY, PURPLE, SUCCESS, INFO];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
    >

      {/* ══ ١. الملخص الرئيسي ══ */}
      <SectionTitle icon="stats-chart" title="الملخص الرئيسي" />
      <View style={s.grid2}>
        <StatCard icon="cash-outline"            color={SUCCESS}  bg="#ecfdf5"      label="الإيرادات الكلية"        value={`${fmtK(totalRevenue)} د.ع`} />
        <StatCard icon="trending-up-outline"     color={PRIMARY}  bg={PRIMARY+'15'} label="الأرباح الكلية"          value={`${fmtK(totalProfit)} د.ع`} />
        <StatCard icon="bag-outline"             color={INFO}     bg="#eff6ff"      label="إجمالي الطلبات"          value={allOrders.length} />
        <StatCard icon="people-outline"          color={PURPLE}   bg="#f5f3ff"      label="إجمالي المستخدمين"       value={merchants.length} />
        <StatCard icon="person-add-outline"      color={SECONDARY} bg="#fffbeb"     label="مستخدمون جدد هذا الشهر" value={newThisMonth.length} />
        <StatCard icon="today-outline"           color={INFO}     bg="#eff6ff"      label="طلبات اليوم"             value={todayOrders.length} />
        <StatCard icon="calendar-outline"        color={PRIMARY}  bg={PRIMARY+'15'} label="طلبات هذا الشهر"        value={monthOrders.length} />
        <StatCard icon="checkmark-circle-outline" color={SUCCESS} bg="#ecfdf5"      label="نسبة التسليم"           value={`${deliveryRate}%`} />
        <StatCard icon="time-outline"            color={WARNING}  bg="#fffbeb"      label="سحوبات معلقة"           value={pendingW.length + approvedW.length} />
        <StatCard icon="cube-outline"            color={PURPLE}   bg="#f5f3ff"      label="المنتجات"               value={(products as any[]).length} />
      </View>

      {/* ══ ٢. الإيرادات والأرباح ══ */}
      <SectionTitle icon="cash" title="الإيرادات والأرباح" />
      <View style={s.card}>
        <View style={s.revenueGrid}>
          <RevenueBox label="إيرادات شهر" sublabel={MONTHS[thisMonth]} value={monthRevenue} color={SUCCESS} />
          <RevenueBox label="أرباح شهر"   sublabel={MONTHS[thisMonth]} value={monthProfit}  color={PRIMARY} />
          <RevenueBox label="إيرادات سنة" sublabel={String(thisYear)}  value={yearRevenue}  color={INFO} />
          <RevenueBox label="أرباح سنة"   sublabel={String(thisYear)}  value={yearProfit}   color={PURPLE} />
        </View>
      </View>

      {/* ══ ٣. مخطط آخر ٦ أشهر ══ */}
      <SectionTitle icon="bar-chart" title="الإيرادات — آخر ٦ أشهر" />
      <View style={s.card}>
        {last6.map((m, i) => (
          <View key={i} style={s.monthRow}>
            <View style={s.monthMeta}>
              <Text style={[s.monthVal, { color: SUCCESS }]}>{fmtK(m.revenue)}</Text>
              <Text style={[s.monthProfit, { color: PRIMARY }]}>ربح: {fmtK(m.profit)}</Text>
            </View>
            <View style={s.monthBars}>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: m.revenue > 0 ? Math.max((m.revenue/maxMonthRev)*(BAR_W*0.55), 4) : 0, backgroundColor: SUCCESS }]} />
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: m.profit > 0 ? Math.max((m.profit/maxMonthRev)*(BAR_W*0.55), 4) : 0, backgroundColor: PRIMARY }]} />
              </View>
            </View>
            <Text style={s.monthLabel}>{m.label}</Text>
          </View>
        ))}
        <View style={s.legend}>
          <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: PRIMARY }]} /><Text style={s.legendTxt}>الأرباح</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: SUCCESS }]} /><Text style={s.legendTxt}>الإيرادات</Text></View>
        </View>
      </View>

      {/* ══ ٤. الطلبات ══ */}
      <SectionTitle icon="bag-handle" title="إحصائيات الطلبات" />
      <View style={s.card}>
        {[
          { label: 'مكتمل',    count: delivered.length, color: SUCCESS  },
          { label: 'نشط',      count: active.length,    color: INFO     },
          { label: 'ملغي',     count: cancelled.length, color: DANGER   },
          { label: 'مرتجع',    count: returned.length,  color: WARNING  },
        ].map((item, i) => {
          const max = Math.max(delivered.length, active.length, cancelled.length, returned.length, 1);
          return (
            <View key={i} style={s.barRow}>
              <Text style={s.barCount}>{item.count}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: (item.count/max)*BAR_W*0.7, backgroundColor: item.color }]} />
              </View>
              <Text style={s.barLabel}>{item.label}</Text>
            </View>
          );
        })}
        <View style={s.divider} />
        <View style={s.rowStats}>
          <StatPair label="إيرادات الطلبات" value={`${fmt(totalRevenue)} د.ع`} color={SUCCESS} />
          <View style={s.rowDiv} />
          <StatPair label="أرباح الطلبات"   value={`${fmt(totalProfit)} د.ع`}  color={PRIMARY} />
        </View>
      </View>

      {/* ══ ٥. أكثر ٥ مستخدمين نشاطاً ══ */}
      <SectionTitle icon="trophy" title="أكثر ٥ تجار نشاطاً" />
      <View style={s.card}>
        {top5.length === 0 ? (
          <Text style={s.emptyTxt}>لا توجد بيانات</Text>
        ) : top5.map((m, i) => (
          <View key={i} style={s.merchantRow}>
            <View style={[s.rankBadge, { backgroundColor: MERCHANT_COLORS[i] + '20' }]}>
              <Text style={[s.rankTxt, { color: MERCHANT_COLORS[i] }]}>#{i+1}</Text>
            </View>
            <View style={s.merchantInfo}>
              <Text style={s.merchantName}>{m.name}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: Math.max((m.count/maxCount)*(BAR_W*0.5), 4), backgroundColor: MERCHANT_COLORS[i] }]} />
              </View>
            </View>
            <View style={s.merchantStats}>
              <Text style={[s.mStatVal, { color: MERCHANT_COLORS[i] }]}>{m.count} طلب</Text>
              <Text style={[s.mStatSub, { color: SUCCESS }]}>{fmtK(m.revenue)} د.ع</Text>
              <Text style={[s.mStatSub, { color: PRIMARY }]}>ربح: {fmtK(m.profit)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ══ ٦. السحوبات ══ */}
      <SectionTitle icon="wallet" title="إحصائيات السحوبات" />
      <View style={s.card}>
        <View style={s.wGrid}>
          {[
            { label: 'معلق',     count: pendingW.length,  amount: pendingW.reduce((s,w)=>s+(w.amount||0),0),  color: WARNING, icon: 'time-outline' },
            { label: 'مقبول',    count: approvedW.length, amount: approvedW.reduce((s,w)=>s+(w.amount||0),0), color: INFO,    icon: 'checkmark-outline' },
            { label: 'مدفوع',    count: paidW.length,     amount: paidW.reduce((s,w)=>s+(w.amount||0),0),     color: SUCCESS, icon: 'cash-outline' },
            { label: 'مرفوض',    count: rejectedW.length, amount: rejectedW.reduce((s,w)=>s+(w.amount||0),0), color: DANGER,  icon: 'close-circle-outline' },
          ].map((item, i) => (
            <View key={i} style={[s.wBox, { borderColor: item.color+'40', backgroundColor: item.color+'08' }]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
              <Text style={[s.wCount, { color: item.color }]}>{item.count}</Text>
              <Text style={s.wLabel}>{item.label}</Text>
              <Text style={[s.wAmount, { color: item.color }]}>{fmtK(item.amount)} د.ع</Text>
            </View>
          ))}
        </View>
        <View style={s.divider} />
        <View style={s.rowStats}>
          <StatPair label="إجمالي المدفوع"   value={`${fmt(paidWAmt)} د.ع`}    color={SUCCESS} />
          <View style={s.rowDiv} />
          <StatPair label="قيد الانتظار"     value={`${fmt(pendingWAmt)} د.ع`}  color={WARNING} />
        </View>
      </View>

    </ScrollView>
  );
}

// ── مكونات مساعدة ──
function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={16} color={PRIMARY} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function StatCard({ icon, color, bg, label, value }: any) {
  return (
    <View style={[s.statCard, { borderTopColor: color }]}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function RevenueBox({ label, sublabel, value, color }: any) {
  return (
    <View style={[s.revBox, { borderColor: color+'30' }]}>
      <Text style={[s.revVal, { color }]}>{fmtK(value)} د.ع</Text>
      <Text style={s.revLabel}>{label}</Text>
      <Text style={s.revSub}>{sublabel}</Text>
    </View>
  );
}

function StatPair({ label, value, color }: any) {
  return (
    <View style={s.statPair}>
      <Text style={[s.statPairVal, { color }]}>{value}</Text>
      <Text style={s.statPairLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { padding: 12, paddingBottom: 60 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt:   { textAlign: 'center', color: '#9ca3af', padding: 20 },

  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 },
  sectionTitle:  { fontSize: 15, fontWeight: 'bold', color: '#111827' },

  // Grid 2 cols
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, width: (width-44)/2,
    alignItems: 'center', gap: 6, borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statVal:   { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },

  // Revenue boxes
  revenueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  revBox:  { width: (width-68)/2, borderRadius: 14, padding: 14, borderWidth: 1.5, alignItems: 'center', gap: 4 },
  revVal:  { fontSize: 16, fontWeight: 'bold' },
  revLabel:{ fontSize: 12, color: '#374151', fontWeight: '700' },
  revSub:  { fontSize: 11, color: '#9ca3af' },

  // Monthly chart
  monthRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 },
  monthLabel:  { fontSize: 11, color: '#374151', fontWeight: '600', width: 45, textAlign: 'right' },
  monthMeta:   { width: 55, alignItems: 'flex-start' },
  monthVal:    { fontSize: 11, fontWeight: 'bold' },
  monthProfit: { fontSize: 10, fontWeight: '600' },
  monthBars:   { flex: 1, gap: 4 },
  legend:      { flexDirection: 'row-reverse', justifyContent: 'center', gap: 20, marginTop: 12 },
  legendItem:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendTxt:   { fontSize: 11, color: '#6b7280', fontWeight: '600' },

  // Bars
  barRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  barLabel: { fontSize: 12, color: '#374151', fontWeight: '600', width: 48, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: 8, borderRadius: 4 },
  barCount: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', width: 28, textAlign: 'left' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  rowStats: { flexDirection: 'row-reverse' },
  rowDiv:   { width: 1, backgroundColor: '#f3f4f6' },
  statPair: { flex: 1, alignItems: 'center', gap: 4 },
  statPairVal:   { fontSize: 14, fontWeight: 'bold' },
  statPairLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  // Merchants
  merchantRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 14 },
  rankBadge:    { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rankTxt:      { fontSize: 12, fontWeight: 'bold' },
  merchantInfo: { flex: 1, gap: 6 },
  merchantName: { fontSize: 12, color: '#374151', fontWeight: '700', textAlign: 'right' },
  merchantStats:{ alignItems: 'flex-end', gap: 2 },
  mStatVal:     { fontSize: 12, fontWeight: 'bold' },
  mStatSub:     { fontSize: 10, fontWeight: '600' },

  // Withdrawals
  wGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wBox:    { width: (width-68)/2, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1.5 },
  wCount:  { fontSize: 22, fontWeight: 'bold' },
  wLabel:  { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  wAmount: { fontSize: 11, fontWeight: '700' },
});
