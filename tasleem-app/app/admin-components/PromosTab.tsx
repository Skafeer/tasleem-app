import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const BG = '#f2f6f9';

export default function PromosTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [form, setForm] = useState({ code: '', discountPercent: '' });

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data } = await api.get('/api/promo-codes');
      return data;
    },
  });

  const savePromo = useMutation({
    mutationFn: async (d: any) => {
      if (editPromo) {
        const { data } = await api.patch(`/api/promo-codes/${editPromo.id}`, d);
        return data;
      }
      const { data } = await api.post('/api/promo-codes', d);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success(editPromo ? 'تم تعديل الكود ✅' : 'تم إضافة الكود ✅');
      closeModal();
    },
    onError: () => toast.error('فشل الحفظ'),
  });

  const togglePromo = useMutation({
    mutationFn: async ({ id, isActive }: any) => {
      const { data } = await api.patch(`/api/promo-codes/${id}`, { isActive });
      return data;
    },
    onSuccess: (_: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success(vars.isActive ? 'تم تفعيل الكود' : 'تم تعطيل الكود');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const deletePromo = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/promo-codes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.info('تم حذف الكود');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  const openAdd = () => {
    setEditPromo(null);
    setForm({ code: '', discountPercent: '' });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditPromo(p);
    setForm({ code: p.code, discountPercent: String(p.discountPercent) });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPromo(null);
    setForm({ code: '', discountPercent: '' });
  };

  const handleSave = () => {
    if (!form.code.trim()) {
      toast.warning('يرجى إدخال الكود');
      return;
    }
    if (!form.discountPercent.trim()) {
      toast.warning('يرجى إدخال نسبة الخصم');
      return;
    }
    const pct = Number(form.discountPercent);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast.warning('نسبة الخصم يجب أن تكون بين 1 و 100');
      return;
    }
    savePromo.mutate({ code: form.code.toUpperCase(), discountPercent: pct });
  };

  const confirmDelete = (p: any) => {
    Alert.alert('حذف الكود', `هل تريد حذف كود "${p.code}" نهائياً؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deletePromo.mutate(p.id) },
    ]);
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* زر الإضافة */}
      <TouchableOpacity style={s.addBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={s.addBtnTxt}>إضافة كود خصم جديد</Text>
      </TouchableOpacity>

      {/* قائمة الأكواد */}
      <FlatList
        data={promos as any[]}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="pricetag-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد أكواد خصم</Text>
            <Text style={s.emptySubTxt}>أضف كوداً للبدء</Text>
          </View>
        }
        renderItem={({ item: p }: any) => (
          <View style={[s.card, !p.isActive && s.cardInactive]}>

            {/* رأس الكارد */}
            <View style={s.cardHeader}>
              <View style={s.codeBox}>
                <View style={[s.iconBox, { backgroundColor: p.isActive ? '#fffbeb' : '#f3f4f6' }]}>
                  <Ionicons name="pricetag-outline" size={26} color={p.isActive ? SECONDARY : '#9ca3af'} />
                </View>
                <View style={s.codeInfo}>
                  <Text style={[s.code, !p.isActive && { color: '#9ca3af' }]}>{p.code}</Text>
                  <Text style={[s.discount, !p.isActive && { color: '#9ca3af' }]}>خصم {p.discountPercent}%</Text>
                </View>
              </View>

              {/* أزرار الإجراءات */}
              <View style={s.actions}>
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(p)}>
                  <Ionicons name="trash-outline" size={16} color={DANGER} />
                </TouchableOpacity>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(p)}>
                  <Ionicons name="create-outline" size={16} color={PRIMARY} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.divider} />

            {/* تبديل التفعيل */}
            <TouchableOpacity
              style={s.toggleRow}
              onPress={() => togglePromo.mutate({ id: p.id, isActive: !p.isActive })}
              disabled={togglePromo.isPending}>
              <View style={s.toggleInfo}>
                <Text style={[s.toggleLabel, { color: p.isActive ? SUCCESS : '#9ca3af' }]}>
                  {p.isActive ? '✅ الكود فعال' : '❌ الكود معطل'}
                </Text>
                <Text style={s.toggleSub}>اضغط لتغيير الحالة</Text>
              </View>
              <View style={[s.toggleTrack, p.isActive && s.toggleTrackOn]}>
                <View style={[s.toggleThumb, p.isActive && s.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal الإضافة/التعديل */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>

              <View style={s.modalHeader}>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
                <Text style={s.modalTitle}>{editPromo ? 'تعديل كود الخصم' : 'إضافة كود خصم'}</Text>
                <Ionicons name="pricetag-outline" size={22} color={SECONDARY} />
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>

                <Text style={s.inputLabel}>الكود</Text>
                <TextInput
                  style={s.input}
                  placeholder="SAVE10"
                  value={form.code}
                  onChangeText={v => setForm(p => ({ ...p, code: v.toUpperCase() }))}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                />

                <Text style={s.inputLabel}>نسبة الخصم %</Text>
                <TextInput
                  style={s.input}
                  placeholder="10"
                  value={form.discountPercent}
                  onChangeText={v => setForm(p => ({ ...p, discountPercent: v }))}
                  keyboardType="numeric"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />

              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity
                  style={[s.saveBtn, savePromo.isPending && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={savePromo.isPending}>
                  {savePromo.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={s.saveBtnTxt}>{editPromo ? 'حفظ التعديلات' : 'إضافة الكود'}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt: { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptySubTxt: { fontSize: 13, color: '#9ca3af' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    margin: 12,
    paddingVertical: 14,
  },
  addBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

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
  cardInactive: { opacity: 0.7 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeInfo: { alignItems: 'flex-end' },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  code: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  discount: { fontSize: 14, color: SECONDARY, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: DANGER + '10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DANGER + '25',
  },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleInfo: { alignItems: 'flex-end' },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackOn: { backgroundColor: SUCCESS },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel: { fontSize: 13, fontWeight: '700' },
  toggleSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
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
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },

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