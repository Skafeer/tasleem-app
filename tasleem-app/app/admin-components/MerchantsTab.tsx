import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Clipboard, Alert, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY  = '#0c6679';
const SUCCESS  = '#10b981';
const SECONDARY = '#f5a006';
const DANGER   = '#ef4444';

export default function MerchantsTab() {
  const qc = useQueryClient();
  const [editUser, setEditUser]   = useState<any>(null);
  const [editForm, setEditForm]   = useState<any>({});
  const [showPass, setShowPass]   = useState(false);
  const [search, setSearch]       = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data; },
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
      phone:     u.phone     || '',
      address:   u.address   || '',
      balance:   String(u.balance ?? 0),
      password:  '',
    });
    setShowPass(false);
    setEditUser(u);
  };


  const deleteMerchant = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/admin/users/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('تم حذف حساب التاجر'); },
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
    if (!editForm.storeName.trim()) { toast.warning('يرجى إدخال اسم المتجر'); return; }
    if (!editForm.phone.trim())     { toast.warning('يرجى إدخال رقم الهاتف'); return; }
    updateUser.mutate({ id: editUser.id, data: editForm });
  };

  const merchants = (users as any[])
    .filter((u: any) => u.role !== 'admin')
    .filter((u: any) =>
      !search ||
      u.storeName?.includes(search) ||
      u.phone?.includes(search) ||
      String(u.merchantId)?.includes(search)
    )
    .sort((a: any, b: any) => b.id - a.id);

  if (isLoading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={s.loadingTxt}>جاري تحميل التجار...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>

      {/* بحث */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="ابحث باسم المتجر أو الهاتف..."
          value={search} onChangeText={setSearch}
          placeholderTextColor="#9ca3af" textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* القائمة */}
      <FlatList
        data={merchants}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="people-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا يوجد تجار</Text>
          </View>
        }
        renderItem={({ item: u }: any) => (
          <View style={s.card}>

            {/* رأس الكارد */}
            <View style={s.cardHeader}>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(u)}>
                  <Ionicons name="trash-outline" size={14} color={DANGER} />
                  <Text style={s.deleteBtnTxt}>حذف</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(u)}>
                  <Ionicons name="create-outline" size={14} color={PRIMARY} />
                  <Text style={s.editBtnTxt}>تعديل</Text>
                </TouchableOpacity>
              </View>
              <View style={s.avatarRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{u.storeName?.charAt(0) || '؟'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.storeName}>{u.storeName}</Text>
                  <Text style={s.merchantId}>رقم التاجر: #{u.merchantId || u.id}</Text>
                </View>
              </View>
            </View>

            <View style={s.divider} />

            {/* معلومات التواصل */}
            <View style={s.section}>
              <View style={s.infoLine}>
                <TouchableOpacity style={s.copyBtn} onPress={() => copy(u.phone, 'رقم الهاتف')}>
                  <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end' }}>
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
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.infoLabel}>العنوان</Text>
                    <Text style={s.infoVal}>{u.address}</Text>
                  </View>
                  <Ionicons name="location-outline" size={15} color="#9ca3af" />
                </View>
              )}
            </View>

            <View style={s.divider} />

            {/* الأرباح والرصيد */}
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

          </View>
        )}
      />

      {/* Modal التعديل */}
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
                <TextInput style={s.input} value={editForm.storeName}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, storeName: v }))}
                  placeholder="اسم المتجر" placeholderTextColor="#9ca3af" textAlign="right" />

                <Text style={s.inputLabel}>رقم الهاتف</Text>
                <TextInput style={s.input} value={editForm.phone}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, phone: v }))}
                  placeholder="رقم الهاتف" placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad" textAlign="right" />

                <Text style={s.inputLabel}>العنوان</Text>
                <TextInput style={s.input} value={editForm.address}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, address: v }))}
                  placeholder="العنوان (اختياري)" placeholderTextColor="#9ca3af" textAlign="right" />

                <Text style={s.inputLabel}>الرصيد المتاح (د.ع)</Text>
                <TextInput style={s.input} value={editForm.balance}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, balance: v }))}
                  placeholder="0" placeholderTextColor="#9ca3af"
                  keyboardType="numeric" textAlign="right" />

                <Text style={s.inputLabel}>كلمة المرور الجديدة</Text>
                <View style={s.passRow}>
                  <TouchableOpacity style={s.passToggle} onPress={() => setShowPass(!showPass)}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
                  </TouchableOpacity>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
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
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={updateUser.isPending}>
                  {updateUser.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={s.saveBtnTxt}>حفظ التعديلات</Text>
                      </>
                  }
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
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt:   { fontSize: 16, color: '#9ca3af', fontWeight: '600' },

  searchWrap:  { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 10, borderRadius: 14, paddingHorizontal: 12, gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },

  card:       { backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  avatarRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  avatar:     { width: 46, height: 46, borderRadius: 23, backgroundColor: PRIMARY + '20', justifyContent: 'center', alignItems: 'center' },
  avatarTxt:  { fontSize: 20, fontWeight: 'bold', color: PRIMARY },
  storeName:  { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  merchantId: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  editBtn:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: PRIMARY + '12', borderWidth: 1, borderColor: PRIMARY + '30' },
  editBtnTxt: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },

  section:  { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  infoLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  infoLabel:{ fontSize: 10, color: '#9ca3af', fontWeight: '600', textAlign: 'right' },
  infoVal:  { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right' },
  copyBtn:  { width: 30, height: 30, borderRadius: 9, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },

  balanceRow:     { flexDirection: 'row-reverse', backgroundColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 14 },
  balanceBox:     { flex: 1, alignItems: 'center', gap: 4 },
  balanceDivider: { width: 1, backgroundColor: '#e5e7eb' },
  balanceLabel:   { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  balanceVal:     { fontSize: 14, fontWeight: 'bold' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  modalHeader:   { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle:    { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  modalBody:     { padding: 20, paddingBottom: 10 },
  modalFooter:   { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  inputLabel: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 6, marginTop: 12, fontWeight: '600' },
  input:      { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 4 },
  passRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  passToggle: { width: 42, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb' },

  saveBtn:    { backgroundColor: PRIMARY, borderRadius: 14, height: 50, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  deleteBtn:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: DANGER + '12', borderWidth: 1, borderColor: DANGER + '30' },
  deleteBtnTxt: { fontSize: 12, fontWeight: '700', color: DANGER },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
