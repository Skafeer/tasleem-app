import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const SETTINGS = [
  { label: 'الملف الشخصي',            icon: 'person-outline',          href: '/profile-edit',    color: '#3b82f6', bg: '#eff6ff' },
  { label: 'سجل السحوبات',            icon: 'time-outline',            href: '/withdraw-history', color: '#8b5cf6', bg: '#f5f3ff' },
  { label: 'الإحصائيات',              icon: 'bar-chart-outline',       href: '/stats',            color: '#10b981', bg: '#ecfdf5' },
  { label: 'سياسة الخصوصية والشروط', icon: 'shield-checkmark-outline', href: '/privacy',          color: '#f97316', bg: '#fff7ed' },
  { label: 'تواصل معنا',              icon: 'chatbubble-outline',      href: '/contact',          color: '#0d9488', bg: '#f0fdfa' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => { await api.post('/api/auth/logout'); },
    onSuccess: () => {
      queryClient.clear();
      router.replace('/auth');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.post('/api/withdrawals', {
        amount, method: 'manual', accountDetails: 'Internal Wallet'
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      Alert.alert('تم طلب السحب بنجاح', 'سيتم معالجة طلبك قريباً');
      setIsWithdrawOpen(false);
      setWithdrawAmount('');
    },
    onError: (e: any) =>
      Alert.alert('خطأ في السحب', e?.response?.data?.message || 'حدث خطأ'),
  });

  const handleWithdrawSubmit = () => {
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح'); return;
    }
    if (amount > (user?.balance || 0)) {
      Alert.alert('رصيد غير كافٍ', 'المبلغ المطلوب يتجاوز الرصيد المتاح'); return;
    }
    withdrawMutation.mutate(amount);
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive',
        onPress: () => logoutMutation.mutate() },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={s.header}>
          <Ionicons name="settings-outline" size={24} color="#9ca3af" />
          <Text style={s.title}>الإعدادات</Text>
        </View>

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.profileInfo}>
            <Text style={s.storeName}>{user?.storeName}</Text>
            <View style={s.idRow}>
              <Ionicons name="storefront-outline" size={14} color="#9ca3af" />
              <Text style={s.merchantId}>ID: {user?.merchantId}</Text>
            </View>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {user?.storeName?.substring(0, 1) || '؟'}
            </Text>
          </View>
        </View>

        {/* Withdraw Card — bg-primary */}
        <View style={s.withdrawCard}>
          <View style={s.withdrawTop}>
            <Ionicons name="wallet-outline" size={40} color="rgba(255,255,255,0.2)" />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.withdrawLabel}>الرصيد المتاح للسحب</Text>
              <Text style={s.withdrawBalance}>
                {(user?.balance || 0).toLocaleString()}
                <Text style={s.withdrawUnit}> د.ع</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.withdrawBtn}
            onPress={() => setIsWithdrawOpen(true)}>
            <Text style={s.withdrawBtnText}>سحب الأرباح</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Options */}
        <View style={s.optionsList}>
          {SETTINGS.map((opt) => (
            <TouchableOpacity key={opt.label} style={s.optionItem}
              onPress={() => router.push(opt.href as any)}>
              <Ionicons name="chevron-back" size={18} color="#d1d5db" />
              <Text style={s.optionLabel}>{opt.label}</Text>
              <View style={[s.optionIcon, { backgroundColor: opt.bg }]}>
                <Ionicons name={opt.icon as any} size={20} color={opt.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}
          disabled={logoutMutation.isPending}>
          {logoutMutation.isPending
            ? <ActivityIndicator color="#dc2626" />
            : <>
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text style={s.logoutText}>تسجيل الخروج</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={s.version}>إصدار التطبيق 1.0.0</Text>
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={isWithdrawOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>طلب سحب أرباح</Text>

            <Text style={s.inputLabel}>المبلغ المراد سحبه (د.ع)</Text>
            <TextInput style={s.modalInput}
              placeholder="أدخل المبلغ..."
              value={withdrawAmount} onChangeText={setWithdrawAmount}
              keyboardType="numeric" textAlign="right"
              placeholderTextColor="#9ca3af" />
            <Text style={s.balanceHint}>
              الرصيد المتاح: {(user?.balance || 0).toLocaleString()} د.ع
            </Text>

            <TouchableOpacity
              style={[s.confirmBtn, withdrawMutation.isPending && { opacity: 0.7 }]}
              onPress={handleWithdrawSubmit}
              disabled={withdrawMutation.isPending}>
              {withdrawMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.confirmText}>تأكيد السحب</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn}
              onPress={() => setIsWithdrawOpen(false)}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  profileCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${PRIMARY}15`, justifyContent: 'center',
    alignItems: 'center', borderWidth: 2, borderColor: `${PRIMARY}25` },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: PRIMARY },
  profileInfo: { alignItems: 'flex-end' },
  storeName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  idRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  merchantId: { fontSize: 13, color: '#9ca3af' },
  withdrawCard: { backgroundColor: PRIMARY, marginHorizontal: 16,
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  withdrawTop: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20 },
  withdrawLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)',
    textAlign: 'right', marginBottom: 6 },
  withdrawBalance: { fontSize: 28, fontWeight: 'bold',
    color: '#fff', textAlign: 'right' },
  withdrawUnit: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  withdrawBtn: { backgroundColor: '#fff', borderRadius: 14, height: 48,
    justifyContent: 'center', alignItems: 'center' },
  withdrawBtnText: { color: PRIMARY, fontWeight: 'bold', fontSize: 15 },
  optionsList: { marginHorizontal: 16, marginBottom: 16, gap: 10 },
  optionItem: { backgroundColor: '#fff', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: '#f3f4f6', gap: 12 },
  optionIcon: { width: 42, height: 42, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center' },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600',
    color: '#374151', textAlign: 'right' },
  logoutBtn: { flexDirection: 'row-reverse', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginHorizontal: 16, height: 56,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#fee2e2',
    backgroundColor: '#fff', marginBottom: 8 },
  logoutText: { color: '#dc2626', fontWeight: 'bold', fontSize: 15 },
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12,
    marginTop: 8, marginBottom: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151',
    textAlign: 'right', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14,
    padding: 14, fontSize: 16, color: '#111827', backgroundColor: '#f9fafb' },
  balanceHint: { fontSize: 12, color: '#9ca3af',
    textAlign: 'right', marginTop: 6, marginBottom: 4 },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelText: { color: '#9ca3af', fontSize: 14 },
});
