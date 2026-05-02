import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const AVAILABLE_ICONS = [
  // عام وتصنيفات
  { icon: 'grid-outline',                 label: 'عام' },
  { icon: 'apps-outline',                 label: 'تطبيقات' },
  { icon: 'layers-outline',              label: 'طبقات' },
  { icon: 'albums-outline',              label: 'ألبوم' },
  { icon: 'bookmark-outline',            label: 'مفضلة' },
  { icon: 'flag-outline',                label: 'علم' },
  { icon: 'star-outline',               label: 'نجمة' },
  { icon: 'heart-outline',              label: 'قلب' },
  { icon: 'ribbon-outline',             label: 'شارة' },
  { icon: 'trophy-outline',             label: 'جائزة' },
  // إلكترونيات وتقنية
  { icon: 'phone-portrait-outline',     label: 'جوال' },
  { icon: 'laptop-outline',             label: 'لابتوب' },
  { icon: 'desktop-outline',            label: 'كمبيوتر' },
  { icon: 'tablet-portrait-outline',    label: 'تابلت' },
  { icon: 'watch-outline',              label: 'ساعة ذكية' },
  { icon: 'headset-outline',            label: 'سماعات' },
  { icon: 'camera-outline',             label: 'كاميرا' },
  { icon: 'tv-outline',                 label: 'تلفاز' },
  { icon: 'radio-outline',              label: 'راديو' },
  { icon: 'battery-charging-outline',   label: 'شحن' },
  { icon: 'wifi-outline',               label: 'واي فاي' },
  { icon: 'bluetooth-outline',          label: 'بلوتوث' },
  { icon: 'hardware-chip-outline',      label: 'رقائق' },
  { icon: 'print-outline',              label: 'طابعة' },
  { icon: 'scan-outline',               label: 'ماسح' },
  // منزل وأثاث
  { icon: 'home-outline',               label: 'منزل' },
  { icon: 'bed-outline',                label: 'غرفة نوم' },
  { icon: 'restaurant-outline',         label: 'مطبخ' },
  { icon: 'water-outline',              label: 'حمام' },
  { icon: 'bulb-outline',               label: 'إضاءة' },
  { icon: 'thermometer-outline',        label: 'تكييف' },
  { icon: 'lock-closed-outline',        label: 'أمن منزل' },
  { icon: 'color-palette-outline',      label: 'ديكور' },
  { icon: 'leaf-outline',               label: 'نباتات' },
  { icon: 'bonfire-outline',            label: 'مدفأة' },
  // ملابس وأزياء
  { icon: 'shirt-outline',              label: 'ملابس' },
  { icon: 'body-outline',               label: 'أزياء' },
  { icon: 'glasses-outline',            label: 'نظارات' },
  { icon: 'umbrella-outline',           label: 'مظلة' },
  { icon: 'bag-outline',                label: 'حقيبة' },
  { icon: 'backpack-outline',           label: 'حقيبة ظهر' },
  { icon: 'wallet-outline',             label: 'محفظة' },
  { icon: 'diamond-outline',            label: 'مجوهرات' },
  // اكسسوارات وعطور
  { icon: 'rose-outline',               label: 'اكسسوارات' },
  { icon: 'flower-outline',             label: 'عطور' },
  { icon: 'color-wand-outline',         label: 'مكياج' },
  { icon: 'cut-outline',                label: 'حلاقة' },
  { icon: 'hand-left-outline',          label: 'عناية يد' },
  { icon: 'happy-outline',              label: 'عناية بشرة' },
  // كتب وتعليم
  { icon: 'book-outline',               label: 'كتب' },
  { icon: 'library-outline',            label: 'مكتبة' },
  { icon: 'school-outline',             label: 'تعليم' },
  { icon: 'pencil-outline',             label: 'قرطاسية' },
  { icon: 'document-text-outline',      label: 'وثائق' },
  { icon: 'newspaper-outline',          label: 'مجلات' },
  { icon: 'calculator-outline',         label: 'حاسبة' },
  { icon: 'easel-outline',              label: 'فنون' },
  // رياضة ولياقة
  { icon: 'bicycle-outline',            label: 'رياضة' },
  { icon: 'football-outline',           label: 'كرة قدم' },
  { icon: 'basketball-outline',         label: 'كرة سلة' },
  { icon: 'tennisball-outline',         label: 'تنس' },
  { icon: 'barbell-outline',            label: 'صالة رياضة' },
  { icon: 'walk-outline',               label: 'مشي' },
  { icon: 'fitness-outline',            label: 'لياقة' },
  { icon: 'boat-outline',               label: 'رياضة مائية' },
  { icon: 'golf-outline',               label: 'جولف' },
  // غذاء ومشروبات
  { icon: 'nutrition-outline',          label: 'غذاء' },
  { icon: 'fast-food-outline',          label: 'وجبات سريعة' },
  { icon: 'pizza-outline',              label: 'بيتزا' },
  { icon: 'ice-cream-outline',          label: 'حلويات' },
  { icon: 'cafe-outline',               label: 'قهوة' },
  { icon: 'wine-outline',               label: 'مشروبات' },
  { icon: 'beer-outline',               label: 'عصائر' },
  { icon: 'fish-outline',               label: 'مأكولات بحرية' },
  // أدوات وصيانة
  { icon: 'construct-outline',          label: 'أدوات' },
  { icon: 'hammer-outline',             label: 'بناء' },
  { icon: 'hardware-chip-outline',      label: 'قطع غيار' },
  { icon: 'wrench-outline',             label: 'إصلاح' },
  { icon: 'cog-outline',                label: 'ميكانيكا' },
  { icon: 'flash-outline',              label: 'كهرباء' },
  { icon: 'color-fill-outline',         label: 'طلاء' },
  // تجميل وعناية
  { icon: 'sparkles-outline',           label: 'تجميل' },
  { icon: 'brush-outline',              label: 'مكياج' },
  { icon: 'medkit-outline',             label: 'صحة وجمال' },
  // سيارات ومواصلات
  { icon: 'car-outline',                label: 'سيارات' },
  { icon: 'car-sport-outline',          label: 'سيارات رياضية' },
  { icon: 'bus-outline',                label: 'باصات' },
  { icon: 'train-outline',              label: 'قطار' },
  { icon: 'airplane-outline',           label: 'طيران' },
  { icon: 'boat-outline',               label: 'قوارب' },
  { icon: 'bicycle-outline',            label: 'دراجات' },
  { icon: 'speedometer-outline',        label: 'إكسسوارات سيارات' },
  // ألعاب وترفيه
  { icon: 'game-controller-outline',    label: 'ألعاب' },
  { icon: 'dice-outline',               label: 'ألعاب طاولة' },
  { icon: 'musical-notes-outline',      label: 'موسيقى' },
  { icon: 'film-outline',               label: 'أفلام' },
  { icon: 'mic-outline',                label: 'ترفيه' },
  { icon: 'headset-outline',            label: 'بودكاست' },
  { icon: 'image-outline',              label: 'تصوير' },
  // حيوانات
  { icon: 'paw-outline',                label: 'حيوانات' },
  { icon: 'fish-outline',               label: 'أسماك' },
  { icon: 'bug-outline',                label: 'حشرات' },
  // مكتب وأعمال
  { icon: 'briefcase-outline',          label: 'مكتب' },
  { icon: 'business-outline',           label: 'أعمال' },
  { icon: 'stats-chart-outline',        label: 'إحصائيات' },
  { icon: 'trending-up-outline',        label: 'استثمار' },
  { icon: 'card-outline',               label: 'دفع إلكتروني' },
  { icon: 'cash-outline',               label: 'مالية' },
  { icon: 'receipt-outline',            label: 'فواتير' },
  { icon: 'archive-outline',            label: 'أرشيف' },
  { icon: 'mail-outline',               label: 'بريد' },
  { icon: 'call-outline',               label: 'اتصالات' },
  // صحة وطب
  { icon: 'medkit-outline',             label: 'صيدلية' },
  { icon: 'heart-circle-outline',       label: 'صحة' },
  { icon: 'bandage-outline',            label: 'إسعافات' },
  { icon: 'pulse-outline',              label: 'لياقة صحية' },
  { icon: 'eye-outline',                label: 'بصريات' },
  // سفر وسياحة
  { icon: 'globe-outline',              label: 'سفر' },
  { icon: 'map-outline',                label: 'خرائط' },
  { icon: 'compass-outline',            label: 'مغامرات' },
  { icon: 'camera-outline',             label: 'سياحة' },
  { icon: 'bed-outline',                label: 'فنادق' },
  { icon: 'location-outline',           label: 'وجهات' },
  // أطفال
  { icon: 'happy-outline',              label: 'أطفال' },
  { icon: 'balloon-outline',            label: 'ترفيه أطفال' },
  { icon: 'color-palette-outline',      label: 'رسم أطفال' },
  { icon: 'bicycle-outline',            label: 'دراجات أطفال' },
  // طاقة وبيئة
  { icon: 'sunny-outline',              label: 'طاقة شمسية' },
  { icon: 'leaf-outline',               label: 'بيئة' },
  { icon: 'earth-outline',              label: 'مستدام' },
  { icon: 'water-outline',              label: 'مياه' },
  // خدمات
  { icon: 'people-outline',             label: 'خدمات' },
  { icon: 'person-outline',             label: 'أفراد' },
  { icon: 'shield-outline',             label: 'أمن وحماية' },
  { icon: 'cloud-outline',              label: 'خدمات سحابية' },
  { icon: 'settings-outline',           label: 'تقنية' },
  { icon: 'build-outline',              label: 'تطوير' },
  { icon: 'chatbubble-outline',         label: 'تواصل' },
  { icon: 'share-social-outline',       label: 'سوشيال ميديا' },
  { icon: 'storefront-outline',         label: 'متاجر' },
  { icon: 'gift-outline',               label: 'هدايا' },
  { icon: 'balloon-outline',            label: 'مناسبات' },
  { icon: 'cart-outline',               label: 'تسوق' },
  { icon: 'bag-handle-outline',         label: 'مشتريات' },
  { icon: 'pricetag-outline',           label: 'عروض' },
  { icon: 'megaphone-outline',          label: 'إعلانات' },
];

