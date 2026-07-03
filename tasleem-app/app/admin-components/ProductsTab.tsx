import { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Modal, TextInput, ActivityIndicator, FlatList, Alert, 
  KeyboardAvoidingView, Platform, Image, Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const ACCENT = '#10b981';
const BG = '#f2f6f9';

export default function ProductsTab() {
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [form, setForm] = useState({
    name: '', description: '', categories: [] as string[],
    companyWholesalePrice: '', wholesalePrice: '', suggestedPrice: '', sellingPriceMin: '',
    stock: '', discount: '', adLinks: [] as string[], // ✅ تغيير من string إلى array
    images: [] as string[],
    isActive: true,
    isRenewable: false
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
    queryFn: async () => {
      const { data } = await api.get('/api/products');
      return data.sort((a: any, b: any) => b.id - a.id);
    },
  });

  const filteredProducts = products.filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'الكل' ||
      (p.category && p.category.split(',').includes(selectedCategory));
    return matchSearch && matchCategory;
  });

  const pickAndUploadImages = async () => {
    if (form.images.length >= 10) {
      toast.warning('الحد الأقصى 10 صور');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('يرجى السماح بالوصول إلى الصور');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10 - form.images.length,
        quality: 0.6,
      });

      if (result.canceled || !result.assets.length) return;

      setUploadingImgs(true);

      const uploadedUrls: string[] = [];

      for (const asset of result.assets) {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const uploadResponse = await api.post('/api/upload', { image: base64 });

          if (uploadResponse.data?.url) {
            uploadedUrls.push(uploadResponse.data.url);
          }
        } catch (err) {
          console.error('خطأ في رفع صورة:', err);
        }
      }

      if (uploadedUrls.length > 0) {
        setForm(p => ({ ...p, images: [...p.images, ...uploadedUrls] }));
        toast.success(`تم رفع ${uploadedUrls.length} صورة ✅`);
      } else {
        toast.error('فشل رفع الصور');
      }
    } catch (e: any) {
      console.error('رفع الصور:', e);
      toast.error(e.response?.data?.message || 'فشل رفع الصور');
    } finally {
      setUploadingImgs(false);
    }
  };

  const saveProduct = useMutation({
    mutationFn: async (data: any) => {
      // ✅ تحويل مصفوفة الروابط إلى string مفصولة بفواصل لتخزينها في قاعدة البيانات
      const payload = {
        ...data,
        adLinks: data.adLinks.join(','), 
      };
      if (editingProduct) {
        const res = await api.put(`/api/products/${editingProduct.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/api/products', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'تم التحديث ✅' : 'تمت الإضافة ✅');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setShowModal(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحفظ'),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/products/${id}`);
    },
    onSuccess: () => {
      toast.success('تم الحذف ✅');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.warning('يرجى إدخال اسم المنتج');
      return;
    }
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
      adLinks: form.adLinks, // ✅ سيتم تحويله إلى string في mutate
      images: form.images.join(','),
      isActive: form.isActive,
      isRenewable: form.isRenewable,
    });
  };

  const resetForm = () => {
    setForm({
      name: '', description: '', categories: [],
      companyWholesalePrice: '', wholesalePrice: '', suggestedPrice: '', sellingPriceMin: '',
      stock: '', discount: '', adLinks: [], // ✅ reset to array
      images: [], isActive: true, isRenewable: false
    });
    setEditingProduct(null);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    // ✅ تحويل adLinks من string إلى array
    const adLinksArray = p.adLinks ? p.adLinks.split(',').filter(Boolean).map((link: string) => link.trim()) : [];
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
      adLinks: adLinksArray,
      images: p.images ? p.images.split(',').filter(Boolean) : [],
      isActive: p.isActive !== false,
      isRenewable: !!p.isRenewable,
    });
    setShowModal(true);
  };

  // ✅ إضافة رابط جديد
  const addAdLink = () => {
    if (form.adLinks.length >= 10) {
      toast.warning('الحد الأقصى 10 روابط');
      return;
    }
    setForm(prev => ({
      ...prev,
      adLinks: [...prev.adLinks, '']
    }));
  };

  // ✅ تحديث رابط معين
  const updateAdLink = (index: number, value: string) => {
    const newLinks = [...form.adLinks];
    newLinks[index] = value;
    setForm(prev => ({ ...prev, adLinks: newLinks }));
  };

  // ✅ حذف رابط معين
  const removeAdLink = (index: number) => {
    if (form.adLinks.length <= 1) {
      toast.warning('يجب أن يكون هناك رابط واحد على الأقل');
      return;
    }
    const newLinks = form.adLinks.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, adLinks: newLinks }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* شريط البحث والفلترة */}
      <View style={s.searchSection}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث عن منتج..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
            textAlign="right"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {['الكل', ...availableCategories].map((cat: string) => (
            <TouchableOpacity
              key={cat}
              style={[s.filterChip, selectedCategory === cat && s.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}>
              <Text style={[s.filterChipText, selectedCategory === cat && s.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* زر الإضافة */}
      <TouchableOpacity
        style={s.addBtn}
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
        activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={s.addBtnText}>إضافة منتج جديد</Text>
      </TouchableOpacity>

      {/* قائمة المنتجات */}
      <FlatList
        data={filteredProducts}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="cube-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد منتجات</Text>
          </View>
        }
        renderItem={({ item: p }) => {
          const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
          const categories = p.category ? p.category.split(',').filter(Boolean) : [];

          return (
            <TouchableOpacity
              style={s.productCard}
              onPress={() => openEdit(p)}
              activeOpacity={0.95}>

              <View style={s.cardContent}>
                {imgs[0] ? (
                  <Image source={{ uri: imgs[0] }} style={s.productImage} resizeMode="cover" />
                ) : (
                  <View style={s.productImagePlaceholder}>
                    <Ionicons name="image-outline" size={28} color="#d1d5db" />
                  </View>
                )}

                <View style={s.productInfo}>
                  <View style={s.productHeader}>
                    <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                    {!p.isActive && (
                      <View style={s.inactiveBadge}>
                        <Text style={s.inactiveBadgeText}>مخفي</Text>
                      </View>
                    )}
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    {categories.map((cat: string, idx: number) => (
                      <View key={idx} style={s.categoryBadge}>
                        <Text style={s.categoryBadgeText}>{cat}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  <View style={s.pricesRow}>
                    <View style={s.priceTag}>
                      <Text style={s.priceTagLabel}>التاجر</Text>
                      <Text style={s.priceTagValue}>{p.wholesalePrice.toLocaleString()}</Text>
                    </View>
                    <View style={[s.priceTag, s.priceTagSuggested]}>
                      <Text style={s.priceTagLabel}>مقترح</Text>
                      <Text style={[s.priceTagValue, { color: ACCENT }]}>
                        {(p.suggestedPrice || p.wholesalePrice).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[s.stockBadge, p.stock > 10 ? s.stockHigh : p.stock > 0 ? s.stockMed : s.stockLow]}>
                      <Text style={s.stockText}>{p.stock}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={s.actionsRow}>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    openEdit(p);
                  }}>
                  <Ionicons name="create-outline" size={14} color={SECONDARY} />
                  <Text style={[s.actionBtnText, { color: SECONDARY }]}>تعديل</Text>
                </TouchableOpacity>

                <View style={s.actionDivider} />

                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    Alert.alert('تأكيد الحذف', `هل تريد حذف "${p.name}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'حذف', onPress: () => deleteProduct.mutate(p.id), style: 'destructive' }
                    ]);
                  }}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  <Text style={[s.actionBtnText, { color: '#ef4444' }]}>حذف</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal إضافة/تعديل المنتج */}
      <Modal visible={showModal} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
            
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowModal(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>{editingProduct ? 'تعديل منتج' : 'إضافة منتج'}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={s.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">

              <View style={s.switchRow}>
                <Switch
                  value={form.isActive}
                  onValueChange={v => setForm(p => ({ ...p, isActive: v }))}
                  trackColor={{ false: '#d1d5db', true: PRIMARY + '50' }}
                  thumbColor={form.isActive ? PRIMARY : '#f3f4f6'}
                />
                <Text style={s.switchLabel}>
                  {form.isActive ? '🟢 المنتج ظاهر' : '🔴 المنتج مخفي'}
                </Text>
              </View>

              <View style={[s.switchRow, { borderColor: SECONDARY + '40' }]}>
                <Switch
                  value={form.isRenewable}
                  onValueChange={v => setForm(p => ({ ...p, isRenewable: v }))}
                  trackColor={{ false: '#d1d5db', true: SECONDARY + '50' }}
                  thumbColor={form.isRenewable ? SECONDARY : '#f3f4f6'}
                />
                <Text style={[s.switchLabel, { color: SECONDARY }]}>
                  {form.isRenewable ? '⭐ قابل للتجديد' : '⚪ غير قابل للتجديد'}
                </Text>
              </View>

              <Text style={s.inputLabel}>اسم المنتج *</Text>
              <TextInput
                style={s.input}
                placeholder="اسم المنتج"
                value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))}
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.inputLabel}>الوصف</Text>
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="وصف المنتج بالتفصيل..."
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                multiline
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

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
                    }}>
                    <Text style={[
                      s.categoryChipText,
                      form.categories.includes(cat) && s.categoryChipTextActive
                    ]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.inputLabel}>سعر الشركة (مخفي عن التاجر) *</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                value={form.companyWholesalePrice}
                onChangeText={v => setForm(p => ({ ...p, companyWholesalePrice: v }))}
                keyboardType="number-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.inputLabel}>سعر الجملة للتاجر *</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                value={form.wholesalePrice}
                onChangeText={v => setForm(p => ({ ...p, wholesalePrice: v }))}
                keyboardType="number-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.inputLabel}>سعر البيع المقترح *</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                value={form.suggestedPrice}
                onChangeText={v => setForm(p => ({ ...p, suggestedPrice: v }))}
                keyboardType="number-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.inputLabel}>الحد الأدنى (اختياري)</Text>
              <TextInput
                style={s.input}
                placeholder="اتركه فارغاً"
                value={form.sellingPriceMin}
                onChangeText={v => setForm(p => ({ ...p, sellingPriceMin: v }))}
                keyboardType="number-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.inputLabel}>المخزون *</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                value={form.stock}
                onChangeText={v => setForm(p => ({ ...p, stock: v }))}
                keyboardType="number-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.inputLabel}>نسبة الخصم (%)</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                value={form.discount}
                onChangeText={v => setForm(p => ({ ...p, discount: v }))}
                keyboardType="number-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />

              {/* ✅ قسم الروابط الإعلانية الجديد */}
              <Text style={s.inputLabel}>الروابط الإعلانية ({form.adLinks.length}/10)</Text>
              
              {form.adLinks.map((link, index) => (
                <View key={index} style={s.adLinkRow}>
                  <TextInput
                    style={[s.input, s.adLinkInput]}
                    placeholder={`رابط ${index + 1}`}
                    value={link}
                    onChangeText={(text) => updateAdLink(index, text)}
                    textAlign="right"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={s.removeAdLinkBtn}
                    onPress={() => removeAdLink(index)}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity
                style={[s.addAdLinkBtn, form.adLinks.length >= 10 && s.addAdLinkBtnDisabled]}
                onPress={addAdLink}
                disabled={form.adLinks.length >= 10}>
                <Ionicons name="add-circle-outline" size={20} color={form.adLinks.length >= 10 ? '#9ca3af' : PRIMARY} />
                <Text style={[s.addAdLinkBtnText, form.adLinks.length >= 10 && s.addAdLinkBtnTextDisabled]}>
                  إضافة رابط جديد
                </Text>
              </TouchableOpacity>

              <Text style={s.inputLabel}>صور ({form.images.length}/10) — اضغط على الصورة لتعيينها رئيسية</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {form.images.map((uri, idx) => (
                  <View key={idx} style={s.imgPreview}>
                    <TouchableOpacity onPress={() => {
                      const newImgs = [...form.images];
                      newImgs.splice(idx, 1);
                      newImgs.unshift(uri);
                      setForm(p => ({ ...p, images: newImgs }));
                    }}>
                      <Image source={{ uri }} style={[s.imgPreviewImg, idx === 0 && s.imgPreviewMain]} />
                      {idx === 0 && (
                        <View style={s.mainBadge}>
                          <Text style={s.mainBadgeText}>رئيسية ⭐</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.imgRemove}
                      onPress={() => setForm(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={s.imgAddBtn} onPress={pickAndUploadImages} disabled={uploadingImgs}>
                  {uploadingImgs ? (
                    <ActivityIndicator color={PRIMARY} />
                  ) : (
                    <Ionicons name="images-outline" size={32} color={PRIMARY} />
                  )}
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity
                style={[s.saveBtn, saveProduct.isPending && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saveProduct.isPending}>
                {saveProduct.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={s.saveBtnText}>حفظ المنتج</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },

  searchSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', textAlign: 'right' },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  filterChipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  filterChipTextActive: { color: PRIMARY },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 14,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  cardContent: { flexDirection: 'row', gap: 12 },
  productImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f3f4f6' },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { flex: 1 },

  productHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  productName: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  inactiveBadge: { backgroundColor: '#ef444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  inactiveBadgeText: { fontSize: 10, color: '#ef4444', fontWeight: '700' },

  categoryBadge: { backgroundColor: PRIMARY + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 4 },
  categoryBadgeText: { fontSize: 10, color: PRIMARY, fontWeight: '600' },

  pricesRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  priceTag: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: '#e8edf2' },
  priceTagSuggested: { backgroundColor: '#ecfdf5' },
  priceTagLabel: { fontSize: 9, color: '#6b7280', textAlign: 'right', fontWeight: '600' },
  priceTagValue: { fontSize: 12, fontWeight: 'bold', color: PRIMARY, textAlign: 'right' },

  stockBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  stockHigh: { backgroundColor: '#10b98115' },
  stockMed: { backgroundColor: '#f5a00615' },
  stockLow: { backgroundColor: '#ef444415' },
  stockText: { fontSize: 13, fontWeight: 'bold', color: '#111827' },

  actionsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  actionDivider: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: 6 },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  modalBody: { padding: 16, paddingBottom: 30 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
  },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },

  inputLabel: { fontSize: 12, color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 14, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  textareaSmall: { height: 70, textAlignVertical: 'top' },

  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  categoryChipActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  categoryChipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  categoryChipTextActive: { color: PRIMARY },

  // ✅ أنماط الروابط الإعلانية
  adLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  adLinkInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeAdLinkBtn: {
    padding: 4,
  },
  addAdLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  addAdLinkBtnDisabled: {
    opacity: 0.5,
  },
  addAdLinkBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },
  addAdLinkBtnTextDisabled: {
    color: '#9ca3af',
  },

  imgPreview: { width: 90, height: 90, borderRadius: 14, marginRight: 10, position: 'relative' },
  imgPreviewImg: { width: '100%', height: '100%', borderRadius: 14 },
  imgPreviewMain: { borderWidth: 2, borderColor: SECONDARY },
  mainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(245,160,6,0.85)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    paddingVertical: 2,
  },
  mainBadgeText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  imgRemove: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 },
  imgAddBtn: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },

  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});