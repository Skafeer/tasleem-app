import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Dimensions, RefreshControl, TouchableOpacity,
} from 'react-native';
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
const BAR_W = width - 96;

const fmt  = (n: number) => Math.round(n).toLocaleString('ar-IQ');
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MERCHANT_COLORS = [PRIMARY, SECONDARY, PURPLE, SUCCESS, INFO];

// ── مكونات مساعدة ──
function SectionTitle({ icon, title, color = PRIMARY }: { icon: any; title: string; color?: string }) {
  return (
    <View style={[s.sectionHeader, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[s.sectionTitle, { color }]}>{title}</Text>
    </View>
  );
}

function KpiCard({ icon, color, bg, label, value, sub }: any) {
  return (
    <View style={[s.kpiCard, { borderTopColor: color }]}>
      <View style={[s.kpiIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function BarRow({ label, count, max, color, sub }: any) {
  return (
    <View style={s.barRow}>
      <View style={s.barMeta}>
        <Text style={s.barCount}>{count}</Text>
        {sub ? <Text style={s.barSub}>{sub}</Text> : null}
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: count > 0 ? Math.max((count/max)*BAR_W, 6) : 0, backgroundColor: color }]} />
      </View>
      <Text style={s.barLabel}>{label}</Text>
    </View>
  );
}

export default function StatsTab() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [revenueTab, setRevenueTab] = useState<'day'|'week'|'month'|'year'>('month');

  const { data: statsData, isLoading: l1 } = useQuery({
    queryKey: ['admin-stats-data'],
    queryFn: async () => { const { data } = await api.get('/api/admin/stats-data'); return data; },
    refetchInterval: 30000,
  });
  const l2 = false, l3 = false, l4 = false;
  const orders      = statsData?.orders      || [];
  const users       = statsData?.users       || [];
  const withdrawals = statsData?.withdrawals || [];
  const products    = statsData?.products    || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  // تحقق إن البيانات arrays
  if (!Array.isArray(orders) || !Array.isArray(users) || !Array.isArray(withdrawals) || !Array.isArray(products)) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={s.loadingTxt}>جاري تحميل الإحصائيات...</Text>
      </View>
    );
  }

  if (l1 || l2 || l3 || l4) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={s.loadingTxt}>جاري تحميل الإحصائيات...</Text>
    </View>
  );

  const now        = new Date();
  const thisMonth  = now.getMonth();
  const thisYear   = now.getFullYear();
  const today      = now.toDateString();
  const weekAgo    = new Date(now.getTime() - 7*24*60*60*1000);

  // ── فلترة الطلبات ──
  const allOrders   = orders as any[];
  const delivered   = allOrders.filter(o => o.status === 'delivered');
  const cancelled   = allOrders.filter(o => o.status === 'cancelled');
  const returned    = allOrders.filter(o => o.status === 'returned');
  const postponed   = allOrders.filter(o => o.status === 'postponed');
  const active      = allOrders.filter(o => ['pending','processing','preparing','shipping'].includes(o.status));

  const todayOrders  = allOrders.filter(o => new Date(o.createdAt).toDateString() === today);
  const weekOrders   = allOrders.filter(o => new Date(o.createdAt) >= weekAgo);
  const monthOrders  = allOrders.filter(o => { const d = new Date(o.createdAt); return d.getMonth()===thisMonth && d.getFullYear()===thisYear; });
  const yearOrders   = allOrders.filter(o => new Date(o.createdAt).getFullYear()===thisYear);

  const deliveryRate = allOrders.length > 0 ? Math.round((delivered.length/allOrders.length)*100) : 0;

  // ── دالة حساب إيرادات وأرباح مجموعة طلبات ──
  const calcRev = (arr: any[]) => {
    const del = arr.filter(o => o.status === 'delivered');
    return {
      revenue:       del.reduce((s, o) => s + ((o.totalAmount||0) - (o.shippingCost||0)), 0),
      companyProfit: del.reduce((s, o) => s + (o.companyProfit||0), 0),
      shipping:      del.reduce((s, o) => s + (o.shippingCost||0), 0),
      count:         del.length,
    };
  };

  const todayRev = calcRev(todayOrders);
  const weekRev  = calcRev(weekOrders);
  const monthRev = calcRev(monthOrders);
  const yearRev  = calcRev(yearOrders);
  const totalRev = calcRev(allOrders);

  const activeRevTab = revenueTab === 'day' ? todayRev : revenueTab === 'week' ? weekRev : revenueTab === 'month' ? monthRev : yearRev;

  // ── آخر 6 أشهر ──
  const last6: { label: string; revenue: number; profit: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const m = d.getMonth(); const y = d.getFullYear();
    const mo = delivered.filter(o => { const od = new Date(o.createdAt); return od.getMonth()===m && od.getFullYear()===y; });
    last6.push({
      label:   MONTHS[m].slice(0,3),
      revenue: mo.reduce((s,o) => s + ((o.totalAmount||0)-(o.shippingCost||0)), 0),
      profit:  mo.reduce((s,o) => s + (o.companyProfit||0), 0),
      count:   mo.length,
    });
  }
  const maxMonthRev = Math.max(...last6.map(m => m.revenue), 1);

  // ── طلبات آخر 7 أيام ──
  const last7Days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i*24*60*60*1000);
    const ds = d.toDateString();
    last7Days.push({ label: DAYS[d.getDay()].slice(0,3), count: allOrders.filter(o => new Date(o.createdAt).toDateString()===ds).length });
  }
  const maxDayCount = Math.max(...last7Days.map(d => d.count), 1);

  // ── المستخدمون ──
  const merchants     = (users as any[]).filter(u => u.role !== 'admin');
  const newThisMonth  = merchants.filter(u => { const d = new Date(u.createdAt); return d.getMonth()===thisMonth && d.getFullYear()===thisYear; });
  const totalBalances = merchants.reduce((s, u) => s + (u.balance||0), 0);
  const totalPending  = merchants.reduce((s, u) => s + (u.pendingBalance||0), 0);

  // ── أكثر 5 تجار نشاطاً ──
  const merchantMap: Record<number, { name: string; count: number; revenue: number; profit: number }> = {};
  allOrders.forEach(o => {
    if (!o.merchantId) return;
    if (!merchantMap[o.merchantId]) {
      const m = merchants.find(u => u.id === o.merchantId);
      merchantMap[o.merchantId] = { name: m?.storeName || `#${o.merchantId}`, count: 0, revenue: 0, profit: 0 };
    }
    merchantMap[o.merchantId].count++;
    if (o.status === 'delivered') {
      merchantMap[o.merchantId].revenue += ((o.totalAmount||0) - (o.shippingCost||0));
      merchantMap[o.merchantId].profit  += (o.companyProfit||0);
    }
  });
  const top5     = Object.values(merchantMap).sort((a,b) => b.count - a.count).slice(0,5);
  const maxCount = top5[0]?.count || 1;

  // ── المنتجات ──
  const allProducts    = products as any[];
  const activeProducts = allProducts.filter(p => p.stock > 0);
  const outOfStock     = allProducts.filter(p => p.stock === 0);
  const lowStock       = allProducts.filter(p => p.stock > 0 && p.stock <= 5);
  const totalStockVal  = allProducts.reduce((s,p) => s + ((p.companyWholesalePrice||0)*p.stock), 0);
  const potentialRev   = allProducts.reduce((s,p) => s + ((p.wholesalePrice||0)*p.stock), 0);
  const potentialProfit= potentialRev - totalStockVal;

  // أكثر 5 منتجات مبيعاً
  const productSales: Record<number,{name:string;count:number;revenue:number}> = {};
  allOrders.forEach(o => {
    if (o.status !== 'delivered') return;
    (o.items||[]).forEach((item: any) => {
      if (!productSales[item.productId]) productSales[item.productId] = { name: item.productName||`#${item.productId}`, count: 0, revenue: 0 };
      productSales[item.productId].count   += (item.quantity||1);
      productSales[item.productId].revenue += ((item.price||0)*(item.quantity||1));
    });
  });
  const top5Products = Object.values(productSales).sort((a,b)=>b.count-a.count).slice(0,5);
  const maxProdCount  = top5Products[0]?.count || 1;

  // ── السحوبات ──
  const ws        = withdrawals as any[];
  const pendingW  = ws.filter(w => w.status==='pending');
  const approvedW = ws.filter(w => w.status==='approved');
  const paidW     = ws.filter(w => w.status==='paid');
  const rejectedW = ws.filter(w => w.status==='rejected');
  const paidAmt   = paidW.reduce((s,w)=>s+(w.amount||0),0);
  const pendingAmt= [...pendingW,...approvedW].reduce((s,w)=>s+(w.amount||0),0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
    >

      {/* ══════════════════════════════════════
          ١. الملخص السريع
      ══════════════════════════════════════ */}
      <SectionTitle icon="stats-chart" title="الملخص السريع" color={PRIMARY} />
      <View style={s.grid2}>
        <KpiCard icon="cash-outline"             color={SUCCESS}   bg="#ecfdf5"       label="إيرادات كلية"           value={`${fmt(totalRev.revenue)} د.ع`} />
        <KpiCard icon="trending-up-outline"      color={PRIMARY}   bg={PRIMARY+'15'}  label="أرباح الشركة الكلية"    value={`${fmt(totalRev.companyProfit)} د.ع`} />
        <KpiCard icon="bag-outline"              color={INFO}      bg="#eff6ff"       label="إجمالي الطلبات"         value={allOrders.length} />
        <KpiCard icon="checkmark-circle-outline" color={SUCCESS}   bg="#ecfdf5"       label="نسبة التسليم"           value={`${deliveryRate}%`} />
        <KpiCard icon="people-outline"           color={PURPLE}    bg="#f5f3ff"       label="إجمالي التجار"          value={merchants.length} />
        <KpiCard icon="cube-outline"             color={SECONDARY} bg="#fffbeb"       label="المنتجات"               value={allProducts.length} />
      </View>

      {/* ══════════════════════════════════════
          ٢. إحصائيات الإيرادات والأرباح
      ══════════════════════════════════════ */}
      <SectionTitle icon="cash" title="الإيرادات وأرباح الشركة" color={SUCCESS} />

      {/* تابس الفترة */}
      <View style={s.tabs}>
        {([['day','اليوم'],['week','الأسبوع'],['month','الشهر'],['year','السنة']] as any[]).map(([k,l]) => (
          <TouchableOpacity key={k} style={[s.tab, revenueTab===k && s.tabActive]} onPress={() => setRevenueTab(k)}>
            <Text style={[s.tabTxt, revenueTab===k && s.tabTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.card}>
        <View style={s.revenueGrid}>
          <View style={[s.revBox, { borderColor: SUCCESS+'40' }]}>
            <Ionicons name="cash-outline" size={20} color={SUCCESS} />
            <Text style={[s.revVal, { color: SUCCESS }]}>{fmt(activeRevTab.revenue)} د.ع</Text>
            <Text style={s.revLabel}>الإيرادات</Text>
            <Text style={s.revSub}>{activeRevTab.count} طلب مسلّم</Text>
          </View>
          <View style={[s.revBox, { borderColor: PRIMARY+'40' }]}>
            <Ionicons name="trending-up-outline" size={20} color={PRIMARY} />
            <Text style={[s.revVal, { color: PRIMARY }]}>{fmt(activeRevTab.companyProfit)} د.ع</Text>
            <Text style={s.revLabel}>أرباح الشركة</Text>
            <Text style={s.revSub}>بعد خصم التكلفة</Text>
          </View>
          <View style={[s.revBox, { borderColor: INFO+'40' }]}>
            <Ionicons name="car-outline" size={20} color={INFO} />
            <Text style={[s.revVal, { color: INFO }]}>{fmt(activeRevTab.shipping)} د.ع</Text>
            <Text style={s.revLabel}>رسوم التوصيل</Text>
            <Text style={s.revSub}>إجمالي الشحن</Text>
          </View>
          <View style={[s.revBox, { borderColor: WARNING+'40' }]}>
            <Ionicons name="calculator-outline" size={20} color={WARNING} />
            <Text style={[s.revVal, { color: WARNING }]}>
              {activeRevTab.revenue > 0 ? `${Math.round((activeRevTab.companyProfit/activeRevTab.revenue)*100)}%` : '0%'}
            </Text>
            <Text style={s.revLabel}>هامش الربح</Text>
            <Text style={s.revSub}>نسبة الأرباح</Text>
          </View>
        </View>
      </View>

      {/* مخطط آخر 6 أشهر */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📈 الإيرادات — آخر ٦ أشهر</Text>
        {last6.map((m, i) => (
          <View key={i} style={s.monthRow}>
            <View style={s.monthMeta}>
              <Text style={[s.monthRev, { color: SUCCESS }]}>{fmt(m.revenue)}</Text>
              <Text style={[s.monthProfit, { color: PRIMARY }]}>{fmt(m.profit)}</Text>
            </View>
            <View style={s.monthBars}>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: m.revenue>0 ? Math.max((m.revenue/maxMonthRev)*BAR_W*0.6, 4) : 0, backgroundColor: SUCCESS }]} />
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: m.profit>0 ? Math.max((m.profit/maxMonthRev)*BAR_W*0.6, 4) : 0, backgroundColor: PRIMARY }]} />
              </View>
            </View>
            <Text style={s.monthLabel}>{m.label}</Text>
          </View>
        ))}
        <View style={s.legend}>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:PRIMARY}]}/><Text style={s.legendTxt}>الأرباح</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:SUCCESS}]}/><Text style={s.legendTxt}>الإيرادات</Text></View>
        </View>
      </View>

      {/* ══════════════════════════════════════
          ٣. إحصائيات الطلبات
      ══════════════════════════════════════ */}
      <SectionTitle icon="bag-handle" title="إحصائيات الطلبات" color={INFO} />
      <View style={s.grid2}>
        <KpiCard icon="today-outline"     color={INFO}    bg="#eff6ff"  label="طلبات اليوم"      value={todayOrders.length} />
        <KpiCard icon="calendar-outline"  color={PRIMARY} bg={PRIMARY+'15'} label="طلبات الأسبوع" value={weekOrders.length} />
        <KpiCard icon="calendar-outline"  color={PURPLE}  bg="#f5f3ff"  label="طلبات الشهر"      value={monthOrders.length} />
        <KpiCard icon="stats-chart"       color={SUCCESS} bg="#ecfdf5"  label="طلبات السنة"      value={yearOrders.length} />
      </View>

      {/* حالات الطلبات */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📦 توزيع الطلبات حسب الحالة</Text>
        {[
          { label: 'مسلّم',  count: delivered.length, color: SUCCESS  },
          { label: 'نشط',    count: active.length,    color: INFO     },
          { label: 'ملغي',   count: cancelled.length, color: DANGER   },
          { label: 'مرتجع',  count: returned.length,  color: WARNING  },
          { label: 'مؤجل',   count: postponed.length, color: PURPLE   },
        ].map((item,i) => (
          <BarRow key={i} label={item.label} count={item.count}
            max={Math.max(delivered.length,active.length,cancelled.length,returned.length,postponed.length,1)}
            color={item.color} />
        ))}
        <View style={s.divider} />
        <View style={s.infoRow}>
          <Ionicons name="checkmark-circle-outline" size={14} color={SUCCESS} />
          <Text style={s.infoTxt}>نسبة التسليم: <Text style={{color:SUCCESS,fontWeight:'bold'}}>{deliveryRate}%</Text></Text>
        </View>
      </View>

      {/* طلبات آخر 7 أيام */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📅 الطلبات — آخر ٧ أيام</Text>
        {last7Days.map((d,i) => (
          <BarRow key={i} label={d.label} count={d.count} max={maxDayCount} color={INFO} />
        ))}
      </View>

      {/* أكثر 5 تجار */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🏆 أكثر ٥ تجار نشاطاً</Text>
        {top5.length === 0
          ? <Text style={s.emptyTxt}>لا توجد بيانات</Text>
          : top5.map((m,i) => (
          <View key={i} style={s.merchantRow}>
            <View style={[s.rankBadge,{backgroundColor:MERCHANT_COLORS[i]+'20'}]}>
              <Text style={[s.rankTxt,{color:MERCHANT_COLORS[i]}]}>#{i+1}</Text>
            </View>
            <View style={s.merchantInfo}>
              <Text style={s.merchantName}>{m.name}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill,{width:Math.max((m.count/maxCount)*BAR_W*0.5,4),backgroundColor:MERCHANT_COLORS[i]}]} />
              </View>
            </View>
            <View style={s.merchantStats}>
              <Text style={[s.mVal,{color:MERCHANT_COLORS[i]}]}>{m.count} طلب</Text>
              <Text style={[s.mSub,{color:SUCCESS}]}>{fmt(m.revenue)} د.ع</Text>
              <Text style={[s.mSub,{color:PRIMARY}]}>ربح: {fmt(m.profit)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ══════════════════════════════════════
          ٤. إحصائيات المنتجات
      ══════════════════════════════════════ */}
      <SectionTitle icon="cube" title="إحصائيات المنتجات" color={SECONDARY} />
      <View style={s.grid2}>
        <KpiCard icon="cube-outline"          color={PRIMARY}   bg={PRIMARY+'15'}  label="إجمالي المنتجات"    value={allProducts.length} />
        <KpiCard icon="checkmark-outline"     color={SUCCESS}   bg="#ecfdf5"       label="متوفر بالمخزون"     value={activeProducts.length} />
        <KpiCard icon="alert-circle-outline"  color={WARNING}   bg="#fffbeb"       label="مخزون منخفض (≤٥)"  value={lowStock.length} />
        <KpiCard icon="close-circle-outline"  color={DANGER}    bg="#fef2f2"       label="نفذ من المخزون"     value={outOfStock.length} />
        <KpiCard icon="cash-outline"          color={SUCCESS}   bg="#ecfdf5"       label="قيمة المخزون"       value={`${fmt(totalStockVal)} د.ع`} sub="بسعر الشركة" />
        <KpiCard icon="trending-up-outline"   color={PRIMARY}   bg={PRIMARY+'15'}  label="الربح المحتمل"      value={`${fmt(potentialProfit)} د.ع`} sub="لو بيع كله" />
      </View>

      {/* أكثر 5 منتجات مبيعاً */}
      {top5Products.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>🔥 أكثر ٥ منتجات مبيعاً</Text>
          {top5Products.map((p,i) => (
            <BarRow key={i} label={p.name.slice(0,16)+(p.name.length>16?'…':'')}
              count={p.count} max={maxProdCount} color={MERCHANT_COLORS[i]}
              sub={`${fmt(p.revenue)} د.ع`} />
          ))}
        </View>
      )}

      {/* ══════════════════════════════════════
          ٥. إحصائيات التجار
      ══════════════════════════════════════ */}
      <SectionTitle icon="storefront" title="إحصائيات التجار" color={PURPLE} />
      <View style={s.grid2}>
        <KpiCard icon="people-outline"     color={PURPLE}   bg="#f5f3ff"   label="إجمالي التجار"         value={merchants.length} />
        <KpiCard icon="person-add-outline" color={SECONDARY} bg="#fffbeb"  label="جدد هذا الشهر"         value={newThisMonth.length} />
        <KpiCard icon="wallet-outline"     color={SUCCESS}   bg="#ecfdf5"  label="إجمالي الأرصدة"        value={`${fmt(totalBalances)} د.ع`} />
        <KpiCard icon="time-outline"       color={WARNING}   bg="#fffbeb"  label="أرصدة معلقة"           value={`${fmt(totalPending)} د.ع`} />
      </View>

      {/* ══════════════════════════════════════
          ٦. إحصائيات السحوبات
      ══════════════════════════════════════ */}
      <SectionTitle icon="wallet" title="إحصائيات السحوبات" color={WARNING} />
      <View style={s.card}>
        <View style={s.wGrid}>
          {[
            { label:'معلق',  count:pendingW.length,  amount:pendingW.reduce((s,w)=>s+(w.amount||0),0),  color:WARNING, icon:'time-outline' },
            { label:'مقبول', count:approvedW.length, amount:approvedW.reduce((s,w)=>s+(w.amount||0),0), color:INFO,    icon:'checkmark-outline' },
            { label:'مدفوع', count:paidW.length,     amount:paidW.reduce((s,w)=>s+(w.amount||0),0),     color:SUCCESS, icon:'cash-outline' },
            { label:'مرفوض', count:rejectedW.length, amount:rejectedW.reduce((s,w)=>s+(w.amount||0),0), color:DANGER,  icon:'close-circle-outline' },
          ].map((item,i) => (
            <View key={i} style={[s.wBox,{borderColor:item.color+'40',backgroundColor:item.color+'08'}]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
              <Text style={[s.wCount,{color:item.color}]}>{item.count}</Text>
              <Text style={s.wLabel}>{item.label}</Text>
              <Text style={[s.wAmount,{color:item.color}]}>{fmt(item.amount)} د.ع</Text>
            </View>
          ))}
        </View>
        <View style={s.divider} />
        <View style={s.rowStats}>
          <View style={s.statPair}>
            <Text style={[s.statPairVal,{color:SUCCESS}]}>{fmt(paidAmt)} د.ع</Text>
            <Text style={s.statPairLabel}>إجمالي المدفوع</Text>
          </View>
          <View style={s.rowDiv} />
          <View style={s.statPair}>
            <Text style={[s.statPairVal,{color:WARNING}]}>{fmt(pendingAmt)} د.ع</Text>
            <Text style={s.statPairLabel}>قيد الانتظار</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { padding: 12, paddingBottom: 60 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt:   { textAlign: 'center', color: '#9ca3af', padding: 20 },

  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 10, borderRightWidth: 3, paddingRight: 8, borderRightColor: PRIMARY },
  sectionTitle:  { fontSize: 15, fontWeight: 'bold', color: '#111827' },

  grid2:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, width: (width-44)/2,
    alignItems: 'center', gap: 5, borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  kpiIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  kpiVal:   { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  kpiLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textAlign: 'center' },
  kpiSub:   { fontSize: 10, color: '#9ca3af', textAlign: 'center' },

  card:      { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#374151', textAlign: 'right', marginBottom: 14 },

  tabs:       { flexDirection: 'row-reverse', gap: 8, marginBottom: 12 },
  tab:        { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  tabActive:  { backgroundColor: PRIMARY },
  tabTxt:     { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  tabTxtActive:{ color: '#fff', fontWeight: 'bold' },

  revenueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  revBox:  { width: (width-68)/2, borderRadius: 14, padding: 14, borderWidth: 1.5, alignItems: 'center', gap: 4 },
  revVal:  { fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  revLabel:{ fontSize: 12, color: '#374151', fontWeight: '700' },
  revSub:  { fontSize: 10, color: '#9ca3af' },

  monthRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
  monthLabel:  { fontSize: 11, color: '#374151', fontWeight: '600', width: 32, textAlign: 'right' },
  monthMeta:   { width: 70, alignItems: 'flex-start', gap: 2 },
  monthRev:    { fontSize: 10, fontWeight: 'bold' },
  monthProfit: { fontSize: 10, fontWeight: '600' },
  monthBars:   { flex: 1, gap: 4 },
  legend:      { flexDirection: 'row-reverse', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendTxt:   { fontSize: 11, color: '#6b7280', fontWeight: '600' },

  barRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabel: { fontSize: 11, color: '#374151', fontWeight: '600', width: 50, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: 8, borderRadius: 4 },
  barMeta:  { width: 60, alignItems: 'flex-start', gap: 1 },
  barCount: { fontSize: 12, fontWeight: 'bold', color: '#374151' },
  barSub:   { fontSize: 9, color: '#9ca3af' },

  divider:  { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  infoRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  infoTxt:  { fontSize: 12, color: '#6b7280' },

  rowStats: { flexDirection: 'row-reverse' },
  rowDiv:   { width: 1, backgroundColor: '#f3f4f6' },
  statPair: { flex: 1, alignItems: 'center', gap: 4 },
  statPairVal:   { fontSize: 14, fontWeight: 'bold' },
  statPairLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  merchantRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  rankBadge:     { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rankTxt:       { fontSize: 12, fontWeight: 'bold' },
  merchantInfo:  { flex: 1, gap: 5 },
  merchantName:  { fontSize: 12, color: '#374151', fontWeight: '700', textAlign: 'right' },
  merchantStats: { alignItems: 'flex-end', gap: 2 },
  mVal:          { fontSize: 12, fontWeight: 'bold' },
  mSub:          { fontSize: 10, fontWeight: '600' },

  wGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wBox:    { width: (width-68)/2, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1.5 },
  wCount:  { fontSize: 22, fontWeight: 'bold' },
  wLabel:  { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  wAmount: { fontSize: 11, fontWeight: '700' },
});
