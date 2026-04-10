import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, Alert, Animated, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const STATUS: any = {
  pending:  { label: 'قيد المعالجة', color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  approved: { label: 'تم القبول',    color: '#2563eb', bg: '#eff6ff', icon: 'checkmark-outline' },
  paid:     { label: 'تم الدفع',     color: '#059669', bg: '#ecfdf5', icon: 'cash-outline' },
  rejected: { label: 'مرفوض',        color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline' },
};

const PAYMENT_METHOD = 'mastercard';
const PAYMENT_METHOD_ARABIC = 'ماستر كارد';

// Live dot animation
function LiveDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[s.liveDot, { opacity: anim }]} />;
}

// Skeleton Component
function SkeletonWallet() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity: anim }}>
      <View style={sk.heroSkeleton} />
      <View style={sk.statsRowSkeleton}>
        <View style={sk.statSkeleton} />
        <View style={sk.statSkeleton} />
      </View>
      <View style={sk.sectionSkeleton} />
      {[1, 2, 3].map(i => (
        <View key={i} style={sk.cardSkeleton} />
      ))}
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  heroSkeleton: { height: 180, backgroundColor: '#e8edf2', borderRadius: 24, margin: 16, marginBottom: 12 },
  statsRowSkeleton: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 20 },
  statSkeleton: { flex: 1, height: 100, backgroundColor: '#e8edf2', borderRadius: 20 },
  sectionSkeleton: { height: 30, backgroundColor: '#e8edf2', marginHorizontal: 16, marginBottom: 12, borderRadius: 8 },
  cardSkeleton: { height: 80, backgroundColor: '#e8edf2', marginHorizontal: 16, marginBottom: 10, borderRadius: 20 },
});

