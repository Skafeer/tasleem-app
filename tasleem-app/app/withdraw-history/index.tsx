import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const STATUS: any = {
  pending:  { label: 'معلق',   color: '#d97706', bg: '#fef3c7', icon: 'time-outline' },
  approved: { label: 'مقبول',  color: '#059669', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  paid:     { label: 'مدفوع',  color: '#2563eb', bg: '#dbeafe', icon: 'cash-outline' },
  rejected: { label: 'مرفوض', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline' },
};

export default function WithdrawHistoryScreen() {
  const router = useRouter();

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return Array.isArray(data) ? data : [];
    },
  });

  const ws = withdrawals as any[];
  const total    = ws.filter(w => w.status === 'paid').reduce((s, w) => s + w.amount, 0);
  const approved = ws.filter(w => w.status === 'approved' || w.status === 'paid').length;

  const formatDate = (d: string) => d
    ? new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>سجل السحوبات</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>إجمالي المسحوبات المدفوعة</Text>
          <Text style={s.summaryVal}>{total.toLocaleString('ar-IQ')} <Text style={s.summaryUnit}>د.ع</Text></Text>
          <View style={s.chips}>
            <View style={s.chip}>
              <Ionicons name="wallet-outline" size={12} color="#fff" />
              <Text style={s.chipText}>{ws.length} طلب إجمالي</Text>
            </View>
            <View style={[s.chip, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#4ade80" />
              <Text style={[s.chipText, { color: '#4ade80' }]}>{approved} مقبول</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={ws}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}>
                <Ionicons name="wallet-outline" size={40} color={PRIMARY} />
              </View>
              <Text style={s.emptyTitle}>لا توجد سحوبات بعد</Text>
              <Text style={s.emptyText}>ستظهر هنا طلبات السحب التي تقوم بها</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            const st = STATUS[item.status] || STATUS.pending;
            return (
              <View style={s.card}>
                <View style={[s.cardIcon, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={24} color={st.color} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardAmount}>{item.amount?.toLocaleString('ar-IQ')} <Text style={s.cardCurrency}>د.ع</Text></Text>
                  <Text style={s.cardMethod}>{item.method}</Text>
                  {item.accountDetails && <Text style={s.cardDetail}>{item.accountDetails}</Text>}
                  <Text style={s.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { paddingHorizontal: 16, paddingBottom: 24 },
  headerRow:    { flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, marginBottom: 20 },
  backBtn:      { width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  summaryCard:  { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 20 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginBottom: 8 },
  summaryVal:   { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'right', marginBottom: 14 },
  summaryUnit:  { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  chips:        { flexDirection: 'row-reverse', gap: 10 },
  chip:         { flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:     { color: '#fff', fontSize: 12, fontWeight: '600' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:    { width: 80, height: 80, borderRadius: 24, backgroundColor: `${PRIMARY}15`,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  emptyText:    { fontSize: 13, color: '#9ca3af' },
  card:         { backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardIcon:     { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardInfo:     { flex: 1, alignItems: 'flex-end', gap: 3 },
  cardAmount:   { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  cardCurrency: { fontSize: 12, color: '#9ca3af' },
  cardMethod:   { fontSize: 13, color: '#6b7280' },
  cardDetail:   { fontSize: 12, color: '#9ca3af' },
  cardDate:     { fontSize: 11, color: '#d1d5db' },
  badge:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText:    { fontSize: 12, fontWeight: 'bold' },
});
