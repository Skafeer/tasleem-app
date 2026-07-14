// app/admin-components/MerchantsTab.tsx
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Clipboard, Alert, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SUCCESS = '#10b981';
const SECONDARY = '#f5a006';
const DANGER = '#ef4444';
const BG = '#f2f6f9';

// أنواع الفلترة
type FilterType = 'all' | 'active' | 'inactive' | 'high_orders' | 'low_orders' | 'has_balance' | 'no_balance';

export default function MerchantsTab() {
  const qc = useQueryClient();
  const router = useRouter();
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showPass, setShowPass] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users');
      return data;
    },
    refetchInterval: 30000,
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await api.patch(`/api/admin/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
      toast.success('تم تحديث بيانات التاجر');
    },
    onError: () => toast.error('فشل تحديث البيانات'),
  });

  const copy = (text: string, label: string) => {
    Clipboard.setString(text ?? '');
    toast.success(`تم نسخ ${label}`);
  };

  const openEdit = (u: any) => {
    setEditForm({
      storeName: u.storeName || '',
      phone: u.phone || '',
      address: u.address || '',
      balance: String(u.balance ?? 0),
      password: '',
    });
    setShowPass(false);
    setEditUser(u);
  };

  const deleteMerchant = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/admin/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم حذف حساب التاجر');
    },
    onError: () => toast.error('فشل حذف الحساب'),
  });

  const confirmDelete = (u: any) => {
    Alert.alert(
      'حذف الحساب',
      `هل تريد حذف حساب "${u.storeName}" نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteMerchant.mutate(u.id) },
      ]
    );
  };

  const handleSave = () => {
    if (!editForm.storeName.trim()) {
      toast.warning('يرجى إدخال اسم المتجر');
      return;
    }
    if (!editForm.phone.trim()) {
      toast.warning('يرجى إدخال رقم الهاتف');
      return;
    }
    updateUser.mutate({ id: editUser.id, data: editForm });
  };

  // ✅ دالة الفلترة المحسنة
  const getFilteredMerchants = () => {
    let filtered = (users as any[])
      .filter((u: any) => u.role !== 'admin');

    // البحث (رقم التاجر، الاسم، الهاتف)
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter((u: any) =>
        u.storeName?.toLowerCase().includes(query) ||
        u.phone?.includes(query) ||
        String(u.merchantId || u.id).includes(query)
      );
    }

    // ✅ الفلاتر المخصصة
    switch (filter) {
      case 'active':
        filtered = filtered.filter((u: any) => (u.balance || 0) > 0 || (u.pendingBalance || 0) > 0);
        break;
      case 'inactive':
        filtered = filtered.filter((u: any) => (u.balance || 0) === 0 && (u.pendingBalance || 0) === 0);
        break;
      case 'high_orders':
        // نأخذ التجار الذين لديهم أكثر من 10 طلبات (نحسبها من الـ orders في الـ API)
        // مؤقتاً نستخدم الـ balance كمعيار
        filtered = filtered.filter((u: any) => (u.balance || 0) > 50000);
        break;
      case 'low_orders':
        filtered = filtered.filter((u: any) => (u.balance || 0) < 10000);
        break;
      case 'has_balance':
        filtered = filtered.filter((u: any) => (u.balance || 0) > 0);
        break;
      case 'no_balance':
        filtered = filtered.filter((u: any) => (u.balance || 0) === 0);
        break;
      default:
        break;
    }

    // ترتيب حسب الأحدث
    return filtered.sort((a: any, b: any) => b.id - a.id);
  };

  const merchants = getFilteredMerchants();

  // أسماء الفلاتر للعرض
  const filterLabels: Record<FilterType, string> = {
    all: 'الكل',
    active: 'نشط',
    inactive: 'غير نشط',
    high_orders: 'طلبات عالية',
    low_orders: 'طلبات قليلة',
    has_balance: 'لديه رصيد',
    no_balance: 'رصيد صفر',
  };

  // إحصائيات سريعة
  const totalMerchants = (users as any[]).filter((u: any) => u.role !== 'admin').length;
  const activeMerchants = (users as any[]).filter((u: any) => u.role !== 'admin' && (u.balance || 0) > 0).length;
  const totalBalance = (users as any[]).filter((u: any) => u.role !== 'admin').reduce((s, u) => s + (u.balance || 0), 0);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={s.loadingTxt}>جاري تحميل التجار...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* شريط البحث والفلترة */}
      <View style={s.topBar}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={17} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث بالاسم، الهاتف، أو رقم التاجر..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
            textAlign="right"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* زر الفلترة مع عرض الفلتر الحالي */}
        <TouchableOpacity
          style={[s.filterBtn, filter !== 'all' && s.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filter !== 'all' ? PRIMARY : '#6b7280'}
          />
          <Text style={[s.filterBtnText, filter !== 'all' && s.filterBtnTextActive]}>
            {filterLabels[filter]}
          </Text>
        </TouchableOpacity>
      </View>

      {/* إحصائيات سريعة */}
      <View style={s.quickStats}>
        <View style={s.statItem}>
          <Text style={s.statNumber}>{totalMerchants}</Text>
          <Text style={s.statLabel}>إجمالي التجار</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNumber, { color: SUCCESS }]}>{activeMerchants}</Text>
          <Text style={s.statLabel}>نشط</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNumber, { color: PRIMARY }]}>{totalMerchants - activeMerchants}</Text>
          <Text style={s.statLabel}>غير نشط</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={[s.statNumber, { color: '#8b5cf6' }]}>
            {totalBalance.toLocaleString()}
          </Text>
          <Text style={s.statLabel}>إجمالي الرصيد</Text>
        </View>
      </View>

      {/* قائمة التجار */}
      <FlatList
        data={merchants}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="people-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>
              {search ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد تجار'}
            </Text>
          </View>
        }
        renderItem={({ item: u }: any) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.9}
            onPress={() => router.push(`/admin/merchant/${u.id}`)}
          >
            <View style={s.cardHeader}>
              <View style={s.avatarRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{u.storeName?.charAt(0) || '؟'}</Text>
                </View>
                <View style={s.merchantInfo}>
                  <Text style={s.storeName}>{u.storeName}</Text>
                  <View style={s.idRow}>
                    <Text style={s.merchantId}>#{u.merchantId || u.id}</Text>
                    <TouchableOpacity
                      style={s.copyIdBtn}
                      onPress={() => copy(String(u.merchantId || u.id), 'رقم التاجر')}
                    >
                      <Ionicons name="copy-outline" size={12} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={s.statusDot}>
                <View style={[s.dot, (u.balance || 0) > 0 ? s.dotActive : s.dotInactive]} />
                <Text style={[s.statusText, (u.balance || 0) > 0 ? s.statusActive : s.statusInactive]}>
                  {(u.balance || 0) > 0 ? 'نشط' : 'غير نشط'}
                </Text>
              </View>
            </View>

            <View style={s.actionsRow}>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={(e) => { e.stopPropagation(); confirmDelete(u); }}
              >
                <Ionicons name="trash-outline" size={14} color={DANGER} />
                <Text style={s.deleteBtnTxt}>حذف</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.editBtn}
                onPress={(e) => { e.stopPropagation(); openEdit(u); }}
              >
                <Ionicons name="create-outline" size={14} color={PRIMARY} />
                <Text style={s.editBtnTxt}>تعديل</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.detailsBtn}
                onPress={(e) => { e.stopPropagation(); router.push(`/admin/merchant/${u.id}`); }}
              >
                <Ionicons name="eye-outline" size={14} color={PRIMARY} />
                <Text style={s.detailsBtnTxt}>تفاصيل</Text>
              </TouchableOpacity>
            </View>

            <View style={s.divider} />

            <View style={s.section}>
              <View style={s.infoLine}>
                <TouchableOpacity style={s.copyBtn} onPress={() => copy(u.phone, 'رقم الهاتف')}>
                  <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                </TouchableOpacity>
                <View style={s.infoRight}>
                  <Text style={s.infoLabel}>رقم الهاتف</Text>
                  <Text style={s.infoVal}>{u.phone || '—'}</Text>
                </View>
                <Ionicons name="call-outline" size={15} color="#9ca3af" />
              </View>
              {u.address && (
                <View style={s.infoLine}>
                  <TouchableOpacity style={s.copyBtn} onPress={() => copy(u.address, 'العنوان')}>
                    <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                  </TouchableOpacity>
                  <View style={s.infoRight}>
                    <Text style={s.infoLabel}>العنوان</Text>
                    <Text style={s.infoVal}>{u.address}</Text>
                  </View>
                  <Ionicons name="location-outline" size={15} color="#9ca3af" />
                </View>
              )}
            </View>

            <View style={s.divider} />

            <View style={s.balanceRow}>
              <View style={s.balanceBox}>
                <Text style={s.balanceLabel}>الرصيد المتاح</Text>
                <Text style={[s.balanceVal, { color: SUCCESS }]}>
                  {u.balance?.toLocaleString() ?? '0'} د.ع
                </Text>
              </View>
              <View style={s.balanceDivider} />
              <View style={s.balanceBox}>
                <Text style={s.balanceLabel}>الرصيد المعلق</Text>
                <Text style={[s.balanceVal, { color: SECONDARY }]}>
                  {u.pendingBalance?.toLocaleString() ?? '0'} د.ع
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* ✅ Modal الفلترة المحسّن */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.filterModalContent}>
            <View style={s.filterModalHeader}>
              <Text style={s.filterModalTitle}>فلترة التجار</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.filterSectionTitle}>حسب النشاط</Text>
              <View style={s.filterGrid}>
                {(['all', 'active', 'inactive'] as FilterType[]).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.filterOption, filter === key && s.filterOptionActive]}
                    onPress={() => {
                      setFilter(key);
                      setShowFilterModal(false);
                    }}
                  >
                    <Ionicons
                      name={filter === key ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={filter === key ? PRIMARY : '#d1d5db'}
                    />
                    <Text style={[s.filterOptionText, filter === key && s.filterOptionTextActive]}>
                      {filterLabels[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.filterSectionTitle}>حسب الرصيد</Text>
              <View style={s.filterGrid}>
                {(['has_balance', 'no_balance'] as FilterType[]).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.filterOption, filter === key && s.filterOptionActive]}
                    onPress={() => {
                      setFilter(key);
                      setShowFilterModal(false);
                    }}
                  >
                    <Ionicons
                      name={filter === key ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={filter === key ? PRIMARY : '#d1d5db'}
                    />
                    <Text style={[s.filterOptionText, filter === key && s.filterOptionTextActive]}>
                      {filterLabels[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.filterSectionTitle}>حسب الطلبات</Text>
              <View style={s.filterGrid}>
                {(['high_orders', 'low_orders'] as FilterType[]).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.filterOption, filter === key && s.filterOptionActive]}
                    onPress={() => {
                      setFilter(key);
                      setShowFilterModal(false);
                    }}
                  >
                    <Ionicons
                      name={filter === key ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={filter === key ? PRIMARY : '#d1d5db'}
                    />
                    <Text style={[s.filterOptionText, filter === key && s.filterOptionTextActive]}>
                      {filterLabels[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={s.clearFilterBtn}
                onPress={() => {
                  setFilter('all');
                  setSearch('');
                  setShowFilterModal(false);
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={PRIMARY} />
                <Text style={s.clearFilterText}>إعادة تعيين الفلتر</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal التعديل - نفس الكود */}
      <Modal visible={!!editUser} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>

              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setEditUser(null)} style={s.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
                <Text style={s.modalTitle}>تعديل بيانات التاجر</Text>
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>

                <Text style={s.inputLabel}>اسم المتجر</Text>
                <TextInput
                  style={s.input}
                  value={editForm.storeName}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, storeName: v }))}
                  placeholder="اسم المتجر"
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>رقم الهاتف</Text>
                <TextInput
                  style={s.input}
                  value={editForm.phone}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, phone: v }))}
                  placeholder="رقم الهاتف"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>العنوان</Text>
                <TextInput
                  style={s.input}
                  value={editForm.address}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, address: v }))}
                  placeholder="العنوان (اختياري)"
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>الرصيد المتاح (د.ع)</Text>
                <TextInput
                  style={s.input}
                  value={editForm.balance}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, balance: v }))}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>كلمة المرور الجديدة</Text>
                <View style={s.passRow}>
                  <TouchableOpacity style={s.passToggle} onPress={() => setShowPass(!showPass)}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                  </TouchableOpacity>
                  <TextInput
                    style={[s.input, s.passInput]}
                    value={editForm.password}
                    onChangeText={v => setEditForm((p: any) => ({ ...p, password: v }))}
                    placeholder="اتركها فارغة إن لم تريد التغيير"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPass}
                    textAlign="right"
                  />
                </View>

              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity
                  style={[s.saveBtn, updateUser.isPending && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={updateUser.isPending}>
                  {updateUser.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={s.saveBtnTxt}>حفظ التعديلات</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  listContent: { padding: 12, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },

  // ── شريط البحث والفلترة ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', textAlign: 'right' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  filterBtnActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  filterBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  filterBtnTextActive: { color: PRIMARY },

  // ── إحصائيات سريعة ──
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: '#e8edf2' },
  statNumber: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  // ── الكارد ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTxt: { fontSize: 20, fontWeight: 'bold', color: PRIMARY },
  merchantInfo: { alignItems: 'flex-end' },
  storeName: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  merchantId: { fontSize: 11, color: '#9ca3af' },
  copyIdBtn: { padding: 2 },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: SUCCESS },
  dotInactive: { backgroundColor: '#d1d5db' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusActive: { color: SUCCESS },
  statusInactive: { color: '#9ca3af' },

  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  editBtnTxt: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: DANGER + '12',
    borderWidth: 1,
    borderColor: DANGER + '30',
  },
  deleteBtnTxt: { fontSize: 12, fontWeight: '700', color: DANGER },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: PRIMARY + '10',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  detailsBtnTxt: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },

  section: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoRight: { alignItems: 'flex-end', flex: 1 },
  infoLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textAlign: 'right' },
  infoVal: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right' },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },

  balanceRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  balanceBox: { flex: 1, alignItems: 'center', gap: 4 },
  balanceDivider: { width: 1, backgroundColor: '#e5e7eb' },
  balanceLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  balanceVal: { fontSize: 14, fontWeight: 'bold' },

  // ── Modal الفلترة ──
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
    marginBottom: 10,
    textAlign: 'right',
  },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    minWidth: '30%',
  },
  filterOptionActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  filterOptionText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  filterOptionTextActive: { color: PRIMARY },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PRIMARY + '10',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  clearFilterText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },

  // ── Modal التعديل ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { padding: 20, paddingBottom: 10 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  inputLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    marginBottom: 4,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passToggle: {
    width: 42,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  passInput: { flex: 1, marginBottom: 0 },

  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});