export default function WalletScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [amountError, setAmountError] = useState('');
  const [cardError, setCardError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['user'],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await api.get('/api/auth/me');
      return data;
    },
  });

  const { data: withdrawals = [], isLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['withdrawals'],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return Array.isArray(data)
        ? [...data].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchWithdrawals()]);
    setRefreshing(false);
  };

  const createWithdrawal = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/withdrawals', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsOpen(false);
      setAmount('');
      setCardNumber('');
      setAmountError('');
      setCardError('');
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
      setAmountError('يرجى إدخال المبلغ');
      isValid = false;
    } else if (isNaN(val) || val <= 0) {
      setAmountError('يرجى إدخال مبلغ صحيح');
      isValid = false;
    } else if (val > (user?.balance || 0)) {
      setAmountError('المبلغ المطلوب أكبر من رصيدك المتاح');
      isValid = false;
    } else {
      setAmountError('');
    }

    const trimmedCard = cardNumber.replace(/\s/g, '');
    if (!cardNumber || cardNumber.trim() === '') {
      setCardError('يرجى إدخال رقم البطاقة');
      isValid = false;
    } else if (!/^\d{10}$/.test(trimmedCard)) {
      setCardError('رقم البطاقة يجب أن يحتوي على 10 أرقام بالضبط');
      isValid = false;
    } else {
      setCardError('');
    }

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

  if (isLoading && withdrawals.length === 0) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <View style={{ width: 44 }} />
          <Text style={s.headerTitle}>المحفظة</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
        <SkeletonWallet />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header (موحد) ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>المحفظة</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={withdrawals as any[]}
        keyExtractor={(item: any) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        ListHeaderComponent={
          <>
            {/* ── Hero بطاقة الرصيد (بدون تدرج) ── */}
            <View style={s.heroCard}>
              <View style={s.heroTop}>
                <Text style={s.heroLabel}>الرصيد المتاح للسحب</Text>
                <View style={s.liveChip}>
                  <LiveDot />
                  <Text style={s.liveText}>مباشر</Text>
                </View>
              </View>

              <View style={s.heroAmountRow}>
                <View style={s.heroIcon}>
                  <Ionicons name="wallet-outline" size={26} color={PRIMARY} />
                </View>
                <View style={s.heroNumWrap}>
                  <Text style={s.heroCurrency}>دينار عراقي</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={s.heroNum}>{(user?.balance || 0).toLocaleString()}</Text>
                    <Text style={s.heroUnit}>د.ع</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={s.withdrawBtn} onPress={() => setIsOpen(true)}>
                <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
                <Text style={s.withdrawBtnText}>سحب رصيد</Text>
              </TouchableOpacity>
            </View>

            {/* ── بطاقتا الأرباح ── */}
            <View style={s.statsRow}>
              <View style={[s.statCard, s.statCardGreen]}>
                <View style={s.statHead}>
                  <View style={[s.statIcon, s.statIconGreen]}>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#16a34a" />
                  </View>
                  <Text style={[s.statLbl, s.statLblGreen]}>الأرباح المحققة</Text>
                </View>
                <Text style={[s.statVal, s.statValGreen]}>
                  {(user?.balance || 0).toLocaleString()}
                </Text>
                <Text style={s.statCur}>دينار عراقي</Text>
              </View>

              <View style={[s.statCard, s.statCardOrange]}>
                <View style={s.statHead}>
                  <View style={[s.statIcon, s.statIconOrange]}>
                    <Ionicons name="time-outline" size={17} color="#f97316" />
                  </View>
                  <Text style={[s.statLbl, s.statLblOrange]}>الأرباح المنتظرة</Text>
                </View>
                <Text style={[s.statVal, s.statValOrange]}>
                  {(user?.pendingBalance || 0).toLocaleString()}
                </Text>
                <Text style={s.statCur}>دينار عراقي</Text>
              </View>
            </View>

            {/* ── عنوان السجل ── */}
            <View style={s.secRow}>
              <View style={s.secBadge}>
                <Text style={s.secBadgeText}>{(withdrawals as any[]).length}</Text>
              </View>
              <View style={s.secRight}>
                <Ionicons name="time-outline" size={16} color={PRIMARY} />
                <Text style={s.secTitle}>سجل السحوبات</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyBox}>
              <View style={s.emptyCircle}>
                <Ionicons name="wallet-outline" size={40} color="#9ca3af" />
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
              <View style={[s.wIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
              </View>
              <View style={s.wInfo}>
                <Text style={s.wAmount}>{item.amount?.toLocaleString()} د.ع</Text>
                <Text style={s.wMeta}>
                  {item.method === 'mastercard' ? PAYMENT_METHOD_ARABIC : item.method}
                </Text>
                <Text style={s.wDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={[s.wBadge, { backgroundColor: st.bg }]}>
                <Text style={[s.wBadgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
          );
        }}
      />

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
              placeholder="أدخل المبلغ"
              value={amount}
              onChangeText={(t) => {
                setAmount(t);
                if (amountError) setAmountError('');
              }}
              keyboardType="numeric"
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />
            {amountError ? <Text style={s.errText}>{amountError}</Text> : null}

            <Text style={s.label}>رقم بطاقة الدفع (10 أرقام)</Text>
            <TextInput
              style={[s.input, cardError ? s.inputErr : null]}
              placeholder="أدخل رقم البطاقة"
              value={cardNumber}
              onChangeText={(t) => {
                setCardNumber(t.replace(/[^0-9]/g, ''));
                if (cardError) setCardError('');
              }}
              keyboardType="numeric"
              maxLength={10}
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />
            {cardError ? <Text style={s.errText}>{cardError}</Text> : null}

            <TouchableOpacity
              style={[s.confirmBtn, createWithdrawal.isPending && { opacity: 0.7 }]}
              onPress={handleWithdraw}
              disabled={createWithdrawal.isPending}>
              {createWithdrawal.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.confirmText}>تأكيد السحب</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => {
                setIsOpen(false);
                setAmountError('');
                setCardError('');
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
  container: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 20 },

  // ── Header (موحد) ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
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

  // ── Hero Card (بدون تدرج) ──
  heroCard: {
    backgroundColor: PRIMARY,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 24,
    padding: 20,
    shadowColor: PRIMARY,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  liveText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNumWrap: {
    alignItems: 'flex-start',
  },
  heroCurrency: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  heroNum: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  withdrawBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  withdrawBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
  },

  // ── Stats Cards ──
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  statCardGreen: {
    borderColor: '#86efac',
  },
  statCardOrange: {
    borderColor: '#fdba74',
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconGreen: {
    backgroundColor: '#dcfce7',
  },
  statIconOrange: {
    backgroundColor: '#ffedd5',
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '700',
  },
  statLblGreen: {
    color: '#15803d',
  },
  statLblOrange: {
    color: '#c2410c',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'right',
  },
  statValGreen: {
    color: '#16a34a',
  },
  statValOrange: {
    color: '#ea580c',
  },
  statCur: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
    color: '#9ca3af',
  },

  // ── Section ──
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  secRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  secBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  secBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Withdrawal Card ──
  wCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  wIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  wAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  wMeta: {
    fontSize: 11,
    color: '#6b7280',
  },
  wDate: {
    fontSize: 10,
    color: '#9ca3af',
  },
  wBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  wBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // ── Empty State ──
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },

  // ── Modal ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  availBox: {
    backgroundColor: PRIMARY + '10',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  availLabel: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
  },
  availVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  inputErr: {
    borderColor: '#ef4444',
  },
  errText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  confirmBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 14,
  },
});