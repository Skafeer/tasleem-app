import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY  = '#0c6679';
const PRIMARY2 = '#0a8a9f';

const STATUS: any = {
  pending:  { label: 'قيد المعالجة', color: '#d97706', bg: '#fef9c3', icon: 'time-outline' },
  approved: { label: 'تم القبول',    color: '#2563eb', bg: '#dbeafe', icon: 'checkmark-outline' },
  paid:     { label: 'تم الدفع',     color: '#059669', bg: '#d1fae5', icon: 'cash-outline' },
  rejected: { label: 'مرفوض',        color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline' },
};

const PAYMENT_METHOD       = 'mastercard';
const PAYMENT_METHOD_ARABIC = 'ماستر كارد';

// ── Live dot animation ──
function LiveDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[s.liveDot, { opacity: anim }]} />;
}

export default function WalletScreen() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen]         = useState(false);
  const [amount, setAmount]         = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [amountError, setAmountError] = useState('');
  const [cardError,  setCardError]    = useState('');

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
    const dt   = new Date(d);
    const date = dt.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = dt.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    return `${date} — ${time}`;
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>المحفظة</Text>
          <Text style={s.headerSub}>إدارة أرباحك</Text>
        </View>
        <View style={s.headerBtn}>
          <Ionicons name="card-outline" size={22} color={PRIMARY} />
        </View>
      </View>

      <FlatList
        data={withdrawals as any[]}
        keyExtractor={(item: any) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            {/* ── Hero بطاقة الرصيد ── */}
            <LinearGradient
              colors={['#0a4f5e', PRIMARY, PRIMARY2]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.hero}>

              {/* شريط علوي */}
              <View style={s.heroTop}>
                <Text style={s.heroLabel}>الرصيد المتاح للسحب</Text>
                <View style={s.liveChip}>
                  <LiveDot />
                  <Text style={s.liveText}>مباشر</Text>
                </View>
              </View>

              {/* الأيقونة + المبلغ */}
              <View style={s.heroAmountRow}>
                <View style={s.heroIcon}>
                  <Ionicons name="wallet" size={26} color="#fff" />
                </View>
                <View style={s.heroNumWrap}>
                  <Text style={s.heroCurrency}>دينار عراقي</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={s.heroNum}>{(user?.balance || 0).toLocaleString()}</Text>
                    <Text style={s.heroUnit}>د.ع</Text>
                  </View>
                </View>
              </View>

              {/* زر السحب */}
              <TouchableOpacity style={s.withdrawBtn} onPress={() => setIsOpen(true)}>
                <Ionicons name="arrow-up-circle-outline" size={20} color={PRIMARY} />
                <Text style={s.withdrawBtnText}>سحب رصيد</Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* ── بطاقتا الأرباح ── */}
            <View style={s.statsRow}>
              {/* المحققة */}
              <View style={[s.statCard, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <View style={s.statHead}>
                  <View style={[s.statIcon, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#16a34a" />
                  </View>
                  <Text style={[s.statLbl, { color: '#15803d' }]}>الأرباح المحققة</Text>
                </View>
                <Text style={[s.statVal, { color: '#16a34a' }]}>
                  {(user?.balance || 0).toLocaleString()}
                </Text>
                <Text style={[s.statCur, { color: '#22c55e' }]}>دينار عراقي</Text>
              </View>

              {/* المنتظرة */}
              <View style={[s.statCard, { backgroundColor: '#fff7ed', borderColor: '#fdba74' }]}>
                <View style={s.statHead}>
                  <View style={[s.statIcon, { backgroundColor: '#ffedd5' }]}>
                    <Ionicons name="time-outline" size={17} color="#f97316" />
                  </View>
                  <Text style={[s.statLbl, { color: '#c2410c' }]}>الأرباح المنتظرة</Text>
                </View>
                <Text style={[s.statVal, { color: '#ea580c' }]}>
                  {(user?.pendingBalance || 0).toLocaleString()}
                </Text>
                <Text style={[s.statCur, { color: '#fb923c' }]}>دينار عراقي</Text>
              </View>
            </View>

            {/* ── عنوان السجل ── */}
            <View style={s.secRow}>
              <View style={[s.secBadge]}>
                <Text style={s.secBadgeText}>{(withdrawals as any[]).length}</Text>
              </View>
              <View style={s.secRight}>
                <Ionicons name="time-outline" size={17} color={PRIMARY} />
                <Text style={s.secTitle}>سجل السحوبات</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyBox}>
              <View style={s.emptyCircle}>
                <Ionicons name="wallet-outline" size={34} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>لا توجد سحوبات بعد</Text>
              <Text style={s.emptyText}>اضغط "سحب رصيد" لتقديم طلبك</Text>
            </View>
          ) : null
        }
        renderItem={({ item }: any) => {
          const st = STATUS[item.status] || STATUS.pending;
          return (
            <View style={s.wCard}>
              {/* الحالة يمين */}
              <View style={[s.wBadge, { backgroundColor: st.bg }]}>
                <Text style={[s.wBadgeText, { color: st.color }]}>{st.label}</Text>
              </View>
              {/* المعلومات وسط */}
              <View style={s.wInfo}>
                <Text style={s.wAmount}>{item.amount?.toLocaleString()} د.ع</Text>
                <Text style={s.wMeta}>
                  {item.method === 'mastercard' ? PAYMENT_METHOD_ARABIC : item.method}
                </Text>
                <Text style={s.wDate}>{formatDate(item.createdAt)}</Text>
              </View>
              {/* الأيقونة يسار */}
              <View style={[s.wIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
              </View>
            </View>
          );
        }}
      />

      {isLoading && <ActivityIndicator color={PRIMARY} style={{ marginTop: 24 }} />}

      {/* ── Modal السحب ── */}
      <Modal visible={isOpen} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.handle} />
            <Text style={s.modalTitle}>طلب سحب جديد</Text>

            <View style={s.availBox}>
              <Text style={s.availLabel}>الرصيد المتاح</Text>
              <Text style={s.availVal}>{(user?.balance || 0).toLocaleString()} د.ع</Text>
            </View>

            <Text style={s.label}>المبلغ المراد سحبه</Text>
            <TextInput
              style={[s.input, amountError ? s.inputErr : null]}
              placeholder="أدخل المبلغ" value={amount}
              onChangeText={(t) => { setAmount(t); if (amountError) setAmountError(''); }}
              keyboardType="numeric" textAlign="right" placeholderTextColor="#9ca3af"
            />
            {amountError ? <Text style={s.errText}>{amountError}</Text> : null}

            <Text style={s.label}>رقم بطاقة الدفع (10 أرقام)</Text>
            <TextInput
              style={[s.input, cardError ? s.inputErr : null]}
              placeholder="أدخل رقم البطاقة" value={cardNumber}
              onChangeText={(t) => { setCardNumber(t.replace(/[^0-9]/g, '')); if (cardError) setCardError(''); }}
              keyboardType="numeric" maxLength={10} textAlign="right" placeholderTextColor="#9ca3af"
            />
            {cardError ? <Text style={s.errText}>{cardError}</Text> : null}

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
  container: { flex: 1, backgroundColor: '#f2f6f9' },

  // ── Header ──
  header:     { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf2' },
  headerLeft: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0d1b2a', letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerBtn:   { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f0f9fa',
    borderWidth: 1.5, borderColor: '#d4eef3', justifyContent: 'center', alignItems: 'center' },

  // ── Hero ──
  hero:          { marginHorizontal: 16, marginTop: 16, marginBottom: 12,
    borderRadius: 24, padding: 24, gap: 0,
    shadowColor: '#0c6679', shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 },
  heroTop:       { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20 },
  heroLabel:     { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  liveChip:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  liveDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText:      { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  heroAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  heroIcon:      { width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  heroNumWrap:   { alignItems: 'flex-start' },
  heroCurrency:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  heroNum:       { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroUnit:      { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  withdrawBtn:   { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, height: 50,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  withdrawBtnText: { fontSize: 15, fontWeight: '800', color: PRIMARY },

  // ── Stats ──
  statsRow: { flexDirection: 'row-reverse', gap: 10, marginHorizontal: 16, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  statHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
  statIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statLbl:  { fontSize: 11, fontWeight: '700' },
  statVal:  { fontSize: 22, fontWeight: '900', textAlign: 'right' },
  statCur:  { fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 3, opacity: 0.8 },

  // ── Section ──
  secRow:      { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12 },
  secRight:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  secTitle:    { fontSize: 16, fontWeight: '800', color: '#0d1b2a' },
  secBadge:    { backgroundColor: PRIMARY, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  secBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // ── Withdrawal Card ──
  wCard:      { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 10, borderRadius: 20, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  wIcon:      { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  wInfo:      { flex: 1, alignItems: 'flex-end', gap: 2 },
  wAmount:    { fontSize: 16, fontWeight: '900', color: '#0d1b2a' },
  wMeta:      { fontSize: 12, color: '#64748b', marginTop: 3 },
  wDate:      { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  wBadge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  wBadgeText: { fontSize: 10, fontWeight: '800' },

  // ── Empty ──
  emptyBox:    { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: '#374151' },
  emptyText:   { fontSize: 13, color: '#64748b' },

  // ── Modal ──
  overlay:     { flex: 1, backgroundColor: 'rgba(13,27,42,0.6)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: 44 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 20, fontWeight: '900', color: '#0d1b2a', textAlign: 'right', marginBottom: 18 },
  availBox:    { backgroundColor: PRIMARY + '10', borderRadius: 16, padding: 14,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, borderWidth: 1.5, borderColor: PRIMARY + '25' },
  availLabel:  { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  availVal:    { fontSize: 17, fontWeight: '900', color: PRIMARY },
  label:       { fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'right',
    marginBottom: 8, marginTop: 16 },
  input:       { borderWidth: 1.5, borderColor: '#e8edf2', borderRadius: 14, padding: 14,
    fontSize: 16, color: '#0d1b2a', backgroundColor: '#f8fafc' },
  inputErr:    { borderColor: '#ef4444' },
  errText:     { color: '#ef4444', fontSize: 12, marginTop: 5, textAlign: 'right' },
  confirmBtn:  { backgroundColor: PRIMARY, borderRadius: 16, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 22,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn:   { height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  cancelText:  { color: '#64748b', fontSize: 14 },
});
