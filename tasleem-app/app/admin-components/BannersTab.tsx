import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput, Image,
  ScrollView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY   = '#0c6679';
const DANGER    = '#ef4444';
const SUCCESS   = '#10b981';

export default function BannersTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editBanner, setEditBanner] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', imageUrl: '', link: '', isActive: true, sortOrder: '0' });

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => { const { data } = await api.get('/api/banners'); return data; },
  });

  const saveBanner = useMutation({
    mutationFn: async (d: any) => {
      if (editBanner) {
        const { data } = await api.patch(`/api/banners/${editBanner.id}`, d);
        return data;
      }
      const { data } = await api.post('/api/banners', d);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success(editBanner ? 'تم تعديل البنر ✅' : 'تم إضافة البنر ✅');
      closeModal();
    },
    onError: () => toast.error('فشل الحفظ'),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/banners/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['banners'] }); toast.info('تم حذف البنر'); },
    onError: () => toast.error('فشل الحذف'),
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, isActive }: any) => {
      const { data } = await api.patch(`/api/banners/${id}`, { isActive });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('يرجى السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const { data } = await api.post('/api/upload', { image: base64 });
      setForm(p => ({ ...p, imageUrl: data.url }));
      toast.success('تم رفع الصورة ✅');
    } catch { toast.error('فشل رفع الصورة'); }
    setUploading(false);
  };

  const openAdd = () => {
    setEditBanner(null);
    setForm({ title: '', imageUrl: '', link: '', isActive: true, sortOrder: '0' });
    setShowModal(true);
  };

  const openEdit = (b: any) => {
    setEditBanner(b);
    setForm({ title: b.title || '', imageUrl: b.imageUrl || '', link: b.link || '', isActive: b.isActive, sortOrder: String(b.sortOrder || 0) });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditBanner(null); };

  const handleSave = () => {
    if (!form.imageUrl) { toast.warning('يرجى رفع صورة البنر'); return; }
    saveBanner.mutate({
      title: form.title,
      imageUrl: form.imageUrl,
      link: form.link,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  const confirmDelete = (b: any) => {
    Alert.alert('حذف البنر', `هل تريد حذف البنر "${b.title || 'بدون عنوان'}" نهائياً؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteBanner.mutate(b.id) },
    ]);
  };

  if (isLoading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>

      {/* زر الإضافة */}
      <TouchableOpacity style={s.addBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={s.addBtnTxt}>إضافة بنر جديد</Text>
      </TouchableOpacity>

      <FlatList
        data={banners as any[]}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="image-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد بنرات</Text>
            <Text style={s.emptySubTxt}>أضف بنراً للبدء</Text>
          </View>
        }
        renderItem={({ item: b }: any) => (
          <View style={[s.card, !b.isActive && s.cardInactive]}>

            {/* صورة البنر */}
            {b.imageUrl ? (
              <Image source={{ uri: b.imageUrl }} style={s.bannerImg} resizeMode="cover" />
            ) : (
              <View style={s.bannerImgPlaceholder}>
                <Ionicons name="image-outline" size={36} color="#d1d5db" />
              </View>
            )}

            {/* بادج الترتيب */}
            <View style={s.orderBadge}>
              <Text style={s.orderBadgeTxt}>#{b.sortOrder}</Text>
            </View>

            {/* معلومات */}
            <View style={s.cardBody}>
              <View style={s.cardInfo}>
                {b.title ? <Text style={s.bannerTitle}>{b.title}</Text> : null}
                {b.link  ? (
                  <View style={s.linkRow}>
                    <Ionicons name="link-outline" size={12} color="#9ca3af" />
                    <Text style={s.linkTxt} numberOfLines={1}>{b.link}</Text>
                  </View>
                ) : null}
              </View>

              {/* أزرار */}
              <View style={s.cardActions}>
                <Switch
                  value={b.isActive}
                  onValueChange={(v) => toggleBanner.mutate({ id: b.id, isActive: v })}
                  trackColor={{ false: '#e5e7eb', true: SUCCESS + '80' }}
                  thumbColor={b.isActive ? SUCCESS : '#9ca3af'}
                />
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(b)}>
                  <Ionicons name="create-outline" size={15} color={PRIMARY} />
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(b)}>
                  <Ionicons name="trash-outline" size={15} color={DANGER} />
                </TouchableOpacity>
              </View>
            </View>

          </View>
        )}
      />

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>

              <View style={s.modalHeader}>
                <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
                <Text style={s.modalTitle}>{editBanner ? 'تعديل البنر' : 'إضافة بنر جديد'}</Text>
                <Ionicons name="image-outline" size={20} color={PRIMARY} />
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>

                {/* رفع الصورة */}
                <Text style={s.inputLabel}>صورة البنر *</Text>
                <TouchableOpacity style={s.uploadBox} onPress={pickImage} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={PRIMARY} />
                  ) : form.imageUrl ? (
                    <Image source={{ uri: form.imageUrl }} style={s.uploadPreview} resizeMode="cover" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={32} color={PRIMARY} />
                      <Text style={s.uploadTxt}>اضغط لرفع صورة البنر</Text>
                      <Text style={s.uploadSub}>يفضل 16:9 أو 3:1</Text>
                    </>
                  )}
                </TouchableOpacity>
                {form.imageUrl ? (
                  <TouchableOpacity style={s.changeImgBtn} onPress={pickImage}>
                    <Text style={s.changeImgTxt}>تغيير الصورة</Text>
                  </TouchableOpacity>
                ) : null}

                <Text style={s.inputLabel}>العنوان (اختياري)</Text>
                <TextInput style={s.input} value={form.title}
                  onChangeText={v => setForm(p => ({ ...p, title: v }))}
                  placeholder="عنوان البنر" placeholderTextColor="#9ca3af" textAlign="right" />

                <Text style={s.inputLabel}>الرابط (اختياري)</Text>
                <TextInput style={s.input} value={form.link}
                  onChangeText={v => setForm(p => ({ ...p, link: v }))}
                  placeholder="https://..." placeholderTextColor="#9ca3af" textAlign="right"
                  keyboardType="url" autoCapitalize="none" />

                <Text style={s.inputLabel}>الترتيب</Text>
                <TextInput style={s.input} value={form.sortOrder}
                  onChangeText={v => setForm(p => ({ ...p, sortOrder: v }))}
                  placeholder="0" placeholderTextColor="#9ca3af" textAlign="right"
                  keyboardType="numeric" />

                <View style={s.switchRow}>
                  <Switch
                    value={form.isActive}
                    onValueChange={v => setForm(p => ({ ...p, isActive: v }))}
                    trackColor={{ false: '#e5e7eb', true: SUCCESS + '80' }}
                    thumbColor={form.isActive ? SUCCESS : '#9ca3af'}
                  />
                  <Text style={s.switchLabel}>{form.isActive ? 'البنر فعال' : 'البنر معطل'}</Text>
                </View>

              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saveBanner.isPending}>
                  {saveBanner.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={s.saveBtnTxt}>{editBanner ? 'حفظ التعديلات' : 'إضافة البنر'}</Text>
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
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt:    { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptySubTxt: { fontSize: 13, color: '#9ca3af' },

  addBtn:    { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 14, margin: 12, paddingVertical: 14 },
  addBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  card:         { backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardInactive: { opacity: 0.6 },
  bannerImg:    { width: '100%', height: 160 },
  bannerImgPlaceholder: { width: '100%', height: 160, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },

  orderBadge:    { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  orderBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  cardBody:    { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  cardInfo:    { flex: 1, alignItems: 'flex-end', gap: 4 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  linkRow:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  linkTxt:     { fontSize: 11, color: '#9ca3af', maxWidth: 180 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  deleteBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: DANGER + '10', justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  modalHeader:  { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle:   { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  modalCloseBtn:{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  modalBody:    { padding: 20, paddingBottom: 10 },
  modalFooter:  { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  inputLabel: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 6, marginTop: 12, fontWeight: '600' },
  input:      { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },

  uploadBox:     { borderWidth: 2, borderColor: PRIMARY + '40', borderStyle: 'dashed', borderRadius: 16, height: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: PRIMARY + '06', gap: 8, overflow: 'hidden' },
  uploadPreview: { width: '100%', height: '100%' },
  uploadTxt:     { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  uploadSub:     { fontSize: 11, color: '#9ca3af' },
  changeImgBtn:  { alignItems: 'center', marginTop: 8 },
  changeImgTxt:  { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  switchRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 16, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  switchLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },

  saveBtn:    { backgroundColor: PRIMARY, borderRadius: 14, height: 50, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
