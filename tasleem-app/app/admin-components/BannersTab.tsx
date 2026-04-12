import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput, Image,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const DANGER = '#ef4444';
const SUCCESS = '#10b981';
const BG = '#f2f6f9';

type BannerForm = {
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_FORM: BannerForm = { title: '', imageUrl: '', link: '', isActive: true, sortOrder: '0' };

export default function BannersTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editBanner, setEditBanner] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data } = await api.get('/api/banners');
      return (data as any[]).sort((a, b) => a.sortOrder - b.sortOrder);
    },
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
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success(editBanner ? 'تم تعديل البنر ✅' : 'تم إضافة البنر ✅');
      closeModal();
    },
    onError: () => toast.error('فشل الحفظ'),
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { data } = await api.patch(`/api/banners/${id}`, { isActive });
      return data;
    },
    onSuccess: (updated: any) => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success(updated.isActive ? 'تم تفعيل البنر ✅' : 'تم تعطيل البنر');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/banners/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.info('تم حذف البنر');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.error('يرجى السماح بالوصول للصور');
      return;
    }
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
    } catch {
      toast.error('فشل رفع الصورة');
    }
    setUploading(false);
  };

  const openAdd = () => {
    setEditBanner(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };
  const openEdit = (b: any) => {
    setEditBanner(b);
    setForm({
      title: b.title || '',
      imageUrl: b.imageUrl || '',
      link: b.link || '',
      isActive: Boolean(b.isActive),
      sortOrder: String(b.sortOrder ?? 0),
    });
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditBanner(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.imageUrl) {
      toast.warning('يرجى رفع صورة البنر');
      return;
    }
    saveBanner.mutate({
      title: form.title.trim(),
      imageUrl: form.imageUrl,
      link: form.link.trim(),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  const confirmDelete = (b: any) => {
    Alert.alert('حذف البنر', `هل تريد حذف هذا البنر نهائياً؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteBanner.mutate(b.id) },
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
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={s.addBtnTxt}>إضافة بنر جديد</Text>
      </TouchableOpacity>

      {/* قائمة البنرات */}
      <FlatList
        data={banners as any[]}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="image-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد بنرات</Text>
          </View>
        }
        renderItem={({ item: b }: any) => (
          <View style={[s.card, !b.isActive && s.cardOff]}>

            <Image source={{ uri: b.imageUrl }} style={s.img} resizeMode="cover" />

            <View style={s.orderBadge}>
              <Text style={s.orderBadgeTxt}>#{b.sortOrder}</Text>
            </View>

            <View style={s.footer}>
              <View style={s.footerInfo}>
                {b.title ? <Text style={s.titleTxt} numberOfLines={1}>{b.title}</Text> : null}
                {b.link ? (
                  <View style={s.linkRow}>
                    <Ionicons name="link-outline" size={11} color="#9ca3af" />
                    <Text style={s.linkTxt} numberOfLines={1}>{b.link}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.footerActions}>
                <TouchableOpacity
                  style={[s.toggleBtn, { backgroundColor: b.isActive ? SUCCESS + '15' : '#f3f4f6' }]}
                  onPress={() => toggleBanner.mutate({ id: b.id, isActive: !b.isActive })}
                  disabled={toggleBanner.isPending}>
                  <Ionicons
                    name={b.isActive ? 'eye-outline' : 'eye-off-outline'}
                    size={15}
                    color={b.isActive ? SUCCESS : '#9ca3af'}
                  />
                  <Text style={[s.toggleTxt, { color: b.isActive ? SUCCESS : '#9ca3af' }]}>
                    {b.isActive ? 'فعال' : 'معطل'}
                  </Text>
                </TouchableOpacity>

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

      {/* Modal الإضافة/التعديل */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.overlay}>
            <View style={s.sheet}>

              <View style={s.sheetHeader}>
                <TouchableOpacity onPress={closeModal} style={s.closeBtn}>
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
                <Text style={s.sheetTitle}>{editBanner ? 'تعديل البنر' : 'إضافة بنر'}</Text>
                <Ionicons name="image-outline" size={20} color={PRIMARY} />
              </View>

              <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>

                <Text style={s.label}>صورة البنر *</Text>
                <TouchableOpacity style={s.uploadBox} onPress={pickImage} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={PRIMARY} />
                  ) : form.imageUrl ? (
                    <Image source={{ uri: form.imageUrl }} style={s.uploadPreview} resizeMode="cover" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={30} color={PRIMARY} />
                      <Text style={s.uploadTxt}>اضغط لرفع الصورة</Text>
                      <Text style={s.uploadSub}>يفضل نسبة 16:9</Text>
                    </>
                  )}
                </TouchableOpacity>
                {form.imageUrl ? (
                  <TouchableOpacity onPress={pickImage} style={s.changeBtn}>
                    <Text style={s.changeTxt}>تغيير الصورة</Text>
                  </TouchableOpacity>
                ) : null}

                <Text style={s.label}>العنوان (اختياري)</Text>
                <TextInput
                  style={s.input}
                  value={form.title}
                  onChangeText={v => setForm(p => ({ ...p, title: v }))}
                  placeholder="عنوان البنر"
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                />

                <Text style={s.label}>الرابط (اختياري)</Text>
                <TextInput
                  style={s.input}
                  value={form.link}
                  onChangeText={v => setForm(p => ({ ...p, link: v }))}
                  placeholder="https://..."
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                  keyboardType="url"
                  autoCapitalize="none"
                />

                <Text style={s.label}>الترتيب</Text>
                <TextInput
                  style={s.input}
                  value={form.sortOrder}
                  onChangeText={v => setForm(p => ({ ...p, sortOrder: v }))}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={[s.activeToggle, { borderColor: form.isActive ? SUCCESS : '#e5e7eb' }]}
                  onPress={() => setForm(p => ({ ...p, isActive: !p.isActive }))}>
                  <View style={[s.activeTrack, form.isActive && s.activeTrackOn]}>
                    <View style={[s.activeThumb, form.isActive && s.activeThumbOn]} />
                  </View>
                  <Text style={[s.activeTxt, { color: form.isActive ? SUCCESS : '#9ca3af' }]}>
                    {form.isActive ? '✅ البنر فعال — سيظهر في الصفحة الرئيسية' : '❌ البنر معطل — لن يظهر للمستخدمين'}
                  </Text>
                </TouchableOpacity>

              </ScrollView>

              <View style={s.sheetFooter}>
                <TouchableOpacity
                  style={[s.saveBtn, saveBanner.isPending && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saveBanner.isPending}>
                  {saveBanner.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={s.saveBtnTxt}>{editBanner ? 'حفظ التعديلات' : 'إضافة البنر'}</Text>
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
  emptyTxt: { fontSize: 15, color: '#9ca3af' },

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
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  cardOff: { opacity: 0.55 },
  img: { width: '100%', height: 160 },

  orderBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orderBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 8,
  },
  footerInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  titleTxt: { fontSize: 13, fontWeight: '700', color: '#111827' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkTxt: { fontSize: 11, color: '#9ca3af', maxWidth: 160 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleTxt: { fontSize: 11, fontWeight: '700' },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: DANGER + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBody: { padding: 20, paddingBottom: 8 },
  sheetFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  label: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },

  uploadBox: {
    borderWidth: 2,
    borderColor: PRIMARY + '40',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 155,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY + '06',
    gap: 8,
    overflow: 'hidden',
  },
  uploadPreview: { width: '100%', height: '100%' },
  uploadTxt: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  uploadSub: { fontSize: 11, color: '#9ca3af' },
  changeBtn: { alignSelf: 'center', marginTop: 8 },
  changeTxt: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  activeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  activeTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    padding: 2,
  },
  activeTrackOn: { backgroundColor: SUCCESS },
  activeThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  activeThumbOn: { alignSelf: 'flex-end' },
  activeTxt: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },

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