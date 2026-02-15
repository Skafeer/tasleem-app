import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const STATUS: any = {
  pending:    { label: 'قيد الانتظار', color: '#d97706', bg: '#fef3c7', icon: 'time-outline' },
  processing: { label: 'قيد التجهيز',  color: '#2563eb', bg: '#dbeafe', icon: 'cube-outline' },
  delivered:  { label: 'تم التوصيل',   color: '#059669', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  returned:   { label: 'راجع',          color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline' },
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/orders/${id}`);
      return data;
    },
  });

  if (isLoading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  if (!order) return (
    <View style={s.center}>
      <Text style={{ color: '#9ca3af' }}>لم يتم العثور على الطلب</Text>
    </View>
  );

  const status = STATUS[order.status] || STATUS.pending;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.title}>تفاصيل الطلب #{order.id}</Text>
          <Text style={s.subtitle}>تم الطلب في {formatDate(order.createdAt)}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Status + Amount Card */}
        <View style={s.card}>
          <View style={s.statusRow}>
            {/* Amount */}
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={s.amountLabel}>المبلغ الإجمالي للزبون</Text>
              <Text style={s.amountValue}>{order.totalAmount?.toLocaleString()} د.ع</Text>
            </View>
            {/* Badge */}
            <View style={[s.badge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={16} color={status.color} />
              <Text style={[s.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Customer + Address */}
          <View style={s.infoGrid}>
            <View style={s.infoCol}>
              <View style={s.infoTitleRow}>
                <Ionicons name="person-outline" size={16} color="#9ca3af" />
                <Text style={s.infoTitle}>معلومات الزبون</Text>
              </View>
              <Text style={s.infoMain}>{order.customerName}</Text>
              <View style={s.phoneRow}>
                <Ionicons name="call-outline" size={14} color="#6b7280" />
                <Text style={s.infoSub}>{order.customerPhone}</Text>
              </View>
            </View>

            <View style={s.infoDivider} />

            <View style={s.infoCol}>
              <View style={s.infoTitleRow}>
                <Ionicons name="location-outline" size={16} color="#9ca3af" />
                <Text style={s.infoTitle}>العنوان</Text>
              </View>
              <Text style={s.infoMain}>{order.province}</Text>
              <Text style={s.infoSub}>{order.address}</Text>
            </View>
          </View>
        </View>

        {/* Products Card */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Ionicons name="cube-outline" size={18} color="#9ca3af" />
            <Text style={s.cardTitle}>المنتجات</Text>
          </View>
          {order.items?.map((item: any) => (
            <View key={item.id} style={s.productRow}>
              <View style={s.productIcon}>
                <Ionicons name="cube-outline" size={22} color="#d1d5db" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.productName}>{item.product?.name}</Text>
                <Text style={s.productMeta}>
                  الكمية: {item.quantity} × {item.price?.toLocaleString()} د.ع
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Financial Card - bg gray-900 */}
        <View style={s.darkCard}>
          <View style={s.cardTitleRow}>
            <Ionicons name="receipt-outline" size={18} color="#9ca3af" />
            <Text style={[s.cardTitle, { color: '#9ca3af' }]}>ملخص التكاليف والربح</Text>
          </View>

          <View style={s.darkRow}>
            <Text style={s.darkVal}>
              {(order.totalAmount - order.shippingCost)?.toLocaleString()} د.ع
            </Text>
            <Text style={s.darkLabel}>سعر البيع</Text>
          </View>
          <View style={s.darkRow}>
            <Text style={s.darkVal}>{order.shippingCost?.toLocaleString()} د.ع</Text>
            <Text style={s.darkLabel}>أجرة التوصيل</Text>
          </View>

          <View style={s.darkDivider} />

          <View style={s.darkRow}>
            <Text style={[s.darkVal, { fontSize: 18 }]}>
              {order.totalAmount?.toLocaleString()} د.ع
            </Text>
            <Text style={[s.darkLabel, { color: '#fff', fontWeight: 'bold' }]}>
              المبلغ المستحق من الزبون
            </Text>
          </View>

          <View style={s.darkRow}>
            <Text style={[s.darkVal, { fontSize: 18, color: '#4ade80' }]}>
              +{order.totalProfit?.toLocaleString()} د.ع
            </Text>
            <Text style={[s.darkLabel, { color: '#4ade80', fontWeight: 'bold' }]}>
              ربحك من هذا الطلب
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 16, shadowColor: '#000',
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20 },
  badge: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: 'bold' },
  amountLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  amountValue: { fontSize: 24, fontWeight: 'bold', color: PRIMARY },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 20 },
  infoGrid: { flexDirection: 'row', gap: 16 },
  infoCol: { flex: 1, alignItems: 'flex-end' },
  infoDivider: { width: 1, backgroundColor: '#f3f4f6' },
  infoTitleRow: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 6, marginBottom: 10 },
  infoTitle: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
  infoMain: { fontSize: 14, fontWeight: '600', color: '#374151',
    textAlign: 'right', marginBottom: 4 },
  phoneRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  infoSub: { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  cardTitleRow: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  productRow: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  productIcon: { width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  productMeta: { fontSize: 12, color: '#9ca3af' },
  darkCard: { backgroundColor: '#111827', borderRadius: 20, padding: 20, marginBottom: 16 },
  darkRow: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10 },
  darkLabel: { fontSize: 13, color: '#9ca3af' },
  darkVal: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  darkDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8 },
});
