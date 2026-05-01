import React from 'react';
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
const BG = '#f2f6f9';

const STATUS: any = {
  pending:  { label: 'قيد المعالجة', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  approved: { label: 'مقبول',  color: '#059669', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  paid:     { label: 'مدفوع',  color: '#3b82f6', bg: '#eff6ff', icon: 'cash-outline' },
  rejected: { label: 'مرفوض', color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline' },
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
  const total = ws.filter(w => w.status === 'paid').reduce((s, w) => s + w.amount, 0);
  const approved = ws.filter(w => w.status === 'approved' || w.status === 'paid').length;

  const formatDate = (d: string) => d
    ? new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header RTL (زر رجوع يمين، عنوان وسط) ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>سجل السحوبات</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ── بطاقة الملخص المحسنة ── */}
      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>إجمالي المسحوبات المدفوعة</Text>
        <Text style={s.summaryVal}>{total.toLocaleString('ar-IQ')} <Text style={s.summaryUnit}>د.ع</Text></Text>
        <View style={s.chips}>
          <View style={[s.chip, s.chipTotal]}>
            <Ionicons name="wallet-outline" size={12} color={PRIMARY} />
            <Text style={s.chipText}>{ws.length} طلب إجمالي</Text>
          </View>
          <View style={[s.chip, s.chipApproved]}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
            <Text style={[s.chipText, { color: '#059669' }]}>{approved} مقبول</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={ws}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}>
                <Ionicons name="wallet-outline" size={40} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>لا توجد سحوبات بعد</Text>
              <Text style={s.emptyText}>ستظهر هنا طلبات السحب التي تقوم بها</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            const st = STATUS[item.status] || STATUS.pending;
            return (
              <View style={s.card}>
                {/* الحالة على اليسار */}
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                
                {/* المعلومات في المنتصف */}
                <View style={s.cardInfo}>
                  <Text style={s.cardAmount}>{item.amount?.toLocaleString('ar-IQ')} <Text style={s.cardCurrency}>د.ع</Text></Text>
                  <Text style={s.cardMethod}>{item.method === 'mastercard' ? 'ماستر كارد' : item.method}</Text>
                  {item.accountDetails && <Text style={s.cardDetail}>•••• {item.accountDetails.slice(-4)}</Text>}
                  <Text style={s.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
                
                {/* الأيقونة على اليمين */}
                <View style={[s.cardIcon, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={22} color={st.color} />
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
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header RTL (زر رجوع يمين، عنوان وسط) ──
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  // ── بطاقة الملخص المحسنة ──
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: { 
    fontSize: 12, 
    color: '#9ca3af', 
    textAlign: 'right', 
    marginBottom: 6 
  },
  summaryVal: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: PRIMARY, 
    textAlign: 'right' 
  },
  summaryUnit: { 
    fontSize: 14, 
    color: '#9ca3af' 
  },
  chips: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 10, 
    marginTop: 14 
  },
  chip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    borderRadius: 20, 
    paddingHorizontal: 12, 
    paddingVertical: 6 
  },
  chipTotal: { 
    backgroundColor: PRIMARY + '12' 
  },
  chipApproved: { 
    backgroundColor: '#ecfdf5' 
  },
  chipText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: PRIMARY 
  },

  // ── قائمة السحوبات ──
  listContent: { 
    padding: 16, 
    paddingBottom: 32 
  },
  emptyBox: { 
    alignItems: 'center', 
    paddingVertical: 60, 
    gap: 12 
  },
  emptyIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: PRIMARY + '12', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  emptyTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#374151' 
  },
  emptyText: { 
    fontSize: 13, 
    color: '#9ca3af' 
  },

  // ── بطاقة السحب (RTL: أيقونة يمين، معلومات وسط، حالة يسار) ──
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    padding: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12, 
    gap: 12, 
    borderWidth: 1, 
    borderColor: '#e8edf2', 
    shadowColor: '#000', 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 1 
  },
  cardIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardInfo: { 
    flex: 1, 
    alignItems: 'flex-end', 
    gap: 3 
  },
  cardAmount: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#111827' 
  },
  cardCurrency: { 
    fontSize: 11, 
    color: '#9ca3af' 
  },
  cardMethod: { 
    fontSize: 12, 
    color: '#6b7280' 
  },
  cardDetail: { 
    fontSize: 11, 
    color: '#9ca3af' 
  },
  cardDate: { 
    fontSize: 10, 
    color: '#d1d5db' 
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10 
  },
  badgeText: { 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
});