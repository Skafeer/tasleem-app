import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const STATUS: any = {
  pending:  { label: 'معلق',   color: '#d97706', bg: '#fef3c7' },
  approved: { label: 'مقبول',  color: '#059669', bg: '#d1fae5' },
  rejected: { label: 'مرفوض', color: '#dc2626', bg: '#fee2e2' },
};

const METHODS = ['Zain Cash', 'Asia Hawala', 'تحويل بنكي'];

export default function WalletScreen() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Zain Cash');
  const [details, setDetails] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return Array.isArray(data) ? data : [];
    },
  });

  const createWithdrawal = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/withdrawals', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsOpen(false); setAmount(''); setDetails('');
      Alert.alert('تم إرسال الطلب', 'سيتم مراجعة طلب السحب قريباً');
    },
    onError: (e: any) =>
      Alert.alert('فشل إرسال الطلب', e?.response?.data?.message || 'حدث خطأ'),
  });

  const handleWithdraw = () => {
    const val = Number(amount);
    if (!val || val <= 0) { Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح'); return; }
    if (val > (user?.balance || 0)) {
      Alert.alert('رصيد غير كافي', 'المبلغ المطلوب أكبر من رصيدك المتاح'); return;
    }
    createWithdrawal.mutate({ amount: val, method, accountDetails: details });
  };

  const formatDate = (d: string) => d
    ? new Date(d).toLocaleDateString('ar-IQ', { month: 'long', day: 'numeric' })
    : '';

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>المحفظة المالية</Text>
      </View>

      {/* Balance Card — bg gray-900 to gray-800 */}
      <View style={s.balanceCard}>
        <View style={s.balanceGlow} />
        <View style={s.balanceTop}>
          <Ionicons name="wallet-outline" size={32} color="rgba(255,255,255,0.15)" />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.balanceLabel}>الرصيد الكلي المتاح للسحب</Text>
            <Text style={s.balanceVal}>
              {(user?.balance || 0).toLocaleString()}
              <Text style={s.balanceUnit}> د.ع</Text>
            </Text>
          </View>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity style={s.withdrawBtn} onPress={() => setIsOpen(true)}>
          <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
          <Text style={s.withdrawBtnText}>سحب رصيد</Text>
        </TouchableOpacity>
      </View>

      {/* History Title */}
      <View style={s.secHead}>
        <Ionicons name="time-outline" size={18} color={PRIMARY} />
        <Text style={s.secTitle}>سجل السحوبات</Text>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={withdrawals as any[]}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="wallet-outline" size={48} color="#e5e7eb" />
              <Text style={s.emptyText}>لا توجد سحوبات بعد</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            const st = STATUS[item.status] || STATUS.pending;
            return (
              <View style={s.withdrawCard}>
                <View style={[s.wIcon, { backgroundColor: st.bg }]}>
                  <Ionicons name="cash-outline" size={22} color={st.color} />
                </View>
                <View style={s.wInfo}>
                  <Text style={s.wAmount}>{item.amount?.toLocaleString()} د.ع</Text>
                  <Text style={s.wMeta}>{item.method} • {formatDate(item.createdAt)}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Withdraw Modal */}
      <Modal visible={isOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>طلب سحب جديد</Text>

            {/* Available Balance */}
            <View style={s.availableBox}>
              <Text style={s.availableVal}>{(user?.balance || 0).toLocaleString()} د.ع</Text>
              <Text style={s.availableLabel}>الرصيد المتاح:</Text>
            </View>

            {/* Amount */}
            <Text style={s.label}>المبلغ</Text>
            <TextInput style={s.input} placeholder="0"
              value={amount} onChangeText={setAmount}
              keyboardType="numeric" textAlign="right"
              placeholderTextColor="#9ca3af" />

            {/* Method */}
            <Text style={s.label}>طريقة الدفع</Text>
            <View style={s.methodRow}>
              {METHODS.map(m => (
                <TouchableOpacity key={m}
                  style={[s.methodBtn, method === m && s.methodActive]}
                  onPress={() => setMethod(m)}>
                  <Text style={[s.methodText, method === m && s.methodActiveText]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Details */}
            <Text style={s.label}>تفاصيل الحساب</Text>
            <TextInput style={s.input}
              placeholder="رقم الهاتف أو رقم الحساب"
              value={details} onChangeText={setDetails}
              textAlign="right" placeholderTextColor="#9ca3af" />

            <TouchableOpacity
              style={[s.confirmBtn, createWithdrawal.isPending && { opacity: 0.7 }]}
              onPress={handleWithdraw} disabled={createWithdrawal.isPending}>
              {createWithdrawal.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.confirmText}>تأكيد السحب</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setIsOpen(false)}>
              <Text style={s.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  balanceCard: { margin: 16, backgroundColor: '#1f2937', borderRadius: 24,
    padding: 24, overflow: 'hidden',
    shadowColor: '#111827', shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  balanceGlow: { position: 'absolute', top: -80, right: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.04)' },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24 },
  balanceLabel: { fontSize: 13, color: '#9ca3af', textAlign: 'right', marginBottom: 8 },
  balanceVal: { fontSize: 40, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  balanceUnit: { fontSize: 20, color: '#6b7280' },
  withdrawBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 48,
    flexDirection: 'row-reverse', justifyContent: 'center',
    alignItems: 'center', gap: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  withdrawBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  secHead: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  secTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  withdrawCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  wIcon: { width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center' },
  wInfo: { flex: 1, alignItems: 'flex-end' },
  wAmount: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  wMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 16 },
  availableBox: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 14,
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#dbeafe' },
  availableLabel: { fontSize: 13, color: '#2563eb' },
  availableVal: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151',
    textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  methodRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  methodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  methodActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  methodText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  methodActiveText: { color: '#fff', fontWeight: 'bold' },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelText: { color: '#9ca3af', fontSize: 14 },
});
