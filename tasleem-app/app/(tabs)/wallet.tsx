import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, Alert, Animated,
  Dimensions, ScrollView, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const { width } = Dimensions.get('window');
const PRIMARY = '#0c6679';
const GOLD = '#f59e0b';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const BG = '#f2f6f9';

const STATUS: any = {
  pending:  { label: 'قيد المعالجة', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  approved: { label: 'تم القبول',    color: '#3b82f6', bg: '#eff6ff', icon: 'checkmark-outline' },
  paid:     { label: 'تم الدفع',     color: '#10b981', bg: '#ecfdf5', icon: 'cash-outline' },
  rejected: { label: 'مرفوض',        color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
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

export default function WalletScreen() {
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
    const date = dt.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
    const time = dt.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  };

  const totalWithdrawn = withdrawals.reduce((sum: number, w: any) => sum + (w.status === 'paid' ? w.amount : 0), 0);
  const totalBalance = (user?.balance || 0) + (user?.pendingBalance || 0);
  const progress = totalBalance > 0 ? (user?.balance || 0) / totalBalance : 0;

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>

        {/* ── Header موحد مع باقي الصفحات ── */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>المحفظة</Text>
          <TouchableOpacity style={s.headerIconBtn}>
            <Ionicons name="card-outline" size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }>

          {/* ── بطاقة الرصيد (مصغرة ومتناسبة) ── */}
          <LinearGradient
            colors={[PRIMARY, '#0a8a9f', '#0c6679']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.mainCard}>
            <View style={s.cardTop}>
              <View style={s.cardChip}>
                <Ionicons name="ellipse-outline" size={24} color="rgba(255,255,255,0.3)" />
                <Ionicons name="ellipse-outline" size={24} color="rgba(255,255,255,0.3)" style={{ marginLeft: -16 }} />
              </View>
              <View style={s.liveIndicator}>
                <LiveDot />
                <Text style={s.liveText}>مباشر</Text>
              </View>
            </View>
            
            <View style={s.cardBalance}>
              <Text style={s.cardLabel}>الرصيد المتاح</Text>
              <Text style={s.cardAmount}>{(user?.balance || 0).toLocaleString()}</Text>
              <Text style={s.cardCurrency}>دينار عراقي</Text>
            </View>

            <TouchableOpacity style={s.withdrawBtn} onPress={() => setIsOpen(true)}>
              <Ionicons name="arrow-up-circle-outline" size={18} color={PRIMARY} />
              <Text style={s.withdrawBtnText}>سحب رصيد</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* ── إحصائيات متقدمة ── */}
          <View style={s.statsContainer}>
            <View style={s.progressSection}>
              <View style={s.progressCircle}>
                <View style={s.progressRing}>
                  <Text style={s.progressPercent}>{Math.round(progress * 100)}%</Text>
                </View>
              </View>
              <View style={s.progressLabels}>
                <Text style={s.progressTitle}>تقدم الأرباح</Text>
                <Text style={s.progressSub}>
                  {(user?.balance || 0).toLocaleString()} محققة
                </Text>
                <Text style={s.progressSub2}>
                  {(user?.pendingBalance || 0).toLocaleString()} منتظرة
                </Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statItem}>
                <View style={[s.statIcon, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
                </View>
                <Text style={s.statValue}>{(user?.balance || 0).toLocaleString()}</Text>
                <Text style={s.statLabel}>الأرباح المحققة</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <View style={[s.statIcon, { backgroundColor: '#fffbeb' }]}>
                  <Ionicons name="time" size={20} color={GOLD} />
                </View>
                <Text style={s.statValue}>{(user?.pendingBalance || 0).toLocaleString()}</Text>
                <Text style={s.statLabel}>الأرباح المنتظرة</Text>
              </View>
            </View>
          </View>

          {/* ── إجمالي السحوبات ── */}
          {totalWithdrawn > 0 && (
            <View style={s.totalWithdrawnCard}>
              <Text style={s.totalWithdrawnLabel}>إجمالي السحوبات</Text>
              <Text style={s.totalWithdrawnValue}>{totalWithdrawn.toLocaleString()} د.ع</Text>
            </View>
          )}

          {/* ── عنوان سجل السحوبات ── */}
          <View style={s.historyHeader}>
            <View style={s.historyTitleContainer}>
              <Ionicons name="list-outline" size={20} color={PRIMARY} />
              <Text style={s.historyTitle}>سجل السحوبات</Text>
            </View>
            <View style={s.historyBadge}>
              <Text style={s.historyBadgeText}>{withdrawals.length}</Text>
            </View>
          </View>

          {/* ── سجل السحوبات ── */}
          {isLoading && withdrawals.length === 0 ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={s.loadingText}>جاري تحميل السحوبات...</Text>
            </View>
          ) : withdrawals.length === 0 ? (
            <View style={s.emptyContainer}>
              <View style={s.emptyIconBox}>
                <Ionicons name="wallet-outline" size={40} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>لا توجد سحوبات بعد</Text>
              <Text style={s.emptyText}>اضغط "سحب رصيد" لتقديم طلبك الأول</Text>
            </View>
          ) : (
            <View style={s.timeline}>
              {withdrawals.map((item: any, index: number) => {
                const st = STATUS[item.status] || STATUS.pending;
                const isLast = index === withdrawals.length - 1;
                return (
                  <View key={item.id} style={s.timelineItem}>
                    {!isLast && <View style={s.timelineLine} />}
                    <View style={[s.timelineDot, { backgroundColor: st.color }]}>
                      <Ionicons name={st.icon} size={12} color="#fff" />
                    </View>
                    <View style={s.timelineContent}>
                      <View style={s.timelineHeader}>
                        <Text style={s.timelineAmount}>{item.amount?.toLocaleString()} د.ع</Text>
                        <View style={[s.timelineBadge, { backgroundColor: st.bg }]}>
                          <Text style={[s.timelineBadgeText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                      <Text style={s.timelineMeta}>
                        {item.method === 'mastercard' ? PAYMENT_METHOD_ARABIC : item.method}
                      </Text>
                      <Text style={s.timelineDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── Modal السحب ── */}
        <Modal visible={isOpen} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHandle} />
              <View style={s.modalIcon}>
                <Ionicons name="wallet-outline" size={32} color={PRIMARY} />
              </View>
              <Text style={s.modalTitle}>طلب سحب جديد</Text>

              <View style={s.availBox}>
                <Text style={s.availLabel}>الرصيد المتاح</Text>
                <Text style={s.availVal}>{(user?.balance || 0).toLocaleString()} د.ع</Text>
              </View>

              <Text style={s.label}>المبلغ المراد سحبه</Text>
              <TextInput
                style={[s.input, amountError && s.inputErr]}
                placeholder="أدخل المبلغ"
                placeholderTextColor="#9ca3af"
                value={amount}
                onChangeText={(t) => {
                  setAmount(t);
                  if (amountError) setAmountError('');
                }}
                keyboardType="numeric"
                textAlign="right"
              />
              {amountError && <Text style={s.errText}>{amountError}</Text>}

              <Text style={s.label}>رقم بطاقة الدفع</Text>
              <TextInput
                style={[s.input, cardError && s.inputErr]}
                placeholder="10 أرقام"
                placeholderTextColor="#9ca3af"
                value={cardNumber}
                onChangeText={(t) => {
                  setCardNumber(t.replace(/[^0-9]/g, '').slice(0, 10));
                  if (cardError) setCardError('');
                }}
                keyboardType="numeric"
                maxLength={10}
                textAlign="right"
              />
              {cardError && <Text style={s.errText}>{cardError}</Text>}

              <TouchableOpacity
                style={[s.confirmBtn, createWithdrawal.isPending && s.confirmBtnDisabled]}
                onPress={handleWithdraw}
                disabled={createWithdrawal.isPending}>
                {createWithdrawal.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.confirmText}>تأكيد السحب</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={s.cancelBtn} onPress={() => {
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },

  // ── Header موحد مع باقي الصفحات ──
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // ── بطاقة الرصيد (مصغرة) ──
  mainCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 18,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBalance: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  cardCurrency: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    color: '#fff',
    fontWeight: '600',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 10,
  },
  withdrawBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
  },

  // ── إحصائيات متقدمة ──
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    marginBottom: 14,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SUCCESS + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SUCCESS,
  },
  progressLabels: {
    flex: 1,
    alignItems: 'flex-end',
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  progressSub: {
    fontSize: 11,
    color: SUCCESS,
    fontWeight: '600',
  },
  progressSub2: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: '#e8edf2',
  },

  // ── إجمالي السحوبات ──
  totalWithdrawnCard: {
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalWithdrawnLabel: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  totalWithdrawnValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d97706',
  },

  // ── سجل السحوبات ──
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  historyBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },

  // ── Timeline ──
  timeline: {
    paddingHorizontal: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 13,
    top: 26,
    bottom: -16,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  timelineBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  timelineBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  timelineMeta: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 3,
  },
  timelineDate: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'right',
  },

  // ── Loading & Empty ──
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    fontSize: 12,
    color: '#9ca3af',
  },

  // ── Modal ──
  modalOverlay: {
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
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  availBox: {
    backgroundColor: PRIMARY + '10',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  availLabel: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
  },
  availVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  inputErr: {
    borderColor: DANGER,
  },
  errText: {
    color: DANGER,
    fontSize: 11,
    marginTop: 3,
    textAlign: 'right',
  },
  confirmBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelBtn: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 13,
  },
});