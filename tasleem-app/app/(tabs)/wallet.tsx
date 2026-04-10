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
const BG_GRADIENT = ['#f8fafc', '#e8edf2'] as const;

const STATUS: any = {
  pending:  { label: 'قيد المعالجة', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  approved: { label: 'تم القبول',    color: '#3b82f6', bg: '#eff6ff', icon: 'checkmark-outline' },
  paid:     { label: 'تم الدفع',     color: '#10b981', bg: '#ecfdf5', icon: 'cash-outline' },
  rejected: { label: 'مرفوض',        color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
};

const PAYMENT_METHOD = 'mastercard';
const PAYMENT_METHOD_ARABIC = 'ماستر كارد';

// Animated Circular Progress - Version مُصلحة
function CircularProgress({ progress, size = 80, color = SUCCESS }: { 
  progress: number; 
  size?: number; 
  color?: string;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // حساب الـ circumference
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* الخلفية */}
      <View
        style={{
          position: 'absolute',
          width: size - 16,
          height: size - 16,
          borderRadius: (size - 16) / 2,
          borderWidth: 6,
          borderColor: '#e2e8f0',
        }}
      />
      {/* التقدم المتحرك */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size - 16,
          height: size - 16,
          borderRadius: (size - 16) / 2,
          borderWidth: 6,
          borderColor: color,
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: '-90deg' }],
          // @ts-ignore - strokeDashoffset is valid for Animated.View
          strokeDashoffset,
          strokeDasharray: circumference,
        }}
      />
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
        {Math.round(progress * 100)}%
      </Text>
    </View>
  );
}

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
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const totalWithdrawn = withdrawals.reduce((sum: number, w: any) => sum + (w.status === 'paid' ? w.amount : 0), 0);
  const totalBalance = (user?.balance || 0) + (user?.pendingBalance || 0);
  const progress = totalBalance > 0 ? (user?.balance || 0) / totalBalance : 0;

  return (
    <LinearGradient colors={BG_GRADIENT} style={s.container}>
      <SafeAreaView style={s.safeArea} edges={['top']}>

        {/* Header مع تأثير شفاف عند التمرير */}
        <Animated.View style={[s.header, { 
          backgroundColor: headerOpacity.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['transparent', 'rgba(255,255,255,0.8)', '#fff']
          }) 
        }]}>
          <View style={s.headerContent}>
            <View style={{ width: 40 }} />
            <Text style={s.headerTitle}>المحفظة</Text>
            <TouchableOpacity style={s.headerIconBtn} onPress={() => {}}>
              <Ionicons name="card-outline" size={22} color={PRIMARY} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }>

          {/* بطاقة الرصيد الرئيسية - تصميم بطاقة فيزا */}
          <LinearGradient
            colors={[PRIMARY, '#0a8a9f', '#0c6679']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.mainCard}>
            <View style={s.cardChip}>
              <Ionicons name="ellipse-outline" size={30} color="rgba(255,255,255,0.3)" />
              <Ionicons name="ellipse-outline" size={30} color="rgba(255,255,255,0.3)" style={{ marginLeft: -20 }} />
            </View>
            <View style={s.cardBalance}>
              <Text style={s.cardLabel}>الرصيد المتاح</Text>
              <Text style={s.cardAmount}>{(user?.balance || 0).toLocaleString()}</Text>
              <Text style={s.cardCurrency}>دينار عراقي</Text>
            </View>
            <View style={s.cardFooter}>
              <View style={s.liveIndicator}>
                <LiveDot />
                <Text style={s.liveText}>مباشر</Text>
              </View>
              <TouchableOpacity style={s.withdrawBtn} onPress={() => setIsOpen(true)}>
                <Ionicons name="arrow-up-circle-outline" size={18} color={PRIMARY} />
                <Text style={s.withdrawBtnText}>سحب رصيد</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* إحصائيات متقدمة */}
          <View style={s.statsContainer}>
            <View style={s.progressSection}>
              <CircularProgress progress={progress} size={90} color={SUCCESS} />
              <View style={s.progressLabels}>
                <Text style={s.progressTitle}>تقدم الأرباح</Text>
                <Text style={s.progressSub}>
                  {(user?.balance || 0).toLocaleString()} محققة / {(user?.pendingBalance || 0).toLocaleString()} منتظرة
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

          {/* شريط إجمالي السحوبات */}
          {totalWithdrawn > 0 && (
            <View style={s.totalWithdrawnCard}>
              <Text style={s.totalWithdrawnLabel}>إجمالي السحوبات</Text>
              <Text style={s.totalWithdrawnValue}>{totalWithdrawn.toLocaleString()} د.ع</Text>
            </View>
          )}

          {/* عنوان سجل السحوبات مع تصميم جديد */}
          <View style={s.historyHeader}>
            <View style={s.historyTitleContainer}>
              <Ionicons name="list-outline" size={20} color={PRIMARY} />
              <Text style={s.historyTitle}>سجل السحوبات</Text>
            </View>
            <View style={s.historyBadge}>
              <Text style={s.historyBadgeText}>{withdrawals.length}</Text>
            </View>
          </View>

          {/* سجل السحوبات - تصميم Timeline */}
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
        </Animated.ScrollView>

        {/* Modal السحب - تصميم جديد */}
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
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header مع تأثير
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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

  // بطاقة الرصيد الرئيسية
  mainCard: {
    marginHorizontal: 16,
    marginTop: 80,
    marginBottom: 16,
    borderRadius: 28,
    padding: 20,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardChip: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  cardBalance: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  cardAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -1,
  },
  cardCurrency: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  liveText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  withdrawBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
  },

  // إحصائيات متقدمة
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    marginBottom: 16,
  },
  progressLabels: {
    flex: 1,
    alignItems: 'flex-end',
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  progressSub: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e8edf2',
  },

  // إجمالي السحوبات
  totalWithdrawnCard: {
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalWithdrawnLabel: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
  },
  totalWithdrawnValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d97706',
  },

  // سجل السحوبات
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
    gap: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  historyBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Timeline تصميم جديد
  timeline: {
    paddingHorizontal: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 20,
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 28,
    bottom: -20,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  timelineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timelineBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  timelineMeta: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'right',
  },

  // Loading و Empty
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },

  // Modal جديد
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 50,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  availBox: {
    backgroundColor: PRIMARY + '10',
    borderRadius: 14,
    padding: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    marginTop: 4,
    textAlign: 'right',
  },
  confirmBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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