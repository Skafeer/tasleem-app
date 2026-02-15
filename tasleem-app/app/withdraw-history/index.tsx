import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const STATUS: any = {
  pending:  { label: 'معلق',   color: '#d97706', bg: '#fef3c7', icon: 'time-outline' },
  approved: { label: 'مقبول',  color: '#059669', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
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

  const total = (withdrawals as any[]).reduce((s: number, w: any) =>
    w.status === 'approved' ? s + w.amount : s, 0);

  const formatDate = (d: string) => d
    ? new Date(d).toLocaleDateString('ar-IQ', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : '';

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={s.title}>سجل السحوبات</Text>
      </View>

      {/* Summary Card */}
      <View style={s.summaryCard}>
        <View style={s.summaryGlow} />
        <Text style={s.summaryLabel}>إجمالي المسحوبات المقبولة</Text>
        <Text style={s.summaryVal}>{total.toLocaleString()} <Text style={s.summaryUnit}>د.ع</Text></Text>
        <View style={s.summaryRow}>
          <View style={s.summaryChip}>
            <Text style={s.summaryChipText}>{(withdrawals as any[]).length} طلب إجمالي</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: 'rgba(74,222,128,0.15)' }]}>
            <Text style={[s.summaryChipText, { color: '#4ade80' }]}>
              {(withdrawals as any[]).filter((w: any) => w.status === 'approved').length} مقبول
            </Text>
          </View>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={withdrawals as any[]}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="wallet-outline" size={56} color="#e5e7eb" />
              <Text style={s.emptyText}>لا توجد سحوبات بعد</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            const st = STATUS[item.status] || STATUS.pending;
            return (
              <View style={s.card}>
                {/* Right: Icon */}
                <View style={[s.cardIcon, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={24} color={st.color} />
                </View>

                {/* Middle: Info */}
                <View style={s.cardInfo}>
                  <Text style={s.cardAmount}>{item.amount?.toLocaleString()} د.ع</Text>
                  <Text style={s.cardMethod}>{item.method}</Text>
                  {item.accountDetails && (
                    <Text style={s.cardDetail}>{item.accountDetails}</Text>
                  )}
                  <Text style={s.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>

                {/* Left: Badge */}
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  summaryCard: { margin: 16, backgroundColor: '#1f2937',
    borderRadius: 24, padding: 24, overflow: 'hidden',
    shadowColor: '#111827', shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  summaryGlow: { position: 'absolute', top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)' },
  summaryLabel: { fontSize: 13, color: '#9ca3af',
    textAlign: 'right', marginBottom: 8 },
  summaryVal: { fontSize: 36, fontWeight: 'bold',
    color: '#fff', textAlign: 'right', marginBottom: 16 },
  summaryUnit: { fontSize: 18, color: '#6b7280' },
  summaryRow: { flexDirection: 'row-reverse', gap: 10 },
  summaryChip: { backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryChipText: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardIcon: { width: 50, height: 50, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  cardMethod: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  cardDetail: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  cardDate: { fontSize: 11, color: '#d1d5db' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
});
