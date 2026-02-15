import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '../../src/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

export default function WalletScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return data;
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>المحفظة</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>الرصيد المتاح</Text>
        <Text style={styles.balanceValue}>
          {(user?.balance || 0).toLocaleString()} د.ع
        </Text>
        <View style={styles.pendingRow}>
          <Ionicons name="time-outline" size={14} color="#a0b4d0" />
          <Text style={styles.pendingText}>
            معلق: {(user?.pendingBalance || 0).toLocaleString()} د.ع
          </Text>
        </View>
        <TouchableOpacity
          style={styles.withdrawBtn}
          onPress={() => router.push('/withdraw')}
        >
          <Text style={styles.withdrawText}>طلب سحب</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>سجل السحوبات</Text>

      {isLoading
        ? <ActivityIndicator color="#1E3A6E" style={{ marginTop: 20 }} />
        : <FlatList
            data={withdrawals}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Text style={styles.empty}>لا توجد سحوبات بعد</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.withdrawCard}>
                <View>
                  <Text style={styles.withdrawAmount}>
                    {item.amount.toLocaleString()} د.ع
                  </Text>
                  <Text style={styles.withdrawMethod}>{item.method}</Text>
                </View>
                <View style={[styles.badge,
                  { backgroundColor: item.status === 'approved' ? '#d1fae5' : '#fef3c7' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '600',
                    color: item.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                    {item.status === 'approved' ? 'مقبول' :
                     item.status === 'rejected' ? 'مرفوض' : 'معلق'}
                  </Text>
                </View>
              </View>
            )}
          />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#fff', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold',
    color: '#1E3A6E', textAlign: 'right' },
  balanceCard: { backgroundColor: '#1E3A6E', margin: 16,
    borderRadius: 20, padding: 24, alignItems: 'center' },
  balanceLabel: { color: '#a0b4d0', fontSize: 14, marginBottom: 8 },
  balanceValue: { color: '#fff', fontSize: 36,
    fontWeight: 'bold', marginBottom: 8 },
  pendingRow: { flexDirection: 'row', gap: 4,
    alignItems: 'center', marginBottom: 20 },
  pendingText: { color: '#a0b4d0', fontSize: 13 },
  withdrawBtn: { backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 12 },
  withdrawText: { color: '#1E3A6E', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a',
    textAlign: 'right', marginHorizontal: 16, marginBottom: 4 },
  withdrawCard: { backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 1,
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center' },
  withdrawAmount: { fontSize: 15, fontWeight: 'bold',
    color: '#1E3A6E', textAlign: 'right' },
  withdrawMethod: { fontSize: 12, color: '#888', textAlign: 'right' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
});
