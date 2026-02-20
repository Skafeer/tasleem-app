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
    createWithdrawal.mutate({ amount: val, method: 'mastercard', accountDetails });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return { bg: '#d1fae5', text: '#10b981', label: 'مقبول' };
    if (status === 'rejected') return { bg: '#fee2e2', text: '#ef4444', label: 'مرفوض' };
    return { bg: '#fef3c7', text: '#f59e0b', label: 'قيد المراجعة' };
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.balanceCard}>
          <Text style={s.balanceLabel}>الرصيد المتاح</Text>
          <Text style={s.balanceValue}>{(user?.balance || 0).toLocaleString()} د.ع</Text>
        </LinearGradient>

        <View style={s.card}>
          <Text style={s.cardTitle}>سحب الأرباح 💳</Text>
          
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
                <><Ionicons name="cash-outline" size={20} color="#fff" />
                  <Text style={s.withdrawText}>طلب سحب</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={s.historyTitle}>📋 سجل السحوبات</Text>
        {withdrawals.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  balanceCard: { borderRadius: 18, padding: 20, marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  balanceValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 16 },
  label: { fontSize: 13, color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  withdrawBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  withdrawGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50 },
  withdrawText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  historyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 12 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 14, padding: 40, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
  wItem: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  wHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  wAmount: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  wBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  wBadgeText: { fontSize: 12, fontWeight: '600' },
  wMeta: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
});
