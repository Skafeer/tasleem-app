import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

export default function StatsScreen() {
  const router = useRouter();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get('/api/orders');
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return Array.isArray(data) ? data : [];
    },
  });

  const all = orders as any[];
  const totalOrders     = all.length;
  const delivered       = all.filter(o => o.status === 'delivered').length;
  const pending         = all.filter(o => o.status === 'pending').length;
  const processing      = all.filter(o => o.status === 'processing').length;
  const returned        = all.filter(o => o.status === 'returned').length;
  const totalRevenue    = all.filter(o => o.status === 'delivered')
                            .reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalProfit     = all.filter(o => o.status === 'delivered')
                            .reduce((s, o) => s + (o.totalProfit || 0), 0);
  const totalWithdrawn  = (withdrawals as any[])
                            .filter(w => w.status === 'approved')
                            .reduce((s, w) => s + w.amount, 0);
  const deliveryRate    = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0;

  const StatCard = ({ icon, label, value, unit, color, bg }: any) => (
    <View style={[sCard.card, { backgroundColor: bg || '#fff' }]}>
      <View style={[sCard.icon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={sCard.val}>{value}</Text>
      {unit && <Text style={sCard.unit}>{unit}</Text>}
      <Text style={sCard.label}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={s.title}>الإحصائيات</Text>
      </View>

      {ordersLoading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

          {/* Overview Dark Card */}
          <View style={s.darkCard}>
            <View style={s.darkGlow} />
            <Text style={s.darkLabel}>إجمالي الأرباح المحققة</Text>
            <Text style={s.darkVal}>{totalProfit.toLocaleString()} <Text style={s.darkUnit}>د.ع</Text></Text>
            <View style={s.darkRow}>
              <View style={s.darkChip}>
                <Text style={s.darkChipText}>{totalOrders} طلب إجمالي</Text>
              </View>
              <View style={[s.darkChip, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
                <Text style={[s.darkChipText, { color: '#4ade80' }]}>
                  نسبة التوصيل {deliveryRate}%
                </Text>
              </View>
            </View>
          </View>

          {/* Orders Stats */}
          <Text style={s.secTitle}>إحصائيات الطلبات</Text>
          <View style={s.grid}>
            <StatCard icon="cube-outline"            label="إجمالي الطلبات"  value={totalOrders}  color="#6b7280" />
            <StatCard icon="checkmark-circle-outline" label="تم التوصيل"     value={delivered}    color="#059669" />
            <StatCard icon="time-outline"            label="قيد الانتظار"    value={pending}      color="#d97706" />
            <StatCard icon="sync-outline"            label="قيد التجهيز"     value={processing}   color="#2563eb" />
            <StatCard icon="close-circle-outline"   label="راجع"            value={returned}     color="#dc2626" />
            <StatCard icon="trending-up-outline"    label="نسبة التوصيل"    value={`${deliveryRate}%`} color={PRIMARY} />
          </View>

          {/* Financial Stats */}
          <Text style={s.secTitle}>الإحصائيات المالية</Text>
          <View style={s.grid}>
            <StatCard icon="cash-outline"    label="إجمالي المبيعات"    value={totalRevenue.toLocaleString()}   unit="د.ع" color="#8b5cf6" />
            <StatCard icon="wallet-outline"  label="صافي الأرباح"       value={totalProfit.toLocaleString()}    unit="د.ع" color="#059669" />
            <StatCard icon="arrow-up-circle-outline" label="إجمالي المسحوبات" value={totalWithdrawn.toLocaleString()} unit="د.ع" color="#f97316" />
            <StatCard icon="save-outline"    label="الرصيد الحالي"      value={(user?.balance || 0).toLocaleString()} unit="د.ع" color={PRIMARY} />
          </View>

          {/* Delivery Rate Bar */}
          <Text style={s.secTitle}>معدل الأداء</Text>
          <View style={s.perfCard}>
            <View style={s.perfRow}>
              <Text style={s.perfVal}>{deliveryRate}%</Text>
              <Text style={s.perfLabel}>نسبة نجاح التوصيل</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${deliveryRate}%` as any }]} />
            </View>

            <View style={s.perfRow}>
              <Text style={[s.perfVal, { color: '#dc2626' }]}>
                {totalOrders > 0 ? Math.round((returned / totalOrders) * 100) : 0}%
              </Text>
              <Text style={s.perfLabel}>نسبة الإرجاع</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, {
                backgroundColor: '#dc2626',
                width: `${totalOrders > 0 ? Math.round((returned / totalOrders) * 100) : 0}%` as any
              }]} />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  darkCard: { backgroundColor: '#1f2937', borderRadius: 24,
    padding: 24, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#111827', shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  darkGlow: { position: 'absolute', top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)' },
  darkLabel: { fontSize: 13, color: '#9ca3af', textAlign: 'right', marginBottom: 8 },
  darkVal: { fontSize: 36, fontWeight: 'bold', color: '#fff',
    textAlign: 'right', marginBottom: 16 },
  darkUnit: { fontSize: 18, color: '#6b7280' },
  darkRow: { flexDirection: 'row-reverse', gap: 10 },
  darkChip: { backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  darkChipText: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
  secTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  perfCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, gap: 12 },
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perfLabel: { fontSize: 13, color: '#6b7280' },
  perfVal: { fontSize: 18, fontWeight: 'bold', color: PRIMARY },
  barBg: { height: 10, backgroundColor: '#f3f4f6', borderRadius: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 10 },
});

const sCard = StyleSheet.create({
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 18,
    padding: 16, alignItems: 'flex-end',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  icon: { width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  val: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  unit: { fontSize: 11, color: '#9ca3af' },
  label: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