type Category = {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

export default function CategoriesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', icon: 'grid-outline', sortOrder: '0' });
  const [iconSearch, setIconSearch] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/categories');
      return data as Category[];
    },
  });

  const createCat = useMutation({
    mutationFn: async (body: any) => { const { data } = await api.post('/api/categories', body); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }); closeModal(); },
    onError: (e: any) => Alert.alert('خطأ', e?.response?.data?.message || 'فشل الإضافة'),
  });

  const updateCat = useMutation({
    mutationFn: async ({ id, ...body }: any) => { const { data } = await api.patch(`/api/categories/${id}`, body); return data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (e: any) => Alert.alert('خطأ', e?.response?.data?.message || 'فشل التعديل'),
  });

  const deleteCat = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', icon: 'grid-outline', sortOrder: String(categories.length) });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditItem(cat);
    setForm({ name: cat.name, icon: cat.icon, sortOrder: String(cat.sortOrder) });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditItem(null); setIconSearch(''); };

  const handleSave = () => {
    if (!form.name.trim()) return Alert.alert('', 'اسم الفئة مطلوب');
    const body = { name: form.name.trim(), icon: form.icon, sortOrder: Number(form.sortOrder) };
    if (editItem) updateCat.mutate({ id: editItem.id, ...body });
    else createCat.mutate(body);
  };

  const confirmDelete = (cat: Category) => {
    Alert.alert('حذف الفئة', `هل تريد حذف "${cat.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteCat.mutate(cat.id) },
    ]);
  };

  const toggleActive = (cat: Category) => {
    updateCat.mutate({ id: cat.id, isActive: !cat.isActive });
  };

  if (isLoading) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />;

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.topRow}>
        <Text style={s.count}>{categories.length} فئة</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>إضافة فئة</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[s.card, !item.isActive && s.cardInactive]}>
            <View style={s.cardLeft}>
              <TouchableOpacity onPress={() => confirmDelete(item)} style={s.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(item)} style={s.editBtn}>
                <Ionicons name="pencil-outline" size={16} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            <View style={s.cardMid}>
              <Text style={[s.catName, !item.isActive && s.inactiveText]}>{item.name}</Text>
              <Text style={s.catOrder}>ترتيب: {item.sortOrder}</Text>
            </View>
            <View style={[s.iconBox, !item.isActive && s.iconBoxInactive]}>
              <Ionicons name={item.icon as any} size={22} color={item.isActive ? PRIMARY : '#9ca3af'} />
            </View>
            <TouchableOpacity onPress={() => toggleActive(item)} style={[s.toggleBtn, item.isActive && s.toggleOn]}>
              <Text style={[s.toggleText, item.isActive && s.toggleTextOn]}>
                {item.isActive ? 'نشط' : 'مخفي'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="grid-outline" size={40} color="#9ca3af" />
            <Text style={s.emptyText}>لا توجد فئات</Text>
          </View>
        }
      />

      {/* Modal إضافة/تعديل */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{editItem ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</Text>

            <Text style={s.label}>اسم الفئة</Text>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="مثال: إلكترونيات"
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />

            <Text style={s.label}>الترتيب</Text>
            <TextInput
              style={s.input}
              value={form.sortOrder}
              onChangeText={v => setForm(f => ({ ...f, sortOrder: v }))}
              keyboardType="numeric"
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />

            <Text style={s.label}>الأيقونة</Text>
            <TextInput
              style={[s.input, { marginBottom: 10 }]}
              value={iconSearch}
              onChangeText={setIconSearch}
              placeholder="ابحث عن أيقونة... مثال: غذاء"
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />
            <FlatList
              data={AVAILABLE_ICONS.filter(i => i.label.includes(iconSearch))}
              numColumns={4}
              keyExtractor={item => item.icon + item.label}
              style={{ maxHeight: 200, marginBottom: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.iconOption, form.icon === item.icon && s.iconOptionActive]}
                  onPress={() => setForm(f => ({ ...f, icon: item.icon }))}>
                  <Ionicons name={item.icon as any} size={20} color={form.icon === item.icon ? '#fff' : '#374151'} />
                  <Text style={[s.iconLabel, form.icon === item.icon && { color: '#fff' }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={[s.saveBtn, (createCat.isPending || updateCat.isPending) && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={createCat.isPending || updateCat.isPending}>
              {(createCat.isPending || updateCat.isPending)
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveBtnText}>{editItem ? 'حفظ التعديل' : 'إضافة'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
              <Text style={s.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f6f9' },

  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  count:  { fontSize: 13, color: '#64748b', fontWeight: '600' },
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e8edf2' },
  cardInactive: { opacity: 0.6 },
  cardMid:      { flex: 1, alignItems: 'flex-end' },
  catName:      { fontSize: 15, fontWeight: '700', color: '#0d1b2a' },
  inactiveText: { color: '#9ca3af' },
  catOrder:     { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  iconBox:        { width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  iconBoxInactive:{ backgroundColor: '#f3f4f6' },
  cardLeft:  { flexDirection: 'row', gap: 6 },
  editBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY + '10', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  toggleBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  toggleOn:      { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  toggleText:    { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  toggleTextOn:  { color: '#16a34a' },

  empty:     { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#9ca3af' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 18, fontWeight: '900', color: '#0d1b2a', textAlign: 'right', marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#e8edf2', borderRadius: 12, padding: 12, fontSize: 15, color: '#0d1b2a', backgroundColor: '#f8fafc' },

  iconOption:       { flex: 1, margin: 4, padding: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#e8edf2', alignItems: 'center', gap: 3, backgroundColor: '#f8fafc' },
  iconOptionActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  iconLabel:        { fontSize: 9, color: '#374151', textAlign: 'center' },

  saveBtn:     { backgroundColor: PRIMARY, borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn:   { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelText:  { color: '#9ca3af', fontSize: 14 },
});
