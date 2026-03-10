import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const STATUS: any = {
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', icon: 'sync-outline' },
  preparing:  { label: 'قيد التجهيز',  color: '#8b5cf6', bg: '#f5f3ff', icon: 'cube-outline' },
  shipping:   { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', icon: 'bicycle-outline' },
  delivered:  { label: 'تم التوصيل',  color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  cancelled:  { label: 'ملغي',         color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
  returned:   { label: 'راجع',          color: '#f97316', bg: '#fff7ed', icon: 'arrow-undo-outline' },
  postponed:  { label: 'مؤجل',         color: '#6b7280', bg: '#f9fafb', icon: 'pause-circle-outline' },
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(d).toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) return (
    <SafeAreaView style={s.container}>
      <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
    </SafeAreaView>
  );

  if (!order) return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Ionicons name="cube-outline" size={48} color="#e5e7eb" />
        <Text style={s.notFound}>لم يتم العثور على الطلب</Text>
      </View>
    </SafeAreaView>
  );

  const status = STATUS[order.status] || STATUS.pending;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* Header */}
      <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <Text style={s.headerTitle}>تفاصيل الطلب #{order.id}</Text>
            <Text style={s.headerSub}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>

        {/* Status + Amount */}
        <View style={s.summaryCard}>
          <View style={s.summaryLeft}>
            <Text style={s.summaryLabel}>المبلغ الإجمالي</Text>
            <Text style={s.summaryAmount}>{order.totalAmount?.toLocaleString()}</Text>
            <Text style={s.summaryCurrency}>د.ع</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={16} color={status.color} />
            <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* معلومات الزبون */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="person-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={s.cardTitle}>معلومات الزبون</Text>
          </View>

          <View style={s.infoGrid}>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>الاسم</Text>
              <Text style={s.infoValue}>{order.customerName || '—'}</Text>
            </View>
            <View style={s.infoDivider} />
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>الهاتف</Text>
              <Text style={s.infoValue}>{order.customerPhone || '—'}</Text>
            </View>
          </View>

          <View style={s.separator} />

          <View style={s.addressRow}>
            <View style={[s.cardIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="location-outline" size={16} color="#10b981" />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.infoLabel}>العنوان</Text>
              <Text style={s.infoValue}>{order.province}{order.address ? ` — ${order.address}` : ''}</Text>
            </View>
          </View>
        </View>

        {/* المنتجات */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="cube-outline" size={18} color="#8b5cf6" />
            </View>
            <Text style={s.cardTitle}>المنتجات ({order.items?.length || 0})</Text>
          </View>

          {order.items?.map((item: any, i: number) => (
            <View key={item.id} style={[s.productRow, i === order.items.length - 1 && { borderBottomWidth: 0 }]}>
              {/* صورة المنتج */}
              {item.product?.images || item.product?.imageUrl ? (
                <Image
                  source={{ uri: (item.product.images?.split(',')[0] || item.product.imageUrl) }}
                  style={s.productImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={s.productIcon}>
                  <Ionicons name="cube-outline" size={22} color={PRIMARY} />
                </View>
              )}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.productName}>{item.product?.name || 'منتج'}</Text>
                <Text style={s.productMeta}>
                  {item.quantity} × {item.price?.toLocaleString()} د.ع
                </Text>
              </View>
              <Text style={s.productTotal}>
                {(item.quantity * item.price)?.toLocaleString()} د.ع
              </Text>
            </View>
          ))}
        </View>

        {/* ملخص مالي */}
        <LinearGradient colors={['#111827', '#1f2937']} style={s.darkCard}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name="receipt-outline" size={18} color="#9ca3af" />
            </View>
            <Text style={[s.cardTitle, { color: '#9ca3af' }]}>ملخص التكاليف والربح</Text>
          </View>

          {[
            { label: 'سعر البيع', value: (order.totalAmount - order.shippingCost)?.toLocaleString() + ' د.ع' },
            { label: 'أجرة التوصيل', value: order.shippingCost?.toLocaleString() + ' د.ع' },
          ].map((r, i) => (
            <View key={i} style={s.darkRow}>
              <Text style={s.darkVal}>{r.value}</Text>
              <Text style={s.darkLabel}>{r.label}</Text>
            </View>
          ))}

          <View style={s.darkDivider} />

          <View style={s.darkRow}>
            <Text style={[s.darkVal, { fontSize: 18 }]}>{order.totalAmount?.toLocaleString()} د.ع</Text>
            <Text style={[s.darkLabel, { color: '#fff', fontWeight: 'bold' }]}>المبلغ المستحق من الزبون</Text>
          </View>
          <View style={[s.darkRow, s.profitRow]}>
            <Text style={s.profitVal}>+{order.totalProfit?.toLocaleString()} د.ع</Text>
            <Text style={s.profitLabel}>ربحك من هذا الطلب 🎉</Text>
          </View>
        </LinearGradient>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFound:  { fontSize: 14, color: '#9ca3af' },

  header:     { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingTop: 12, marginBottom: 16 },
  backBtn:    { width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:{ fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  summaryCard:   { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLeft:   { alignItems: 'flex-end' },
  summaryLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  summaryCurrency:{ fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  statusBadge:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  statusText:    { fontSize: 13, fontWeight: 'bold' },

  scroll: { padding: 16, paddingBottom: 40 },

  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardIconBox:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle:  { fontSize: 15, fontWeight: 'bold', color: '#111827' },

  infoGrid:   { flexDirection: 'row', gap: 0 },
  infoBlock:  { flex: 1, alignItems: 'flex-end', paddingHorizontal: 8 },
  infoDivider:{ width: 1, backgroundColor: '#f3f4f6' },
  infoLabel:  { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  infoValue:  { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'right' },
  separator:  { height: 1, backgroundColor: '#f3f4f6', marginVertical: 14 },
  addressRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },

  productRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  productImg:   { width: 56, height: 56, borderRadius: 12 },
  productIcon:  { width: 56, height: 56, borderRadius: 12,
    backgroundColor: `${PRIMARY}12`, justifyContent: 'center', alignItems: 'center' },
  productName:  { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 3 },
  productMeta:  { fontSize: 12, color: '#9ca3af' },
  productTotal: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },

  darkCard:    { borderRadius: 20, padding: 20, marginBottom: 14 },
  darkRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  darkLabel:   { fontSize: 13, color: '#9ca3af' },
  darkVal:     { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  darkDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 6 },
  profitRow:   { backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 12, paddingHorizontal: 12, marginTop: 4 },
  profitVal:   { fontSize: 20, fontWeight: 'bold', color: '#4ade80' },
  profitLabel: { fontSize: 13, color: '#4ade80', fontWeight: '600' },
});
