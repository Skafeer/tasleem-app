import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, Image,
  KeyboardAvoidingView, Platform, UIManager,
  PanResponder, Animated, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const DANGER  = '#ef4444';
const SUCCESS = '#10b981';
const BG      = '#f2f6f9';

// الأبعاد المطلوبة: 1440x560 (نسبة 18:7)
const TARGET_WIDTH = 1440;
const TARGET_HEIGHT = 560;
const ASPECT_RATIO = 18 / 7;

const ITEM_H = 110; 

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Banner = {
  id: number;
  title?: string;
  imageUrl: string;
  link?: string;
  isActive: boolean;
  sortOrder: number;
};

type BannerForm = {
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
};

const EMPTY_FORM: BannerForm = { title: '', imageUrl: '', link: '', isActive: true };

export default function BannersTab() {
  const { width: screenWidth } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [isUploading, setIsUploading] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const res = await api.get('/banners');
      return (res.data as Banner[]).sort((a, b) => a.sortOrder - b.sortOrder);
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBanner) {
        return api.put(`/banners/${editingBanner.id}`, data);
      }
      return api.post('/banners', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success(editingBanner ? 'تم التحديث' : 'تمت الإضافة');
      closeModal();
    },
    onError: () => toast.error('فشلت العملية')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('تم الحذف');
    }
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('عذراً', 'نحتاج إذن الوصول للصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [18, 7], // تحديد النسبة المطلوبة أثناء القص
      quality: 1,
    });

    if (!result.canceled) {
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsUploading(true);
    try {
      // تغيير حجم الصورة للأبعاد المطلوبة بالضبط
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: TARGET_WIDTH, height: TARGET_HEIGHT } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('image', {
        uri: manipResult.uri,
        name: 'banner.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setForm({ ...form, imageUrl: res.data.url });
    } catch (err) {
      toast.error('فشل رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const openModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setForm({
        title: banner.title || '',
        imageUrl: banner.imageUrl,
        link: banner.link || '',
        isActive: banner.isActive
      });
    } else {
      setEditingBanner(null);
      setForm(EMPTY_FORM);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBanner(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.imageUrl) return toast.error('يرجى اختيار صورة');
    upsertMutation.mutate(form);
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 50 }} color={PRIMARY} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>إدارة البانرات الإعلانية</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addBtnText}>إضافة بانر</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>ملاحظة: المقاس المطلوب للبانر هو {TARGET_WIDTH}x{TARGET_HEIGHT} بكسل (18:7)</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {banners.map((item) => (
          <View key={item.id} style={styles.card}>
            <Image source={{ uri: item.imageUrl }} style={[styles.preview, { aspectRatio: ASPECT_RATIO }]} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'بدون عنوان'}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.badge, { backgroundColor: item.isActive ? SUCCESS : '#94a3b8' }]}>
                  <Text style={styles.badgeText}>{item.isActive ? 'نشط' : 'متوقف'}</Text>
                </View>
                <Text style={styles.sortText}>ترتيب: {item.sortOrder}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                <Ionicons name="pencil" size={20} color={PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => Alert.alert('حذف', 'هل أنت متأكد؟', [
                  { text: 'إلغاء' },
                  { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) }
                ])}
                style={styles.actionBtn}
              >
                <Ionicons name="trash" size={20} color={DANGER} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBanner ? 'تعديل بانر' : 'إضافة بانر جديد'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <Text style={styles.label}>صورة البانر (18:7)</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {isUploading ? (
                  <ActivityIndicator color={PRIMARY} />
                ) : form.imageUrl ? (
                  <Image source={{ uri: form.imageUrl }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.placeholder}>
                    <Ionicons name="image-outline" size={40} color="#94a3b8" />
                    <Text style={styles.placeholderText}>اضغط لاختيار صورة</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>العنوان (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
                placeholder="مثلاً: عروض العيد"
              />

              <Text style={styles.label}>الرابط / الوجهة (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={form.link}
                onChangeText={(t) => setForm({ ...form, link: t })}
                placeholder="https://..."
              />

              <TouchableOpacity 
                style={styles.switchRow}
                onPress={() => setForm({ ...form, isActive: !form.isActive })}
              >
                <Text style={styles.label}>حالة البانر (نشط)</Text>
                <Ionicons 
                  name={form.isActive ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={form.isActive ? PRIMARY : '#94a3b8'} 
                />
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveBtn, upsertMutation.isPending && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  addBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: PRIMARY,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 5,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  hint: {
    padding: 10,
    backgroundColor: '#fffbeb',
    color: '#92400e',
    fontSize: 12,
    textAlign: 'center',
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  list: { padding: 20, gap: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  preview: { width: '100%', backgroundColor: '#f1f5f9' },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 5 },
  statusRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  sortText: { fontSize: 12, color: '#64748b' },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 5,
  },
  actionBtn: { flex: 1, alignItems: 'center', padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  form: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8, textAlign: 'right' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    textAlign: 'right',
    marginBottom: 15,
  },
  imagePicker: {
    width: '100%',
    aspectRatio: 18 / 7,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  pickedImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { marginTop: 8, color: '#94a3b8', fontSize: 13 },
  switchRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
