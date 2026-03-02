import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Image, RefreshControl, Alert,
  useWindowDimensions, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const DANGER = '#ef4444';
const SUCCESS = '#10b981';

const STATUS: any = {
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', icon: 'refresh-outline' },
  delivered:  { label: 'تم التسليم',   color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  returned:   { label: 'مرتجع',        color: '#ef4444', bg: '#fef2f2', icon: 'arrow-undo-outline' },
};

const W_STATUS: any = {
  pending:  { label: 'معلق',    color: '#f59e0b', bg: '#fffbeb' },
  approved: { label: 'موافق',   color: '#10b981', bg: '#ecfdf5' },
  rejected: { label: 'مرفوض',  color: '#ef4444', bg: '#fef2f2' },
};

const CATEGORIES = ['إلكترونيات','ملابس','مستحضرات','أجهزة منزلية','رياضة','ألعاب','أخرى'];

// ==================== PRODUCTS TAB ====================
function ProductsTab() {
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', category: '',
    companyWholesalePrice: '', wholesalePrice: '', suggestedPrice: '', sellingPriceMin: '',
    stock: '', discount: '', adLinks: '', images: [] as string[]
  });
  const [uploadingImgs, setUploadingImgs] = useState(false);

  const { data: availableCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { 
      try {
        const { data } = await api.get('/api/categories'); 
        return data.map((c: any) => c.name);
      } catch {
        return ['إلكترونيات', 'أزياء', 'منزل', 'رياضة', 'كتب'];
      }
    },
  });

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
      toast.warning('سعر الشركة مطلوب');
      return;
    }
    if (!form.wholesalePrice || Number(form.wholesalePrice) <= 0) {
      toast.warning('سعر التاجر مطلوب');
      return;
    }
    if (!form.suggestedPrice || Number(form.suggestedPrice) <= 0) {
      toast.warning('السعر المقترح مطلوب');
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
      category: form.categories.join(',') || 'عام',
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
      name: '', description: '', category: '',
      companyWholesalePrice: '', wholesalePrice: '', suggestedPrice: '', sellingPriceMin: '',
      stock: '', discount: '', adLinks: '', images: []
    });
    setEditingProduct(null);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || '',
      categories: p.category ? p.category.split(',').filter(Boolean) : [],
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
            <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.addBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={s.addBtnText}>إضافة منتج جديد</Text>
            </LinearGradient>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Ionicons name="cube-outline" size={52} color="#d1d5db"/>
            <Text style={s.emptyTitle}>لا توجد منتجات</Text>
            <Text style={s.emptyText}>ابدأ بإضافة أول منتج</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <View style={s.productCard}>
            <Text style={s.productName}>{p.name}</Text>
            <Text style={s.productMeta}>سعر الشركة (مخفي): {(p.companyWholesalePrice || 0).toLocaleString()} د.ع</Text>
            <Text style={s.productMeta}>سعر التاجر: {p.wholesalePrice.toLocaleString()} د.ع</Text>
            <Text style={s.productMeta}>سعر مقترح: {(p.suggestedPrice || p.wholesalePrice).toLocaleString()} د.ع</Text>
            <Text style={s.productMeta}>الحد الأدنى: {p.sellingPriceMin.toLocaleString()} د.ع</Text>
            <Text style={s.productMeta}>المخزون: {p.stock}</Text>
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
        );
        }}}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="fullScreen">
        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: '#f9fafb' }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>{editingProduct ? 'تعديل منتج' : 'إضافة منتج'}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView 
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.inputLabel}>اسم المنتج *</Text>
              <TextInput style={s.input} placeholder="اسم المنتج" value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))} 
                textAlign="right" placeholderTextColor="#9ca3af" />

              <Text style={s.inputLabel}>الوصف</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} 
                placeholder="وصف المنتج"
                value={form.description} 
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                multiline textAlign="right" placeholderTextColor="#9ca3af" />

              <Text style={s.inputLabel}>التصنيفات (اختر واحد أو أكثر)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {availableCategories.map((cat: string) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.categoryChip,
                    form.categories.includes(cat) && s.categoryChipActive
                  ]}
                  onPress={() => {
                    setForm(p => ({
                      ...p,
                      categories: p.categories.includes(cat)
                        ? p.categories.filter(c => c !== cat)
                        : [...p.categories, cat]
                    }));
                  }}
                >
                  <Text style={[
                    s.categoryChipText,
                    form.categories.includes(cat) && s.categoryChipTextActive
                  ]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

              <Text style={s.inputLabel}>سعر الشركة (مخفي عن التاجر) *</Text>
              <TextInput style={s.input} placeholder="0" value={form.companyWholesalePrice}
                onChangeText={v => setForm(p => ({ ...p, companyWholesalePrice: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              <Text style={s.inputLabel}>سعر الجملة للتاجر *</Text>
              <TextInput style={s.input} placeholder="0" value={form.wholesalePrice}
                onChangeText={v => setForm(p => ({ ...p, wholesalePrice: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              <Text style={s.inputLabel}>سعر البيع المقترح *</Text>
              <TextInput style={s.input} placeholder="0" value={form.suggestedPrice}
                onChangeText={v => setForm(p => ({ ...p, suggestedPrice: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              <Text style={s.inputLabel}>الحد الأدنى (اختياري - يُعتمد سعر التاجر إذا فارغ)</Text>
              <TextInput style={s.input} placeholder="اتركه فارغاً" 
                value={form.sellingPriceMin}
                onChangeText={v => setForm(p => ({ ...p, sellingPriceMin: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              <Text style={s.inputLabel}>المخزون *</Text>
              <TextInput style={s.input} placeholder="0" value={form.stock}
                onChangeText={v => setForm(p => ({ ...p, stock: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              <Text style={s.inputLabel}>نسبة الخصم (%)</Text>
              <TextInput style={s.input} placeholder="0" value={form.discount}
                onChangeText={v => setForm(p => ({ ...p, discount: v }))}
                keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              <Text style={s.inputLabel}>روابط إعلانية (افصل بفاصلة ",")</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="https://link1.com,https://link2.com"
                value={form.adLinks} 
                onChangeText={v => setForm(p => ({ ...p, adLinks: v }))}
                multiline textAlign="right" placeholderTextColor="#9ca3af"
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)} />

              <Text style={s.inputLabel}>صور ({form.images.length}/10)</Text>
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
                    <Text style={s.saveBtnText}>حفظ</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function AdminScreen() {
  const qc = useQueryClient();
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<'orders'|'products'|'users'|'withdrawals'|'promos'>('orders');
  const [orderFilter, setOrderFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<any>(null);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', discountPercent: '' });
  const [form, setForm] = useState({
    name:'', description:'', wholesalePrice:'', sellingPriceMin:'',
    category:'إلكترونيات', images:[] as string[], adLinks:'', stock:'10',
    isRenewable: false, discount: '0',
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => { const { data } = await api.get('/api/orders'); return data; },
    refetchInterval: 30000,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data; },
  });
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data; },
  });
  const { data: withdrawals = [] } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => { const { data } = await api.get('/api/withdrawals'); return data; },
  });
  const { data: promos = [] } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => { const { data } = await api.get('/api/promo-codes'); return data; },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  const resetForm = () => setForm({
    name:'', description:'', wholesalePrice:'', sellingPriceMin:'',
    category:'إلكترونيات', images:[], adLinks:'', stock:'10',
    isRenewable: false, discount: '0',
  });

  const pickAndUploadImage = async () => {
    if (form.images.length >= 10) { toast.warning('الحد الأقصى 10 صور'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('يرجى السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - form.images.length,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    setUploadingImgs(true);
    try {
      const uploadedUrls: string[] = [];
      for (const asset of result.assets) {
        const base64 = `data:image/jpeg;base64,${asset.base64}`;
        const { data } = await api.post('/api/upload', { image: base64 });
        uploadedUrls.push(data.url);
      }
      setForm(p => ({ ...p, images: [...p.images, ...uploadedUrls].slice(0, 10) }));
      toast.success(`تم رفع ${uploadedUrls.length} صورة ✅`);
    } catch { toast.error('فشل رفع الصور'); }
    setUploadingImgs(false);
  };

  const removeImage = (idx: number) => {
    setForm(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('تم تحديث الحالة ✅'); },
  });

  const updateWithdrawal = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/withdrawals/${id}`, { status });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }); toast.success('تم تحديث حالة السحب ✅'); },
  });

  const saveProduct = useMutation({
    mutationFn: async (d: any) => {
      if (showEditProduct) {
        const r = await api.put(`/api/products/${showEditProduct.id}`, d); return r.data;
      }
      const r = await api.post('/api/products', d); return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(showEditProduct ? 'تم التعديل ✅' : 'تم إضافة المنتج ✅');
      setShowAddProduct(false); setShowEditProduct(null); resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل'),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/products/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.info('تم حذف المنتج'); },
  });

  const addPromo = useMutation({
    mutationFn: async (d: any) => { const r = await api.post('/api/promo-codes', d); return r.data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('تم إضافة الكود ✅');
      setShowAddPromo(false); setPromoForm({ code: '', discountPercent: '' });
    },
  });

  const deletePromo = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/promo-codes/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promo-codes'] }); toast.info('تم حذف الكود'); },
  });

  const openEdit = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : (p.imageUrl ? [p.imageUrl] : []);
    setForm({
      name:p.name, description:p.description,
      wholesalePrice:String(p.wholesalePrice), sellingPriceMin:String(p.sellingPriceMin),
      category:p.category, images: imgs, adLinks:p.adLinks||'',
      stock:String(p.stock), isRenewable:p.isRenewable||false, discount:String(p.discount||0),
    });
    setShowEditProduct(p);
  };

  const handleSaveProduct = () => {
    if (!form.name || !form.wholesalePrice || !form.sellingPriceMin) {
      toast.warning('يرجى ملء الحقول المطلوبة'); return;
    }
    if (form.images.length === 0) { toast.warning('يرجى إضافة صورة واحدة على الأقل'); return; }
    saveProduct.mutate({
      name:form.name, description:form.description,
      wholesalePrice:Number(form.wholesalePrice),
      sellingPriceMin:Number(form.sellingPriceMin),
      category:form.category,
      imageUrl:form.images[0],
      images:form.images.join(','),
      adLinks:form.adLinks,
      stock:Number(form.stock),
      isRenewable:form.isRenewable,
      discount:Number(form.discount),
    });
  };

  const filteredOrders = orders
    .filter((o:any) => orderFilter==='all' || o.status===orderFilter)
    .filter((o:any) => !search || o.customerName?.includes(search) || String(o.id).includes(search));
  const filteredProducts = products.filter((p:any) => !search || p.name?.includes(search));
  const merchantCount = users.filter((u:any)=>u.role==='merchant').length;
  const totalRevenue = orders.filter((o:any)=>o.status==='delivered').reduce((s:number,o:any)=>s+o.totalAmount,0);
  const pendingWithdrawals = withdrawals.filter((w:any)=>w.status==='pending').length;
  const totalProfit = orders.filter((o:any)=>o.status==='delivered').reduce((s:number,o:any)=>s+(o.totalProfit||0),0);

  const TABS = [
    {key:'orders',      label:'الطلبات',    icon:'bag-outline',          count:orders.length},
    {key:'products',    label:'المنتجات',   icon:'cube-outline',         count:products.length},
    {key:'withdrawals', label:'السحوبات',   icon:'cash-outline',         count:pendingWithdrawals},
    {key:'users',       label:'التجار',     icon:'people-outline',       count:merchantCount},
    {key:'promos',      label:'الأكواد',    icon:'pricetag-outline',     count:promos.length},
  ];

  return (
    <SafeAreaView style={s.container}>
      {/* HEADER */}
      <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.header} start={{x:0,y:0}} end={{x:1,y:1}}>
        <View style={[s.headerIconBox, {backgroundColor:'rgba(255,255,255,0.15)'}]}>
          <Ionicons name="shield-checkmark" size={20} color="#fff"/>
        </View>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>لوحة الإدارة</Text>
          <Text style={s.headerSub}>مرحباً مدير النظام 👋</Text>
        </View>
        <TouchableOpacity style={[s.headerIconBox, {backgroundColor:'rgba(255,255,255,0.15)'}]} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color="#fff"/>
        </TouchableOpacity>
      </LinearGradient>

      {/* STATS ROW */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.statsScroll} contentContainerStyle={s.statsContent}>
        {[
          {label:'الإيرادات',     value:`${(totalRevenue/1000).toFixed(1)}k`, icon:'cash-outline',        color:'#10b981', bg:'#ecfdf5'},
          {label:'الأرباح',       value:`${(totalProfit/1000).toFixed(1)}k`,  icon:'trending-up-outline',  color:PRIMARY,   bg:PRIMARY+'15'},
          {label:'الطلبات',       value:orders.length,                         icon:'bag-outline',           color:'#3b82f6', bg:'#eff6ff'},
          {label:'التجار',        value:merchantCount,                          icon:'storefront-outline',    color:'#8b5cf6', bg:'#f5f3ff'},
          {label:'المنتجات',      value:products.length,                        icon:'cube-outline',           color:SECONDARY, bg:'#fffbeb'},
          {label:'سحوبات معلقة', value:pendingWithdrawals,                    icon:'time-outline',           color:DANGER,    bg:'#fef2f2'},
        ].map((stat,i)=>(
          <View key={i} style={s.statCard}>
            <View style={[s.statIconBox, {backgroundColor:stat.bg}]}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color}/>
            </View>
            <Text style={[s.statValue, {color:stat.color}]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {TABS.map(t=>(
          <TouchableOpacity key={t.key}
            style={[s.tabBtn, tab===t.key && s.tabActive]}
            onPress={()=>{setTab(t.key as any); setSearch('');}}>
            <Ionicons name={t.icon as any} size={15} color={tab===t.key ? PRIMARY : '#9ca3af'}/>
            <Text style={[s.tabText, tab===t.key && s.tabTextActive]}>{t.label}</Text>
            {t.count > 0 && (
              <View style={[s.badge, tab===t.key && s.badgeActive]}>
                <Text style={[s.badgeText, tab===t.key && s.badgeTextActive]}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* SEARCH */}
      {(tab==='orders'||tab==='products') && (
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={17} color="#9ca3af"/>
          <TextInput style={s.searchInput} placeholder="بحث..."
            value={search} onChangeText={setSearch}
            placeholderTextColor="#9ca3af" textAlign="right"/>
          {search && (
            <TouchableOpacity onPress={()=>setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af"/>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ORDER FILTERS */}
      {tab==='orders' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
          {[['all','الكل'],['pending','انتظار'],['processing','معالجة'],
            ['delivered','مُسلَّم'],['returned','مرتجع']].map(([key,label])=>(
            <TouchableOpacity key={key}
              style={[s.filterBtn, orderFilter===key && s.filterBtnActive]}
              onPress={()=>setOrderFilter(key)}>
              <Text style={[s.filterText, orderFilter===key && s.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* MAIN CONTENT */}
      <ScrollView style={{flex:1}}
        contentContainerStyle={{padding:14, paddingBottom:50}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY}/>}
        showsVerticalScrollIndicator={false}>

        {/* ORDERS */}
        {tab==='orders' && filteredOrders.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="bag-outline" size={52} color="#d1d5db"/>
            <Text style={s.emptyTitle}>لا توجد طلبات</Text>
            <Text style={s.emptyText}>لم يتم العثور على طلبات مطابقة</Text>
          </View>
        )}
        {tab==='orders' && filteredOrders.map((order:any)=>(
          <View key={order.id} style={s.orderCard}>
            <View style={s.orderHead}>
              <View style={[s.statusPill, {backgroundColor:STATUS[order.status]?.bg}]}>
                <Ionicons name={STATUS[order.status]?.icon} size={12} color={STATUS[order.status]?.color}/>
                <Text style={[s.statusPillText, {color:STATUS[order.status]?.color}]}>{STATUS[order.status]?.label}</Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={s.orderId}>طلب #{order.id}</Text>
                <Text style={s.orderDate}>{new Date(order.createdAt).toLocaleDateString('ar-IQ')}</Text>
              </View>
            </View>

            <View style={s.orderBody}>
              {[
                {l:'👤 الاسم',      v: order.customerName},
                {l:'📞 الهاتف',     v: order.customerPhone},
                {l:'📍 العنوان',    v: `${order.province} — ${order.address}`},
              ].map((r,i)=>(
                <View key={i} style={s.orderRow}>
                  <Text style={s.orderVal}>{r.v}</Text>
                  <Text style={s.orderLbl}>{r.l}</Text>
                </View>
              ))}
              <View style={s.orderDivider}/>
              <View style={s.orderRow}>
                <Text style={[s.orderVal, {color:SUCCESS, fontWeight:'bold'}]}>{order.totalProfit?.toLocaleString()} د.ع</Text>
                <Text style={s.orderLbl}>💰 الربح</Text>
              </View>
              <View style={s.orderRow}>
                <Text style={[s.orderVal, {color:PRIMARY, fontWeight:'bold', fontSize:15}]}>{order.totalAmount?.toLocaleString()} د.ع</Text>
                <Text style={s.orderLbl}>🧾 الإجمالي</Text>
              </View>
            </View>

            <Text style={s.statusChangeLabel}>تغيير الحالة:</Text>
            <View style={s.statusBtns}>
              {Object.entries(STATUS).map(([key,val]:any)=>(
                <TouchableOpacity key={key}
                  style={[s.statusBtn, order.status===key && {backgroundColor:val.color, borderColor:val.color}]}
                  onPress={()=>updateStatus.mutate({id:order.id, status:key})}
                  disabled={updateStatus.isPending}>
                  <Ionicons name={val.icon} size={12} color={order.status===key?'#fff':'#6b7280'}/>
                  <Text style={[s.statusBtnText, order.status===key && {color:'#fff'}]}>{val.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* PRODUCTS - استخدام ProductsTab الجديد */}
        {tab==='products' && <ProductsTab />}

        {/* WITHDRAWALS */}
        {tab==='withdrawals' && <>
          <View style={s.sectionHeader}>
            <Ionicons name="cash-outline" size={18} color={PRIMARY}/>
            <Text style={s.sectionTitle}>طلبات السحب</Text>
            <View style={s.sectionCount}>
              <Text style={s.sectionCountText}>{withdrawals.length}</Text>
            </View>
          </View>

          {withdrawals.length === 0 && (
            <View style={s.emptyBox}>
              <Ionicons name="cash-outline" size={52} color="#d1d5db"/>
              <Text style={s.emptyTitle}>لا توجد طلبات سحب</Text>
              <Text style={s.emptyText}>ستظهر هنا عند وجود طلبات</Text>
            </View>
          )}

          {withdrawals.map((w:any)=>(
            <View key={w.id} style={s.withdrawCard}>
              <View style={s.withdrawHead}>
                <View style={[s.wStatusPill, {backgroundColor:W_STATUS[w.status]?.bg}]}>
                  <Text style={[s.wStatusText, {color:W_STATUS[w.status]?.color}]}>{W_STATUS[w.status]?.label}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={s.withdrawAmount}>{w.amount?.toLocaleString()} د.ع</Text>
                  <Text style={s.withdrawDate}>{new Date(w.createdAt).toLocaleDateString('ar-IQ')}</Text>
                </View>
              </View>
              <View style={s.withdrawInfo}>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                  <Text style={s.withdrawMethod}>{w.method}</Text>
                  <Text style={s.withdrawMethodLabel}>طريقة السحب</Text>
                </View>
                {w.accountDetails && (
                  <Text style={s.withdrawAccount}>{w.accountDetails}</Text>
                )}
              </View>
              {w.status==='pending' && (
                <View style={s.withdrawBtns}>
                  <TouchableOpacity style={[s.wBtn, {backgroundColor:'#fef2f2'}]}
                    onPress={()=>updateWithdrawal.mutate({id:w.id, status:'rejected'})}>
                    <Ionicons name="close-circle-outline" size={17} color={DANGER}/>
                    <Text style={[s.wBtnText, {color:DANGER}]}>رفض</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.wBtn, {backgroundColor:'#ecfdf5'}]}
                    onPress={()=>updateWithdrawal.mutate({id:w.id, status:'approved'})}>
                    <Ionicons name="checkmark-circle-outline" size={17} color={SUCCESS}/>
                    <Text style={[s.wBtnText, {color:SUCCESS}]}>موافقة</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </>}

        {/* USERS */}
        {tab==='users' && <>
          <View style={s.sectionHeader}>
            <Ionicons name="people-outline" size={18} color={PRIMARY}/>
            <Text style={s.sectionTitle}>التجار المسجلون</Text>
            <View style={s.sectionCount}>
              <Text style={s.sectionCountText}>{merchantCount}</Text>
            </View>
          </View>
          {users.filter((u:any)=>u.role!=='admin').map((u:any)=>(
            <View key={u.id} style={s.userCard}>
              <View style={{alignItems:'flex-end'}}>
                <Text style={[s.userBalance, {color:SUCCESS}]}>{u.balance?.toLocaleString()} د.ع</Text>
                <Text style={s.userBalanceLabel}>متاح</Text>
                <Text style={[s.userBalance, {color:SECONDARY, fontSize:12, marginTop:4}]}>{u.pendingBalance?.toLocaleString()} د.ع</Text>
                <Text style={s.userBalanceLabel}>معلق</Text>
              </View>
              <View style={s.userInfo}>
                <Text style={s.userName}>{u.storeName}</Text>
                <Text style={s.userPhone}>{u.phone}</Text>
                <Text style={s.userId}># {u.merchantId}</Text>
              </View>
              <View style={s.userAvatar}>
                <Text style={s.userAvatarText}>{u.storeName?.charAt(0) || '؟'}</Text>
              </View>
            </View>
          ))}
        </>}

        {/* PROMOS */}
        {tab==='promos' && <>
          <TouchableOpacity style={s.addBtn} onPress={()=>setShowAddPromo(true)}>
            <LinearGradient colors={[SECONDARY,'#e09000']} style={s.addBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="add-circle-outline" size={20} color="#fff"/>
              <Text style={s.addBtnText}>إضافة كود خصم جديد</Text>
            </LinearGradient>
          </TouchableOpacity>

          {promos.length === 0 && (
            <View style={s.emptyBox}>
              <Ionicons name="pricetag-outline" size={52} color="#d1d5db"/>
              <Text style={s.emptyTitle}>لا توجد أكواد خصم</Text>
              <Text style={s.emptyText}>أضف كوداً للبدء</Text>
            </View>
          )}

          {promos.map((p:any)=>(
            <View key={p.id} style={s.promoCard}>
              <TouchableOpacity style={s.promoDelBtn} onPress={()=>deletePromo.mutate(p.id)}>
                <Ionicons name="trash-outline" size={16} color={DANGER}/>
              </TouchableOpacity>
              <View style={{flex:1}}>
                <Text style={s.promoCode}>{p.code}</Text>
                <Text style={s.promoDiscount}>خصم {p.discountPercent}%</Text>
                <View style={[s.promoStatusPill, {backgroundColor: p.isActive?'#ecfdf5':'#fef2f2'}]}>
                  <Text style={{fontSize:11, color:p.isActive?SUCCESS:DANGER, fontWeight:'bold'}}>
                    {p.isActive ? '✅ فعال' : '❌ غير فعال'}
                  </Text>
                </View>
              </View>
              <View style={[s.promoIconBox, {backgroundColor: p.isActive?'#ecfdf5':'#f3f4f6'}]}>
                <Ionicons name="pricetag-outline" size={28} color={p.isActive?SUCCESS:'#9ca3af'}/>
              </View>
            </View>
          ))}
        </>}

      </ScrollView>

      {/* ADD PROMO MODAL */}
      <Modal visible={showAddPromo} transparent animationType="slide" onRequestClose={()=>setShowAddPromo(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, {maxHeight: height * 0.55}]}>

            <LinearGradient colors={[SECONDARY,'#e09000']} style={s.modalHeaderGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              <TouchableOpacity onPress={()=>setShowAddPromo(false)}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)"/>
              </TouchableOpacity>
              <Text style={s.modalTitle}>إضافة كود خصم</Text>
              <Ionicons name="pricetag-outline" size={22} color="rgba(255,255,255,0.8)"/>
            </LinearGradient>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={s.modalScrollContent}
              nestedScrollEnabled={true}>

              <Text style={s.inputLabel}>🎟️ الكود</Text>
              <TextInput
                style={s.modalInput}
                placeholder="SAVE10"
                value={promoForm.code}
                onChangeText={v=>setPromoForm(p=>({...p,code:v.toUpperCase()}))}
                textAlign="right"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"/>

              <Text style={s.inputLabel}>💯 نسبة الخصم %</Text>
              <TextInput
                style={s.modalInput}
                placeholder="10"
                value={promoForm.discountPercent}
                onChangeText={v=>setPromoForm(p=>({...p,discountPercent:v}))}
                keyboardType="numeric"
                textAlign="right"
                placeholderTextColor="#9ca3af"/>

              <TouchableOpacity
                style={[s.confirmBtn, {marginTop:16}]}
                onPress={()=>{
                  if(!promoForm.code || !promoForm.discountPercent) {
                    toast.warning('يرجى ملء الحقول'); return;
                  }
                  addPromo.mutate({code:promoForm.code, discountPercent:Number(promoForm.discountPercent)});
                }}
                disabled={addPromo.isPending}>
                <LinearGradient colors={[SECONDARY,'#e09000']} style={s.confirmGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  {addPromo.isPending
                    ? <ActivityIndicator color="#fff"/>
                    : <Text style={s.confirmText}>إضافة الكود</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex:1, backgroundColor:'#f0f4f8'},

  // Header
  header: {flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:16, paddingVertical:14},
  headerIconBox: {width:40, height:40, borderRadius:12, justifyContent:'center', alignItems:'center'},
  headerCenter: {alignItems:'center'},
  headerTitle: {fontSize:20, fontWeight:'bold', color:'#fff'},
  headerSub: {fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2},

  // Stats
  statsScroll: {maxHeight:105},
  statsContent: {padding:12, gap:10},
  statCard: {backgroundColor:'#fff', borderRadius:20, padding:12, minWidth:105,
    alignItems:'center', shadowColor:'#000', shadowOpacity:0.06,
    shadowRadius:10, shadowOffset:{width:0,height:3}, elevation:4},
  statIconBox: {width:40, height:40, borderRadius:12, justifyContent:'center',
    alignItems:'center', marginBottom:6},
  statValue: {fontSize:17, fontWeight:'bold', color:'#111827'},
  statLabel: {fontSize:10, color:'#6b7280', marginTop:2, textAlign:'center'},

  // Tabs
  tabsScroll: {maxHeight:58},
  tabsContent: {paddingHorizontal:12, gap:10, alignItems:'center'},
  tabBtn: {flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:14, paddingVertical:9,
    borderRadius:22, backgroundColor:'#fff', borderWidth:1.5, borderColor:'#e5e7eb'},
  tabActive: {backgroundColor:PRIMARY+'12', borderColor:PRIMARY},
  tabText: {fontSize:13, color:'#9ca3af', fontWeight:'500'},
  tabTextActive: {color:PRIMARY, fontWeight:'700'},
  badge: {backgroundColor:'#e5e7eb', borderRadius:8, paddingHorizontal:6, paddingVertical:2},
  badgeActive: {backgroundColor:PRIMARY},
  badgeText: {fontSize:10, color:'#9ca3af', fontWeight:'bold'},
  badgeTextActive: {color:'#fff'},

  // Search
  searchBox: {flexDirection:'row', alignItems:'center', backgroundColor:'#fff',
    marginHorizontal:14, marginVertical:8, borderRadius:14, paddingHorizontal:14,
    height:46, borderWidth:1.5, borderColor:'#e5e7eb', gap:8},
  searchInput: {flex:1, fontSize:14, color:'#111827'},

  // Filters
  filtersScroll: {maxHeight:46, marginBottom:4},
  filtersContent: {gap:8, paddingHorizontal:14, alignItems:'center'},
  filterBtn: {paddingHorizontal:16, paddingVertical:8, borderRadius:22,
    backgroundColor:'#fff', borderWidth:1.5, borderColor:'#e5e7eb'},
  filterBtnActive: {backgroundColor:PRIMARY, borderColor:PRIMARY},
  filterText: {fontSize:13, color:'#6b7280', fontWeight:'600'},
  filterTextActive: {color:'#fff'},

  // Order Card
  orderCard: {backgroundColor:'#fff', borderRadius:22, padding:16, marginBottom:12,
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{width:0,height:3}, elevation:4},
  orderHead: {flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12},
  orderId: {fontSize:15, fontWeight:'bold', color:'#111827'},
  orderDate: {fontSize:12, color:'#9ca3af', marginTop:2},
  statusPill: {flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:6, borderRadius:20},
  statusPillText: {fontSize:12, fontWeight:'bold'},
  orderBody: {backgroundColor:'#f8fafc', borderRadius:14, padding:12, marginBottom:12, gap:8},
  orderRow: {flexDirection:'row', justifyContent:'space-between', alignItems:'center'},
  orderLbl: {fontSize:13, color:'#9ca3af'},
  orderVal: {fontSize:13, color:'#374151', fontWeight:'500', flex:1, textAlign:'right'},
  orderDivider: {height:1, backgroundColor:'#e5e7eb', marginVertical:4},
  statusChangeLabel: {fontSize:12, color:'#9ca3af', textAlign:'right', marginBottom:8, fontWeight:'500'},
  statusBtns: {flexDirection:'row', flexWrap:'wrap', gap:8},
  statusBtn: {flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:12, paddingVertical:8,
    borderRadius:12, backgroundColor:'#f9fafb', borderWidth:1.5, borderColor:'#e5e7eb'},
  statusBtnText: {fontSize:12, color:'#6b7280', fontWeight:'600'},

  // Add Button
  addBtn: {borderRadius:16, marginBottom:14, overflow:'hidden',
    shadowColor:PRIMARY, shadowOpacity:0.3, shadowRadius:12, shadowOffset:{width:0,height:3}, elevation:5},
  addBtnGrad: {flexDirection:'row', justifyContent:'center', alignItems:'center', height:52, gap:8},
  addBtnText: {color:'#fff', fontWeight:'bold', fontSize:15},

  // Product Card (للـ ProductsTab)
  productCard: {backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:12,
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{width:0,height:2}, elevation:3},
  productName: {fontSize:16, fontWeight:'bold', color:'#111827', textAlign:'right', marginBottom:8},
  productMeta: {fontSize:12, color:'#6b7280', textAlign:'right', marginBottom:4},
  editBtn: {width:36, height:36, borderRadius:10, backgroundColor:PRIMARY,
    justifyContent:'center', alignItems:'center'},
  deleteBtn: {width:36, height:36, borderRadius:10, backgroundColor:DANGER,
    justifyContent:'center', alignItems:'center'},

  // Section Header
  sectionHeader: {flexDirection:'row', alignItems:'center', gap:8, marginBottom:14},
  sectionTitle: {fontSize:17, fontWeight:'bold', color:'#111827', flex:1, textAlign:'right'},
  sectionCount: {backgroundColor:PRIMARY+'15', borderRadius:10, paddingHorizontal:10, paddingVertical:4},
  sectionCountText: {fontSize:13, color:PRIMARY, fontWeight:'bold'},

  // Withdrawal Card
  withdrawCard: {backgroundColor:'#fff', borderRadius:22, padding:16, marginBottom:12,
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{width:0,height:3}, elevation:4},
  withdrawHead: {flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12},
  withdrawAmount: {fontSize:22, fontWeight:'bold', color:PRIMARY},
  withdrawDate: {fontSize:12, color:'#9ca3af', marginTop:2},
  wStatusPill: {paddingHorizontal:12, paddingVertical:6, borderRadius:16},
  wStatusText: {fontSize:13, fontWeight:'bold'},
  withdrawInfo: {backgroundColor:'#f8fafc', borderRadius:14, padding:12, marginBottom:12, gap:4},
  withdrawMethodLabel: {fontSize:13, color:'#9ca3af'},
  withdrawMethod: {fontSize:14, color:'#374151', fontWeight:'600'},
  withdrawAccount: {fontSize:13, color:'#6b7280', textAlign:'right', marginTop:4},
  withdrawBtns: {flexDirection:'row', gap:10},
  wBtn: {flex:1, flexDirection:'row', justifyContent:'center', alignItems:'center',
    gap:6, paddingVertical:13, borderRadius:14},
  wBtnText: {fontSize:14, fontWeight:'bold'},

  // User Card
  userCard: {backgroundColor:'#fff', borderRadius:20, padding:14, flexDirection:'row',
    alignItems:'center', gap:12, marginBottom:12,
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:10, shadowOffset:{width:0,height:3}, elevation:4},
  userAvatar: {width:52, height:52, borderRadius:26, backgroundColor:PRIMARY+'20',
    justifyContent:'center', alignItems:'center'},
  userAvatarText: {fontSize:24, fontWeight:'bold', color:PRIMARY},
  userInfo: {flex:1},
  userName: {fontSize:15, fontWeight:'bold', color:'#111827', textAlign:'right'},
  userPhone: {fontSize:13, color:'#6b7280', textAlign:'right', marginTop:2},
  userId: {fontSize:11, color:'#9ca3af', textAlign:'right', marginTop:2},
  userBalance: {fontSize:15, fontWeight:'bold', textAlign:'right'},
  userBalanceLabel: {fontSize:11, color:'#9ca3af', textAlign:'right'},

  // Promo Card
  promoCard: {backgroundColor:'#fff', borderRadius:20, padding:16, flexDirection:'row',
    alignItems:'center', gap:12, marginBottom:12,
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:10, shadowOffset:{width:0,height:3}, elevation:4},
  promoCode: {fontSize:20, fontWeight:'bold', color:'#111827', textAlign:'right'},
  promoDiscount: {fontSize:15, color:SECONDARY, fontWeight:'600', textAlign:'right', marginTop:3},
  promoStatusPill: {borderRadius:8, paddingHorizontal:8, paddingVertical:4, alignSelf:'flex-end', marginTop:5},
  promoDelBtn: {width:38, height:38, borderRadius:12, backgroundColor:'#fef2f2',
    justifyContent:'center', alignItems:'center'},
  promoIconBox: {width:52, height:52, borderRadius:16, justifyContent:'center', alignItems:'center'},

  // Empty State
  emptyBox: {justifyContent:'center', alignItems:'center', paddingTop:80, gap:10},
  emptyTitle: {fontSize:17, fontWeight:'bold', color:'#374151'},
  emptyText: {fontSize:14, color:'#9ca3af'},

  // Modal
  modalOverlay: {flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end'},
  modalCard: {backgroundColor:'#fff', borderTopLeftRadius:30, borderTopRightRadius:30,
    overflow:'hidden', maxHeight:'92%'},
  modalHeaderGrad: {flexDirection:'row', justifyContent:'space-between', alignItems:'center',
    paddingHorizontal:20, paddingVertical:16},
  modalHeader: {flexDirection:'row', justifyContent:'space-between', alignItems:'center',
    paddingHorizontal:20, paddingVertical:16, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#f3f4f6'},
  modalTitle: {fontSize:17, fontWeight:'bold', color:'#111827'},
  modalScrollContent: {padding:20, paddingBottom:10},

  // Form Inputs
  inputLabel: {fontSize:13, color:'#374151', textAlign:'right', marginBottom:7, marginTop:14, fontWeight:'700'},
  input: {borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:14, padding:13,
    fontSize:14, color:'#111827', backgroundColor:'#f9fafb', marginBottom:12},
  modalInput: {borderWidth:1.5, borderColor:'#e5e7eb', borderRadius:14, padding:13,
    fontSize:14, color:'#111827', backgroundColor:'#f9fafb'},
  textArea: {
    minHeight: 160,
    maxHeight: 240,
    textAlignVertical: 'top',
    paddingTop: 13,
    lineHeight: 22,
  },
  charCount: {fontSize:11, color:'#9ca3af', textAlign:'left', marginTop:4},
  rowInputs: {flexDirection:'row-reverse', gap:10},
  saveBtn: {borderRadius:16, overflow:'hidden', marginTop:16},
  saveGrad: {height:50, justifyContent:'center', alignItems:'center'},
  saveBtnText: {color:'#fff', fontWeight:'bold', fontSize:16},

  // Image Upload
  imageUploadContainer: {gap:10, paddingBottom:8, paddingTop:4},
  imgThumbBox: {position:'relative', width:88, height:88, marginRight:8},
  imgThumb: {width:88, height:88, borderRadius:16},
  imgMainBadge: {position:'absolute', bottom:0, left:0, right:0,
    backgroundColor:'rgba(12,102,121,0.8)', borderBottomLeftRadius:16, borderBottomRightRadius:16,
    alignItems:'center', paddingVertical:3},
  imgRemoveBtn: {position:'absolute', top:-8, right:-8},
  imgAddBtn: {width:88, height:88, borderRadius:16, backgroundColor:PRIMARY+'10',
    justifyContent:'center', alignItems:'center', borderWidth:2,
    borderColor:PRIMARY, borderStyle:'dashed'},
  imgAddText: {fontSize:11, color:PRIMARY, fontWeight:'600', marginTop:3},
  imgCountText: {fontSize:10, color:'#9ca3af', marginTop:2},
  imgPreview: {position:'relative', marginRight:8},
  imgPreviewImg: {width:80, height:80, borderRadius:12},
  imgRemove: {position:'absolute', top:-6, right:-6},

  // Toggle
  toggleBtn: {flexDirection:'row-reverse', alignItems:'center', gap:12,
    backgroundColor:'#f9fafb', borderRadius:16, padding:14, marginTop:14,
    borderWidth:1.5, borderColor:'#e5e7eb'},
  toggleTrack: {width:48, height:28, borderRadius:14, backgroundColor:'#e5e7eb',
    justifyContent:'center', padding:2},
  toggleTrackActive: {backgroundColor:SUCCESS},
  toggleThumb: {width:24, height:24, borderRadius:12, backgroundColor:'#fff',
    shadowColor:'#000', shadowOpacity:0.2, shadowRadius:3, shadowOffset:{width:0,height:1}},
  toggleThumbActive: {alignSelf:'flex-end'},
  toggleText: {fontSize:14, color:'#374151', fontWeight:'700', textAlign:'right'},
  toggleSubText: {fontSize:12, color:'#9ca3af', textAlign:'right', marginTop:2},

  // Profit Preview
  profitPreview: {backgroundColor:'#f0fdf4', borderRadius:14, padding:14, marginTop:10,
    flexDirection:'row-reverse', alignItems:'center', gap:8,
    borderWidth:1, borderColor:'#bbf7d0'},
  profitPreviewText: {fontSize:14, color:'#374151', textAlign:'right'},

  // Confirm Button
  confirmBtn: {borderRadius:16, overflow:'hidden', margin:16, marginTop:12,
    shadowColor:PRIMARY, shadowOpacity:0.3, shadowRadius:12, shadowOffset:{width:0,height:3}, elevation:5},
  confirmGrad: {height:54, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:8},
  confirmText: {color:'#fff', fontWeight:'bold', fontSize:16},
});