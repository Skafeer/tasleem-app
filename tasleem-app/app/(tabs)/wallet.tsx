import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const STATUS: any = {
  pending:  { label: 'قيد المعالجة', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  approved: { label: 'تم القبول',    color: '#3b82f6', bg: '#eff6ff', icon: 'checkmark-outline' },
  paid:     { label: 'تم الدفع',     color: '#10b981', bg: '#ecfdf5', icon: 'cash-outline' },
  rejected: { label: 'مرفوض',        color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
};

const PAYMENT_METHOD = 'mastercard';
const PAYMENT_METHOD_ARABIC = 'ماستر كارد';

export default function WalletScreen() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [amountError, setAmountError] = useState('');
  const [cardError, setCardError] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    refetchInterval: 15000,
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['withdrawals'],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return Array.isArray(data)
        ? [...data].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];
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
      setIsOpen(false); setAmount(''); setCardNumber('');
      setAmountError(''); setCardError('');
      Alert.alert('تم إرسال الطلب', 'سيتم مراجعة طلب السحب قريباً');
    },
    onError: (e: any) => {
      Alert.alert('فشل إرسال الطلب', e?.response?.data?.message || 'حدث خطأ');
    },
  });

  const validateFields = () => {
    let isValid = true;
    const val = Number(amount);
    if (!amount || amount.trim() === '') {
      setAmountError('يرجى إدخال المبلغ'); isValid = false;
    } else if (isNaN(val) || val <= 0) {
      setAmountError('يرجى إدخال مبلغ صحيح'); isValid = false;
    } else if (val > (user?.balance || 0)) {
      setAmountError('المبلغ المطلوب أكبر من رصيدك المتاح'); isValid = false;
    } else { setAmountError(''); }

    const trimmedCard = cardNumber.replace(/\s/g, '');
    if (!cardNumber || cardNumber.trim() === '') {
      setCardError('يرجى إدخال رقم البطاقة'); isValid = false;
    } else if (!/^\d{10}$/.test(trimmedCard)) {
      setCardError('رقم البطاقة يجب أن يحتوي على 10 أرقام بالضبط'); isValid = false;
    } else { setCardError(''); }

    return isValid;
  };

  const handleWithdraw = () => {
    if (!validateFields()) return;
    createWithdrawal.mutate({
      amount: Number(amount),
      method: PAYMENT_METHOD,
      accountDetails: cardNumber.replace(/\s/g, ''),
    });
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    const date = dt.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = dt.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    return `${date} — ${time}`;
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header أبيض ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageHeaderSub}>إدارة أرباحك</Text>
          <Text style={s.pageHeaderTitle}>المحفظة</Text>
        </View>
        <View style={s.pageHeaderIcon}>
          <Ionicons name="card-outline" size={22} color={PRIMARY} />
        </View>
      </View>

      {/* بطاقة الرصيد — gradient محفوظ هنا فقط */}
      <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.balanceCardWrap}>
        <View style={s.balanceCard}>
          <View style={s.balanceRow}>
            <View style={s.balanceIconBox}>
              <Ionicons name="wallet" size={22} color="#fff" />
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <Text style={s.balanceLabel}>الرصيد المتاح للسحب</Text>
              <Text style={s.balanceVal}>
                {(user?.balance || 0).toLocaleString()}
                <Text style={s.balanceUnit}> د.ع</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.withdrawBtn} onPress={() => setIsOpen(true)}>
            <Ionicons name="arrow-up-circle-outline" size={20} color={PRIMARY} />
            <Text style={s.withdrawBtnText}>سحب رصيد</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── سجل السحوبات ── */}
      <View style={s.secHead}>
        <Ionicons name="time-outline" size={18} color={PRIMARY} />
        <Text style={s.secTitle}>سجل السحوبات</Text>
      </View>

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
              <View style={s.emptyIconCircle}>
                <Ionicons name="wallet-outline" size={36} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>لا توجد سحوبات بعد</Text>
              <Text style={s.emptyText}>اضغط "سحب رصيد" لتقديم طلبك</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            const st = STATUS[item.status] || STATUS.pending;
            return (
              <View style={s.withdrawCard}>
                <View style={[s.wIcon, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={22} color={st.color} />
                </View>
                <View style={s.wInfo}>
                  <Text style={s.wAmount}>{item.amount?.toLocaleString()} د.ع</Text>
                  <Text style={s.wMeta}>
                    {item.method === 'mastercard' ? PAYMENT_METHOD_ARABIC : item.method}
                  </Text>
                  <Text style={s.wDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── Modal السحب ── */}
      <Modal visible={isOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>طلب سحب جديد</Text>

            <View style={s.availableBox}>
              <Text style={s.availableVal}>{(user?.balance || 0).toLocaleString()} د.ع</Text>
              <Text style={s.availableLabel}>الرصيد المتاح</Text>
            </View>

            <View>
              <Text style={s.label}>المبلغ</Text>
              <TextInput
                style={[s.input, amountError ? s.inputError : null]}
                placeholder="0" value={amount}
                onChangeText={(text) => { setAmount(text); if (amountError) setAmountError(''); }}
                keyboardType="numeric" textAlign="right" placeholderTextColor="#9ca3af"
              />
              {amountError ? <Text style={s.errorText}>{amountError}</Text> : null}
            </View>

            <View>
              <Text style={s.label}>رقم البطاقة (10 أرقام)</Text>
              <TextInput
                style={[s.input, cardError ? s.inputError : null]}
                placeholder="أدخل رقم البطاقة" value={cardNumber}
                onChangeText={(text) => {
                  setCardNumber(text.replace(/[^0-9]/g, ''));
                  if (cardError) setCardError('');
                }}
                keyboardType="numeric" maxLength={10} textAlign="right" placeholderTextColor="#9ca3af"
              />
              {cardError ? <Text style={s.errorText}>{cardError}</Text> : null}
            </View>

            <TouchableOpacity
              style={[s.confirmBtn, createWithdrawal.isPending && { opacity: 0.7 }]}
              onPress={handleWithdraw} disabled={createWithdrawal.isPending}>
              {createWithdrawal.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.confirmText}>تأكيد السحب</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => {
              setIsOpen(false); setAmountError(''); setCardError('');
            }}>
              <Text style={s.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },

  // ── Header ──
  pageHeader:     { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pageHeaderTitle: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'right' },
  pageHeaderSub:   { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: 2 },
  pageHeaderIcon:  { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f0f9fa',
    borderWidth: 1.5, borderColor: '#e0f2f7', justifyContent: 'center', alignItems: 'center' },
  balanceCardWrap: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6,
    backgroundColor: '#f0f4f8' },

  // بطاقة الرصيد داخل الهيدر
  balanceCard:  { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    padding: 18, gap: 16 },
  balanceRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  balanceIconBox:{ width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  balanceVal:   { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  balanceUnit:  { fontSize: 18, color: 'rgba(255,255,255,0.8)' },
  withdrawBtn:  { backgroundColor: '#fff', borderRadius: 14, height: 48,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  withdrawBtnText: { color: PRIMARY, fontWeight: 'bold', fontSize: 15 },

  // ── Section ──
  secHead:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14 },
  secTitle:     { fontSize: 16, fontWeight: 'bold', color: '#111827' },

  // ── Empty ──
  emptyBox:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  emptyTitle:   { fontSize: 15, fontWeight: 'bold', color: '#374151' },
  emptyText:    { fontSize: 13, color: '#9ca3af' },

  // ── بطاقة سحب ──
  withdrawCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  wIcon:        { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  wInfo:        { flex: 1, alignItems: 'flex-end', gap: 2 },
  wAmount:      { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  wMeta:        { fontSize: 12, color: '#9ca3af' },
  wDate:        { fontSize: 11, color: '#9ca3af' },
  badge:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText:    { fontSize: 11, fontWeight: 'bold' },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 16 },
  availableBox: { backgroundColor: PRIMARY + '10', borderRadius: 14, padding: 14,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: PRIMARY + '25' },
  availableLabel: { fontSize: 13, color: PRIMARY },
  availableVal:   { fontSize: 16, fontWeight: 'bold', color: PRIMARY },
  label:        { fontSize: 13, fontWeight: '500', color: '#374151', textAlign: 'right',
    marginBottom: 8, marginTop: 12 },
  input:        { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  inputError:   { borderColor: '#dc2626', borderWidth: 1.5 },
  errorText:    { color: '#dc2626', fontSize: 12, marginTop: 4, marginRight: 4, textAlign: 'right' },
  confirmBtn:   { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  confirmText:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn:    { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelText:   { color: '#9ca3af', fontSize: 14 },
});
