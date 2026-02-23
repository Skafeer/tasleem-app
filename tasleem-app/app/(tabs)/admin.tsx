import { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, FlatList, Alert, KeyboardAvoidingView, Platform, Image, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

type Tab = 'products' | 'orders' | 'withdrawals' | 'merchants' | 'stats' | 'promos';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('products');

  const tabs = [
    { key: 'products' as Tab, label: 'المنتجات', icon: 'cube-outline' },
    { key: 'orders' as Tab, label: 'الطلبات', icon: 'receipt-outline' },
    { key: 'withdrawals' as Tab, label: 'السحوبات', icon: 'wallet-outline' },
    { key: 'merchants' as Tab, label: 'التجار', icon: 'people-outline' },
    { key: 'stats' as Tab, label: 'الإحصائيات', icon: 'stats-chart-outline' },
    { key: 'promos' as Tab, label: 'أكواد الخصم', icon: 'pricetag-outline' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>لوحة الإدارة</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && s.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={20} color={activeTab === tab.key ? '#fff' : PRIMARY} />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'withdrawals' && <WithdrawalsTab />}
      {activeTab === 'merchants' && <MerchantsTab />}
      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'promos' && <PromosTab />}
    </SafeAreaView>
  );
}

// ==================== PRODUCTS TAB ====================
function ProductsTab() {
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', category: '', companyWholesalePrice: '', wholesalePrice: '', 
    suggestedPrice: '', sellingPriceMin: '', stock: '', discount: '', adLinks: '', images: [] as string[]
  });
  const [uploadingImgs, setUploadingImgs] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data; },
  });

  const pickAndUploadImage = async () => {
    if (form.images.length >= 10) { toast.warning('الحد الأقصى 10 صور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsMultipleSelection: true, 
      quality: 0.8 
    });
    if (result.canceled) return;
    setUploadingImgs(true);
    try {
      const urls: string[] = [];
      for (const asset of result.assets) {
        const { data } = await api.post('/api/upload', { image: asset.uri });
        urls.push(data.url);
      }
      setForm(p => ({ ...p, images: [...p.images, ...urls].slice(0, 10) }));
      toast.success('تم رفع الصور');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل رفع الصور');
    } finally { setUploadingImgs(false); }
  };

  const saveProduct = useMutation({
    mutationFn: async (data: any) => {
      if (editingProduct) {
        const res = await api.put(`/api/products/${editingProduct.id}`, data);
        return res.data;
      } else {
        const res = await api.post('/api/products', data);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'تم التحديث' : 'تمت الإضافة');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setShowModal(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحفظ'),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/products/${id}`); },
    onSuccess: () => { 
      toast.success('تم الحذف'); 
      qc.invalidateQueries({ queryKey: ['admin-products'] }); 
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.warning('يرجى إدخال اسم المنتج'); return; }
    if (!form.companyWholesalePrice || Number(form.companyWholesalePrice) <= 0) { 
      toast.warning('سعر الجملة للشركة مطلوب'); 
      return; 
    }
    if (!form.wholesalePrice || Number(form.wholesalePrice) <= 0) { 
      toast.warning('سعر الجملة للتاجر مطلوب'); 
      return; 
    }
    if (!form.suggestedPrice || Number(form.suggestedPrice) <= 0) { 
      toast.warning('سعر البيع المقترح مطلوب'); 
      return; 
    }
    if (!form.stock || Number(form.stock) < 0) { 
      toast.warning('المخزون مطلوب'); 
      return; 
    }

    const minPrice = form.sellingPriceMin.trim() 
      ? Number(form.sellingPriceMin) 
      : Number(form.wholesalePrice);

    saveProduct.mutate({
      name: form.name, 
      description: form.description, 
      category: form.category || 'عام',
      companyWholesalePrice: Number(form.companyWholesalePrice),
      wholesalePrice: Number(form.wholesalePrice), 
      suggestedPrice: Number(form.suggestedPrice),
      sellingPriceMin: minPrice,
      stock: Number(form.stock), 
      discount: Number(form.discount) || 0,
      adLinks: form.adLinks, 
      images: form.images.join(','),
    });
  };

  const resetForm = () => {
    setForm({ 
      name: '', description: '', category: '', companyWholesalePrice: '', wholesalePrice: '',
      suggestedPrice: '', sellingPriceMin: '', stock: '', discount: '', 
      adLinks: '', images: [] 
    });
    setEditingProduct(null);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name, 
      description: p.description || '', 
      category: p.category,
      companyWholesalePrice: String(p.companyWholesalePrice || p.wholesalePrice),
      wholesalePrice: String(p.wholesalePrice), 
      suggestedPrice: String(p.suggestedPrice || p.wholesalePrice),
      sellingPriceMin: String(p.sellingPriceMin), 
      stock: String(p.stock),
      discount: String(p.discount || 0), 
      adLinks: p.adLinks || '',
      images: p.images ? p.images.split(',').filter(Boolean) : []
    });
    setShowModal(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <TouchableOpacity style={s.addBtn} onPress={() => { resetForm(); setShowModal(true); }}>
            <Ionicons name="add-circle" size={22} color="#fff" />
            <Text style={s.addBtnText}>إضافة منتج جديد</Text>
          </TouchableOpacity>
        }
        renderItem={({ item: p }) => (
          <View style={s.card}>
            <Text style={s.cardTitle}>{p.name}</Text>
            <Text style={s.cardMeta}>سعر الشركة: {(p.companyWholesalePrice || 0).toLocaleString()} د.ع</Text>
            <Text style={s.cardMeta}>سعر التاجر: {p.wholesalePrice.toLocaleString()} د.ع</Text>
            <Text style={s.cardMeta}>سعر مقترح: {(p.suggestedPrice || p.wholesalePrice).toLocaleString()} د.ع</Text>
            <Text style={s.cardMeta}>الحد الأدنى: {p.sellingPriceMin.toLocaleString()} د.ع</Text>
            <Text style={s.cardMeta}>المخزون: {p.stock}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(p)}>
                <Ionicons name="create-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={() => {
                Alert.alert('تأكيد', 'حذف المنتج؟', [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'حذف', onPress: () => deleteProduct.mutate(p.id), style: 'destructive' }
                ]);
              }}>
                <Ionicons name="trash-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>{editingProduct ? 'تعديل منتج' : 'إضافة منتج'}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }}>
              <Text style={s.inputLabel}>اسم المنتج *</Text>
              <TextInput style={s.modalInput} placeholder="اسم المنتج" value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))} 
                textAlign="right" placeholderTextColor="#9ca3af" />

              <Text style={s.inputLabel}>الوصف</Text>
              <TextInput style={[s.modalInput, { height: 80, textAlignVertical: 'top' }]} 
                placeholder="وصف المنتج"
                value={form.description} 
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                multiline textAlign="right" placeholderTextColor="#9ca3af" />

              <Text style={s.inputLabel}>التصنيف</Text>
              <TextInput style={s.modalInput} placeholder="التصنيف" value={form.category}
                onChangeText={v => setForm(p => ({ ...p, category: v }))} 
                textAlign="right" placeholderTextColor="#9ca3af" />

              <Text style={s.inputLabel}>سعر الجملة للشركة (مخفي عن التاجر) *</Text>
              <TextInput style={s.modalInput} placeholder="0" value={form.companyWholesalePrice}
                onChangeText={v => setForm(p => ({ ...p, companyWholesalePrice: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => scrollRef.current?.scrollToEnd()} />

              <Text style={s.inputLabel}>سعر الجملة للتاجر *</Text>
              <TextInput style={s.modalInput} placeholder="0" value={form.wholesalePrice}
                onChangeText={v => setForm(p => ({ ...p, wholesalePrice: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => scrollRef.current?.scrollToEnd()} />

              <Text style={s.inputLabel}>سعر البيع المقترح *</Text>
              <TextInput style={s.modalInput} placeholder="0" value={form.suggestedPrice}
                onChangeText={v => setForm(p => ({ ...p, suggestedPrice: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => scrollRef.current?.scrollToEnd()} />

              <Text style={s.inputLabel}>الحد الأدنى للبيع (اختياري - إذا ترك فارغاً يُعتمد سعر التاجر)</Text>
              <TextInput style={s.modalInput} placeholder="اتركه فارغاً لاعتماد سعر التاجر" 
                value={form.sellingPriceMin}
                onChangeText={v => setForm(p => ({ ...p, sellingPriceMin: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => scrollRef.current?.scrollToEnd()} />

              <Text style={s.inputLabel}>المخزون *</Text>
              <TextInput style={s.modalInput} placeholder="0" value={form.stock}
                onChangeText={v => setForm(p => ({ ...p, stock: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => scrollRef.current?.scrollToEnd()} />

              <Text style={s.inputLabel}>نسبة الخصم (%)</Text>
              <TextInput style={s.modalInput} placeholder="0" value={form.discount}
                onChangeText={v => setForm(p => ({ ...p, discount: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => scrollRef.current?.scrollToEnd()} />

              <Text style={s.inputLabel}>روابط إعلانية (افصل بفواصل)</Text>
              <TextInput style={[s.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="https://example.com/ad1,https://example.com/ad2"
                value={form.adLinks} 
                onChangeText={v => setForm(p => ({ ...p, adLinks: v }))}
                multiline textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => scrollRef.current?.scrollToEnd()} />

              <Text style={s.inputLabel}>صور المنتج ({form.images.length}/10) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {form.images.map((uri, idx) => (
                  <View key={idx} style={s.imgPreview}>
                    <Image source={{ uri }} style={s.imgPreviewImg} />
                    <TouchableOpacity style={s.imgRemove} 
                      onPress={() => setForm(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={s.imgAddBtn} onPress={pickAndUploadImage} disabled={uploadingImgs}>
                  {uploadingImgs ? <ActivityIndicator color={PRIMARY} /> :
                    <Ionicons name="add-circle-outline" size={40} color={PRIMARY} />}
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saveProduct.isPending}>
                <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.saveGrad}>
                  {saveProduct.isPending ? <ActivityIndicator color="#fff" /> :
                    <Text style={s.saveBtnText}>حفظ المنتج</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ==================== ORDERS TAB ====================
function OrdersTab() {
  return <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>قيد التطوير...</Text>;
}

// ==================== WITHDRAWALS TAB ====================
function WithdrawalsTab() {
  return <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>قيد التطوير...</Text>;
}

// ==================== MERCHANTS TAB ====================
function MerchantsTab() {
  return <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>قيد التطوير...</Text>;
}

// ==================== STATS TAB ====================
function StatsTab() {
  return <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>قيد التطوير...</Text>;
}

// ==================== PROMOS TAB ====================
function PromosTab() {
  return <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>قيد التطوير...</Text>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#fff', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 10 },
  tab: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: '600', color: PRIMARY },
  tabTextActive: { color: '#fff' },
  addBtn: { backgroundColor: PRIMARY, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 14, marginBottom: 16 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 8 },
  cardMeta: { fontSize: 13, color: '#6b7280', textAlign: 'right', marginBottom: 4 },
  editBtn: { flex: 1, backgroundColor: SECONDARY, borderRadius: 10, paddingVertical: 10, 
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 10, 
    alignItems: 'center', justifyContent: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  inputLabel: { fontSize: 13, color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12, fontWeight: '600' },
  modalInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#fff', marginBottom: 10 },
  imgPreview: { width: 100, height: 100, borderRadius: 12, marginRight: 8, position: 'relative' },
  imgPreviewImg: { width: '100%', height: '100%', borderRadius: 12 },
  imgRemove: { position: 'absolute', top: -8, right: -8 },
  imgAddBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  saveGrad: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
