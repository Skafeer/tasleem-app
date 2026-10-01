// app/admin/merchant/[id].tsx (أو المسار اللي عندك)
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Clipboard, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const WARNING = '#f59e0b';
const INFO = '#3b82f6';
const ECOM_COLOR = '#3b82f6';
const BG = '#f2f6f9';
const STORE_BASE_URL = 'https://bazari-app.vercel.app';

const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');

const STATUS: any = {
  processing: { label: 'قيد المعالجة', color: INFO, bg: '#eff6ff', icon: 'sync-outline' },
  shipping: { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', icon: 'bicycle-outline' },
  delivered: { label: 'تم التوصيل', color: SUCCESS, bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'ملغي', color: DANGER, bg: '#fef2f2', icon: 'close-circle-outline' },
  returned: { label: 'مرفوض', color: WARNING, bg: '#fff7ed', icon: 'arrow-undo-outline' },
  postponed: { label: 'مؤجل', color: '#6b7280', bg: '#f9fafb', icon: 'pause-circle-outline' },
};

export default function MerchantDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'withdrawals'>('orders');

  // جلب بيانات التاجر
  const { data: merchant, isLoading: merchantLoading, refetch: refetchMerchant } = useQuery({
    queryKey: ['merchant', id],
    queryFn: async () => {
      const { data: users } = await api.get('/api/admin/users');
      const merchant = users.find((u: any) => u.id === Number(id));
      if (!merchant) throw new Error('التاجر غير موجود');
      return merchant;
    },
    enabled: !!id,
  });

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['merchant-orders', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/orders?merchantId=${id}&limit=999`);
      const result = data?.data || data;
      return Array.isArray(result) ? result : [];
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['merchant-withdrawals', id],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return (data as any[]).filter((w: any) => w.merchantId === Number(id));
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMerchant(), refetchOrders()]);
    setRefreshing(false);
  };

  const copy = (text: string, label: string) => {
    Clipboard.setString(text ?? '');
    toast.success(`تم نسخ ${label}`);
  };

  const openStore = (code: string) => {
    if (!code) return;
    Linking.openURL(`${STORE_BASE_URL}/${code}`).catch(() => {
      toast.error('فشل فتح الرابط');
    });
  };

  if (merchantLoading || !merchant) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingTxt}>جاري تحميل بيانات التاجر...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const allOrders = orders as any[];
  const delivered = allOrders.filter(o => o.status === 'delivered');
  const totalRevenue = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalProfit = delivered.reduce((s, o) => s + (o.totalProfit || 0), 0);
  const totalOrders = allOrders.length;
  const deliveryRate = totalOrders > 0 ? Math.round((delivered.length / totalOrders) * 100) : 0;

  // طلبات المتجر الإلكتروني
  const storeOrders = allOrders.filter(o => o.source === 'store');
  const appOrders = allOrders.filter(o => o.source !== 'store');

  const ws = withdrawals as any[];
  const paidWithdrawals = ws.filter(w => w.status === 'paid');
  const totalWithdrawn = paidWithdrawals.reduce((s, w) => s + (w.amount || 0), 0);

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>التاجر: {merchant.storeName}</Text>
        <TouchableOpacity style={s.copyBtn} onPress={() => copy(String(merchant.id), 'رقم التاجر')}>
          <Ionicons name="copy-outline" size={18} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >

        {/* ═══════════════════════════════════════ */}
        {/* بطاقة المعلومات الأساسية */}
        {/* ═══════════════════════════════════════ */}
        <View style={s.profileCard}>
          <View style={s.avatarBig}>
            <Text style={s.avatarBigTxt}>{merchant.storeName?.charAt(0) || '؟'}</Text>
          </View>
          <Text style={s.merchantName}>{merchant.storeName}</Text>
          <Text style={s.merchantId}># {merchant.merchantId || merchant.id}</Text>
          <TouchableOpacity style={s.phoneRow} onPress={() => copy(merchant.phone, 'رقم الهاتف')}>
            <Ionicons name="call-outline" size={16} color={PRIMARY} />
            <Text style={s.phoneText}>{merchant.phone || 'لا يوجد رقم'}</Text>
            <Ionicons name="copy-outline" size={14} color="#9ca3af" />
          </TouchableOpacity>
          {merchant.address && (
            <Text style={s.addressText}>{merchant.address}</Text>
          )}
        </View>

        {/* ═══════════════════════════════════════ */}
        {/* ✅ بطاقة المتجر الإلكتروني */}
        {/* ═══════════════════════════════════════ */}
        {merchant.hasEcomStore ? (
          <View style={s.storeCard}>
            {/* Header */}
            <View style={s.storeHeader}>
              <View style={s.storeIconBox}>
                <Ionicons name="globe-outline" size={24} color={ECOM_COLOR} />
              </View>
              <View style={s.storeHeaderInfo}>
                <View style={s.storeTitleRow}>
                  <Text style={s.storeTitle} numberOfLines={1}>
                    {merchant.storeEcomName || merchant.storeName}
                  </Text>
                  {merchant.storeIsActive ? (
                    <View style={s.storeLivePill}>
                      <View style={s.storeLiveDot} />
                      <Text style={s.storeLiveText}>مفعّل</Text>
                    </View>
                  ) : (
                    <View style={s.storeOffPill}>
                      <Text style={s.storeOffText}>معطّل</Text>
                    </View>
                  )}
                </View>
                <Text style={s.storeSubtitle}>
                  {merchant.storeProductsCount} منتج في المتجر
                </Text>
              </View>
            </View>

            {/* Code */}
            <TouchableOpacity
              style={s.storeCodeBox}
              onPress={() => copy(merchant.storeCode, 'كود المتجر')}
              activeOpacity={0.7}
            >
              <Ionicons name="key-outline" size={14} color={ECOM_COLOR} />
              <Text style={s.storeCodeLabel}>كود المتجر:</Text>
              <Text style={s.storeCodeValue}>{merchant.storeCode}</Text>
              <Ionicons name="copy-outline" size={13} color="#9ca3af" />
            </TouchableOpacity>

            {/* Link */}
            <TouchableOpacity
              style={s.storeLinkBox}
              onPress={() => copy(`${STORE_BASE_URL}/${merchant.storeCode}`, 'رابط المتجر')}
              activeOpacity={0.7}
            >
              <Ionicons name="link-outline" size={13} color="#6b7280" />
              <Text style={s.storeLinkText} numberOfLines={1}>
                {STORE_BASE_URL}/{merchant.storeCode}
              </Text>
              <Ionicons name="copy-outline" size={13} color="#9ca3af" />
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={s.storeActionsRow}>
              <TouchableOpacity
                style={[s.storeActionBtn, s.storeActionBtnPrimary]}
                onPress={() => openStore(merchant.storeCode)}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={s.storeActionBtnTextPrimary}>فتح المتجر</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.storeActionBtn, s.storeActionBtnGhost]}
                onPress={() => copy(`${STORE_BASE_URL}/${merchant.storeCode}`, 'رابط المتجر')}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={16} color={ECOM_COLOR} />
                <Text style={s.storeActionBtnTextGhost}>مشاركة الرابط</Text>
              </TouchableOpacity>
            </View>

            {/* Store stats */}
            <View style={s.storeStatsRow}>
              <View style={s.storeStatBox}>
                <Text style={s.storeStatVal}>{merchant.storeProductsCount}</Text>
                <Text style={s.storeStatLabel}>منتج</Text>
              </View>
              <View style={s.storeStatDivider} />
              <View style={s.storeStatBox}>
                <Text style={[s.storeStatVal, { color: ECOM_COLOR }]}>{storeOrders.length}</Text>
                <Text style={s.storeStatLabel}>طلب من المتجر</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.noStoreCard}>
            <View style={s.noStoreIconBox}>
              <Ionicons name="globe-outline" size={20} color="#9ca3af" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.noStoreTitle}>لا يوجد متجر إلكتروني</Text>
              <Text style={s.noStoreSubtitle}>هذا التاجر لم ينشئ متجراً حتى الآن</Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* إحصائيات سريعة */}
        {/* ═══════════════════════════════════════ */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: PRIMARY }]}>{totalOrders}</Text>
            <Text style={s.statLabel}>إجمالي الطلبات</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: SUCCESS }]}>{deliveryRate}%</Text>
            <Text style={s.statLabel}>نسبة التسليم</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: SUCCESS }]}>{fmt(totalRevenue)}</Text>
            <Text style={s.statLabel}>الإيرادات</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: PRIMARY }]}>{fmt(totalProfit)}</Text>
            <Text style={s.statLabel}>الأرباح</Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════ */}
        {/* مصدر الطلبات (اختياري — يظهر لو فيه متجر) */}
        {/* ═══════════════════════════════════════ */}
        {merchant.hasEcomStore && totalOrders > 0 && (
          <View style={s.sourceCard}>
            <Text style={s.sourceTitle}>مصدر الطلبات</Text>
            <View style={s.sourceBar}>
              <View
                style={[
                  s.sourceBarSegment,
                  {
                    flex: appOrders.length || 0.001,
                    backgroundColor: PRIMARY,
                  },
                ]}
              />
              <View
                style={[
                  s.sourceBarSegment,
                  {
                    flex: storeOrders.length || 0.001,
                    backgroundColor: ECOM_COLOR,
                  },
                ]}
              />
            </View>
            <View style={s.sourceLegend}>
              <View style={s.sourceLegendItem}>
                <View style={[s.sourceDot, { backgroundColor: PRIMARY }]} />
                <Text style={s.sourceLegendText}>
                  التطبيق ({appOrders.length})
                </Text>
              </View>
              <View style={s.sourceLegendItem}>
                <View style={[s.sourceDot, { backgroundColor: ECOM_COLOR }]} />
                <Text style={s.sourceLegendText}>
                  المتجر ({storeOrders.length})
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* الرصيد */}
        {/* ═══════════════════════════════════════ */}
        <View style={s.balanceCard}>
          <View style={s.balanceItem}>
            <Text style={s.balanceLabel}>الرصيد المتاح</Text>
            <Text style={[s.balanceVal, { color: SUCCESS }]}>{fmt(merchant.balance || 0)}</Text>
            <Text style={s.balanceUnit}>د.ع</Text>
          </View>
          <View style={s.balanceDivider} />
          <View style={s.balanceItem}>
            <Text style={s.balanceLabel}>الرصيد المعلق</Text>
            <Text style={[s.balanceVal, { color: WARNING }]}>{fmt(merchant.pendingBalance || 0)}</Text>
            <Text style={s.balanceUnit}>د.ع</Text>
          </View>
          <View style={s.balanceDivider} />
          <View style={s.balanceItem}>
            <Text style={s.balanceLabel}>إجمالي السحوبات</Text>
            <Text style={[s.balanceVal, { color: INFO }]}>{fmt(totalWithdrawn)}</Text>
            <Text style={s.balanceUnit}>د.ع</Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════ */}
        {/* تبويبات الطلبات والسحوبات */}
        {/* ═══════════════════════════════════════ */}
        <View style={s.tabsRow}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'orders' && s.tabBtnActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Ionicons name="bag-outline" size={16} color={activeTab === 'orders' ? PRIMARY : '#6b7280'} />
            <Text style={[s.tabText, activeTab === 'orders' && s.tabTextActive]}>
              الطلبات ({allOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'withdrawals' && s.tabBtnActive]}
            onPress={() => setActiveTab('withdrawals')}
          >
            <Ionicons name="cash-outline" size={16} color={activeTab === 'withdrawals' ? PRIMARY : '#6b7280'} />
            <Text style={[s.tabText, activeTab === 'withdrawals' && s.tabTextActive]}>
              السحوبات ({ws.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════ */}
        {/* قائمة الطلبات */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <>
            {allOrders.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="bag-outline" size={40} color="#d1d5db" />
                <Text style={s.emptyText}>لا توجد طلبات لهذا التاجر</Text>
              </View>
            ) : (
              allOrders.map((o: any) => {
                const st = STATUS[o.status] || STATUS.processing;
                const isStoreOrder = o.source === 'store';
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={s.orderCard}
                    onPress={() => router.push(`/order-details/${o.id}`)}
                  >
                    <View style={s.orderHeader}>
                      <View style={s.orderIdRow}>
                        <Text style={s.orderId}>طلب #{o.id}</Text>
                        {isStoreOrder && (
                          <View style={s.orderSourceBadge}>
                            <Ionicons name="globe-outline" size={10} color={ECOM_COLOR} />
                            <Text style={s.orderSourceText}>متجر</Text>
                          </View>
                        )}
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                        <Ionicons name={st.icon} size={12} color={st.color} />
                        <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={s.orderCustomer}>{o.customerName || 'بدون اسم'}</Text>
                    <Text style={s.orderDate}>{formatDate(o.createdAt)}</Text>
                    <Text style={s.orderAmount}>{fmt(o.totalAmount || 0)} د.ع</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* قائمة السحوبات */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'withdrawals' && (
          <>
            {ws.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="cash-outline" size={40} color="#d1d5db" />
                <Text style={s.emptyText}>لا توجد سحوبات لهذا التاجر</Text>
              </View>
            ) : (
              ws.map((w: any) => {
                const st = w.status === 'pending' ? { label: 'قيد المعالجة', color: WARNING, bg: '#fffbeb' }
                  : w.status === 'approved' ? { label: 'مقبول', color: INFO, bg: '#eff6ff' }
                  : w.status === 'paid' ? { label: 'مدفوع', color: SUCCESS, bg: '#ecfdf5' }
                  : { label: 'مرفوض', color: DANGER, bg: '#fef2f2' };
                return (
                  <View key={w.id} style={s.withdrawalCard}>
                    <View style={s.wHeader}>
                      <Text style={s.wAmount}>{fmt(w.amount)} د.ع</Text>
                      <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={s.wDate}>{formatDate(w.createdAt)}</Text>
                    {w.accountDetails && (
                      <Text style={s.wAccount}>بطاقة: **** {w.accountDetails.slice(-4)}</Text>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 20 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  scroll: { padding: 16, paddingBottom: 20 },

  // Header
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
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  copyBtn: { padding: 6, backgroundColor: PRIMARY + '12', borderRadius: 8 },

  // Profile
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarBigTxt: { fontSize: 30, fontWeight: 'bold', color: PRIMARY },
  merchantName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  merchantId: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  phoneText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  addressText: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  // ═══════════════════════════════════════
  // ✅ E-Commerce Store Card
  // ═══════════════════════════════════════
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: ECOM_COLOR + '30',
    shadowColor: ECOM_COLOR,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  storeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: ECOM_COLOR + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeHeaderInfo: { flex: 1 },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  storeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    maxWidth: '60%',
  },
  storeLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: SUCCESS + '15',
  },
  storeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUCCESS,
  },
  storeLiveText: { fontSize: 10, fontWeight: '700', color: SUCCESS },
  storeOffPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  storeOffText: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },
  storeSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
    fontWeight: '500',
  },

  // Code row
  storeCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: ECOM_COLOR + '08',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ECOM_COLOR + '15',
    marginBottom: 8,
  },
  storeCodeLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  storeCodeValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: ECOM_COLOR,
    letterSpacing: 1.5,
    textAlign: 'right',
  },

  // Link row
  storeLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 14,
  },
  storeLinkText: {
    flex: 1,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'right',
  },

  // Action buttons
  storeActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  storeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  storeActionBtnPrimary: {
    backgroundColor: ECOM_COLOR,
  },
  storeActionBtnGhost: {
    backgroundColor: ECOM_COLOR + '12',
    borderWidth: 1,
    borderColor: ECOM_COLOR + '30',
  },
  storeActionBtnTextPrimary: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  storeActionBtnTextGhost: {
    fontSize: 13,
    fontWeight: 'bold',
    color: ECOM_COLOR,
  },

  // Store stats
  storeStatsRow: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ECOM_COLOR + '15',
  },
  storeStatBox: { flex: 1, alignItems: 'center', gap: 3 },
  storeStatDivider: { width: 1, backgroundColor: ECOM_COLOR + '20' },
  storeStatVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  storeStatLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },

  // No Store card
  noStoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
    borderStyle: 'dashed',
  },
  noStoreIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStoreTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  noStoreSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  statVal: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2 },

  // ✅ Source breakdown
  sourceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  sourceTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'right',
  },
  sourceBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 10,
  },
  sourceBarSegment: { height: '100%' },
  sourceLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sourceLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceLegendText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },

  // Balance
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  balanceItem: { flex: 1, alignItems: 'center', gap: 3 },
  balanceDivider: { width: 1, height: 44, backgroundColor: '#e8edf2' },
  balanceLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  balanceVal: { fontSize: 15, fontWeight: 'bold' },
  balanceUnit: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: { backgroundColor: PRIMARY + '12' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: PRIMARY },

  // Order Cards
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  orderSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: ECOM_COLOR + '12',
  },
  orderSourceText: {
    fontSize: 10,
    fontWeight: '700',
    color: ECOM_COLOR,
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  orderCustomer: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  orderDate: { fontSize: 11, color: '#9ca3af', marginTop: 2, textAlign: 'right' },
  orderAmount: { fontSize: 15, fontWeight: 'bold', color: PRIMARY, marginTop: 4, textAlign: 'right' },

  // Withdrawal Cards
  withdrawalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  wHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wAmount: { fontSize: 16, fontWeight: 'bold', color: PRIMARY },
  wDate: { fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  wAccount: { fontSize: 12, color: '#6b7280', marginTop: 2, textAlign: 'right' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
});