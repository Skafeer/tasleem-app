import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOrders } from '../../src/hooks/useOrders';

const STATUS: any = {
  pending: { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fef3c7' },
  processing: { label: 'قيد التوصيل', color: '#3b82f6', bg: '#dbeafe' },
  delivered: { label: 'تم التوصيل', color: '#10b981', bg: '#d1fae5' },
  cancelled: { label: 'ملغي', color: '#ef4444', bg: '#fee2e2' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { data: orders, isLoading } = useOrders();

  if (isLoading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1E3A6E" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>طلباتي</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.empty}>لا توجد طلبات بعد</Text>
        }
        renderItem={({ item }) => {
          const s = STATUS[item.status] || STATUS.pending;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/order-details/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.orderId}>طلب #{item.id}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>
                    {s.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.customer}>{item.customerName}</Text>
              <Text style={styles.province}>{item.province}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.profit}>
                  ربح: {item.totalProfit.toLocaleString()} د.ع
                </Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('ar-IQ')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold',
    color: '#1E3A6E', textAlign: 'right' },
  card: { backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 12, elevation: 2 },
  cardTop: { flexDirection: 'row-reverse',
    justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  customer: { fontSize: 14, color: '#555',
    textAlign: 'right', marginBottom: 2 },
  province: { fontSize: 13, color: '#999', textAlign: 'right' },
  cardBottom: { flexDirection: 'row-reverse',
    justifyContent: 'space-between', marginTop: 10 },
  profit: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
  date: { fontSize: 12, color: '#aaa' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
