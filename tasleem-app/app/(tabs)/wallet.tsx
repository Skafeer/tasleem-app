import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';

export default function WalletScreen() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const method = 'mastercard'; // فقط ماستر كارد

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => { const { data } = await api.get('/api/withdrawals'); return data; },
  });

  const createWithdrawal = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/api/withdrawals', data); return res.data; },
    onSuccess: () => {
      toast.success('تم إرسال طلب السحب');
      setAmount('');
      setAccountDetails('');
      qc.invalidateQueries({ queryKey: ['user'] });
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل السحب'),
  });

  const handleWithdraw = () => {
    const val = Number(amount);
    if (!val || val <= 0) { toast.warning('يرجى إدخال مبلغ صحيح'); return; }
    if (val > (user?.balance || 0)) { toast.warning('رصيد غير كافٍ'); return; }
    if (!accountDetails.trim() || accountDetails.length !== 10) {
      toast.warning('يرجى إدخال رقم بطاقة ماستر كارد مكون من 10 أرقام');
      return;
    }
    const details = `Mastercard: ${accountDetails}`;
    createWithdrawal.mutate({ amount: val, method, accountDetails: details });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return { bg: '#d1fae5', text: '#10b981', label: 'مقبول' };
    if (status === 'rejected') return { bg: '#fee2e2', text: '#ef4444', label: 'مرفوض' };
    return { bg: '#fef3c7', text: '#f59e0b', label: 'قيد المراجعة' };
  };

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>المحفظة</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        
        {/* Balance */}
        <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.balanceCard}>
          <Ionicons name="wallet-outline" size={32} color="#fff" style={{ opacity: 0.5 }} />
          <Text style={s.balanceLabel}>الرصيد المتاح للسحب</Text>
          <Text style={s.balanceValue}>{(user?.balance || 0).toLocaleString()} د.ع</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceInfo}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={s.balanceInfoText}>{(user?.pendingBalance || 0).toLocaleString()} د.ع</Text>
            </View>
            <Text style={s.balanceInfoLabel}>الأرباح المنتظرة</Text>
          </View>
        </LinearGradient>

        {/* Withdraw Form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>💳 سحب الأرباح</Text>
          
          <Text style={s.label}>المبلغ (د.ع)</Text>
          <TextInput style={s.input}
            placeholder="أدخل المبلغ"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            textAlign="right" placeholderTextColor="#9ca3af" />

          <Text style={s.label}>رقم بطاقة ماستر كارد (10 أرقام)</Text>
          <TextInput style={s.input}
            placeholder="أدخل رقم البطاقة"
            value={accountDetails}
            onChangeText={v => {
              if (v.length <= 10 && /^[0-9]*$/.test(v)) setAccountDetails(v);
            }}
            keyboardType="number-pad"
            maxLength={10}
            textAlign="right" placeholderTextColor="#9ca3af" />

          <TouchableOpacity style={s.withdrawBtn} onPress={handleWithdraw} disabled={createWithdrawal.isPending}>
            <LinearGradient colors={[SECONDARY, '#e89700']} style={s.withdrawGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {createWithdrawal.isPending ? <ActivityIndicator color="#fff" /> :
                <><Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
                  <Text style={s.withdrawText}>طلب سحب الأرباح</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* History */}
        <View style={s.historyHeader}>
          <Ionicons name="time-outline" size={20} color={PRIMARY} />
          <Text style={s.historyTitle}>سجل السحوبات</Text>
        </View>

        {withdrawals.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="receipt-outline" size={56} color="#d1d5db" />
            <Text style={s.emptyText}>لا توجد سحوبات حتى الآن</Text>
          </View>
        ) : (
          withdrawals.map((w: any) => {
            const badge = getStatusBadge(w.status);
            return (
              <View key={w.id} style={s.wItem}>
                <View style={s.wHeader}>
                  <View style={[s.wBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.wBadgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                  <Text style={s.wAmount}>{w.amount.toLocaleString()} د.ع</Text>
                </View>
                <Text style={s.wMeta}>ماستر كارد • {formatDate(w.createdAt)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center', paddingVertical: 16 },
  scroll: { padding: 16, paddingBottom: 40 },
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  balanceValue: { fontSize: 38, fontWeight: 'bold', color: '#fff', marginTop: 4, letterSpacing: 1 },
  balanceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  balanceInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  balanceInfoText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  balanceInfoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 16 },
  label: { fontSize: 13, color: '#374151', textAlign: 'right', marginBottom: 8, marginTop: 14, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  withdrawBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  withdrawGrad: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52 },
  withdrawText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  historyHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
  historyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  emptyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 50, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 14 },
  wItem: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  wHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  wAmount: { fontSize: 19, fontWeight: 'bold', color: '#111827' },
  wBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  wBadgeText: { fontSize: 12, fontWeight: '600' },
  wMeta: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
});
