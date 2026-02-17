import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Modal, TextInput, ActivityIndicator,
  FlatList, Alert, Share, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const { width } = Dimensions.get('window');
const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeImg, setActiveImg] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [promoCode, setPromoCode] = useState('');
  const [promoData, setPromoData] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await api.get(`/api/products/${id}`); return data; },
  });

  const getImages = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
    return imgs.length > 0 ? imgs : (p.imageUrl ? [p.imageUrl] : []);
  };

  const getAdLinks = (p: any) => {
    if (!p.adLinks) return [];
    return p.adLinks.split(',').filter(Boolean);
  };

  const hasDiscount = product?.discount > 0;
  const discountedPrice = hasDiscount
    ? product?.wholesalePrice * (1 - product?.discount / 100)
    : product?.wholesalePrice;

  const profit = sellingPrice
    ? Number(sellingPrice) - (discountedPrice || 0) - (promoData ? (Number(sellingPrice) * promoData.discountPercent / 100) : 0)
    : 0;

  const verifyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const { data } = await api.post('/api/promo-codes/verify', { code: promoCode });
      setPromoData(data);
      toast.success(`كود صحيح! خصم ${data.discountPercent}% ✅`);
    } catch {
      setPromoData(null);
      toast.error('كود غير صحيح أو منتهي الصلاحية');
    }
    setPromoLoading(false);
  };

  const addToCart = async () => {
    if (!sellingPrice || Number(sellingPrice) < (discountedPrice || 0)) {
      toast.warning('السعر يجب أن يكون أكبر من سعر الجملة'); return;
    }
    try {
      const cartRaw = await AsyncStorage.getItem('cart');
      const cart = cartRaw ? JSON.parse(cartRaw) : [];
      const existing = cart.findIndex((i: any) => i.productId === product.id);
      if (existing >= 0) {
        cart[existing].quantity += Number(quantity);
        cart[existing].sellingPrice = Number(sellingPrice);
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          imageUrl: getImages(product)[0] || '',
          wholesalePrice: discountedPrice,
          sellingPrice: Number(sellingPrice),
          quantity: Number(quantity),
          promoCode: promoData ? promoCode : '',
          promoDiscount: promoData?.discountPercent || 0,
        });
      }
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      toast.success('تمت الإضافة إلى السلة ✅');
      setShowCart(false);
      setSellingPrice('');
      setQuantity('1');
      setPromoCode('');
      setPromoData(null);
    } catch {
      toast.error('فشل الإضافة إلى السلة');
    }
  };

  const downloadImage = async (url: string) => {
    await Linking.openURL(url);
  };

  const downloadAllImages = async () => {
    if (!product) return;
    const imgs = getImages(product);
    for (const url of imgs) {
      await Linking.openURL(url);
    }
    toast.info(`جاري تحميل ${imgs.length} صورة...`);
  };

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );

  if (!product) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>المنتج غير موجود</Text>
    </View>
  );

  const images = getImages(product);
  const adLinks = getAdLinks(product);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>تفاصيل المنتج</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Images Slider */}
        <View style={s.sliderBox}>
          <FlatList
            ref={flatRef}
            data={images}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={e => {
              setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={s.sliderImg} resizeMode="cover" />
            )}
          />

          {/* Download Button */}
          <TouchableOpacity style={s.downloadBtn}
            onPress={() => {
              Alert.alert('تحميل الصور', 'اختر خيار التحميل', [
                { text: 'تحميل هذه الصورة', onPress: () => downloadImage(images[activeImg]) },
                { text: 'تحميل جميع الصور', onPress: downloadAllImages },
                { text: 'إلغاء', style: 'cancel' },
              ]);
            }}>
            <Ionicons name="download-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Dots */}
          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <TouchableOpacity key={i}
                  style={[s.dot, i === activeImg && s.dotActive]}
                  onPress={() => {
                    flatRef.current?.scrollToIndex({ index: i, animated: true });
                    setActiveImg(i);
                  }} />
              ))}
            </View>
          )}

          {/* Badges */}
          {product.isRenewable && (
            <View style={s.renewBadge}>
              <Text style={s.renewText}>قابل للتجديد</Text>
            </View>
          )}
          {hasDiscount && (
            <View style={s.discountBadge}>
              <Text style={s.discountText}>خصم {product.discount}%</Text>
            </View>
          )}

          {/* Image Counter */}
          <View style={s.imgCounter}>
            <Text style={s.imgCounterText}>{activeImg + 1}/{images.length}</Text>
          </View>
        </View>

        <View style={s.content}>
          {/* Name */}
          <Text style={s.name}>{product.name}</Text>

          {/* Category */}
          <View style={s.catPill}>
            <Text style={s.catText}>{product.category}</Text>
          </View>

          {/* Price & Stock */}
          <View style={s.infoGrid}>
            <View style={s.infoBox}>
              <Text style={s.infoLabel}>المخزون</Text>
              <Text style={[s.infoVal, product.stock < 5 && { color: '#ef4444' }]}>
                {product.stock} قطعة
              </Text>
            </View>
            <View style={[s.infoBox, { borderRightWidth: 1, borderRightColor: '#e5e7eb' }]}>
              {hasDiscount && (
                <Text style={s.oldPrice}>{product.wholesalePrice.toLocaleString()} د.ع</Text>
              )}
              <Text style={s.infoLabel}>سعر الجملة</Text>
              <Text style={[s.infoVal, { color: PRIMARY }]}>
                {Math.round(discountedPrice).toLocaleString()} د.ع
              </Text>
            </View>
          </View>

          {/* Ad Links */}
          {adLinks.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🔗 الروابط الإعلانية</Text>
              {adLinks.map((link: string, i: number) => (
                <TouchableOpacity key={i} style={s.adLink}
                  onPress={() => Linking.openURL(link.trim())}>
                  <Ionicons name="link-outline" size={16} color={PRIMARY} />
                  <Text style={s.adLinkText} numberOfLines={1}>{link.trim()}</Text>
                  <Ionicons name="open-outline" size={14} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <TouchableOpacity onPress={async () => {
                  await Share.share({ message: product.description });
                  toast.info('تم نسخ الوصف');
                }} style={s.copyBtn}>
                  <Ionicons name="copy-outline" size={18} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={s.sectionTitle}>📋 المواصفات</Text>
              </View>
              <Text style={s.description}>{product.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Add to Cart Button */}
      <TouchableOpacity style={s.floatBtn} onPress={() => setShowCart(true)}>
        <Ionicons name="cart-outline" size={22} color="#fff" />
        <Text style={s.floatBtnText}>إضافة إلى السلة</Text>
      </TouchableOpacity>

      {/* Add to Cart Modal */}
      <Modal visible={showCart} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setShowCart(false); setPromoCode(''); setPromoData(null); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>تحديد السعر والكمية</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Price Input */}
              <Text style={s.inputLabel}>سعر البيع (د.ع) *</Text>
              <View style={s.priceInputBox}>
                <View style={s.profitBox}>
                  <Text style={[s.profitVal, { color: profit >= 0 ? '#10b981' : '#ef4444' }]}>
                    {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()}
                  </Text>
                  <Text style={s.profitLabel}>الربح</Text>
                </View>
                <TextInput style={s.priceInput}
                  placeholder={`أدنى: ${Math.round(discountedPrice).toLocaleString()}`}
                  value={sellingPrice} onChangeText={setSellingPrice}
                  keyboardType="numeric" textAlign="right"
                  placeholderTextColor="#9ca3af" />
              </View>

              {/* Quantity */}
              <Text style={s.inputLabel}>الكمية</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity style={s.qtyBtn}
                  onPress={() => setQuantity(q => String(Math.max(1, Number(q) - 1)))}>
                  <Ionicons name="remove" size={20} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={s.qtyVal}>{quantity}</Text>
                <TouchableOpacity style={s.qtyBtn}
                  onPress={() => setQuantity(q => String(Number(q) + 1))}>
                  <Ionicons name="add" size={20} color={PRIMARY} />
                </TouchableOpacity>
              </View>

              {/* Promo Code */}
              <Text style={s.inputLabel}>كود الخصم (اختياري)</Text>
              <View style={s.promoRow}>
                <TouchableOpacity style={[s.promoVerifyBtn, promoLoading && { opacity: 0.6 }]}
                  onPress={verifyPromo} disabled={promoLoading}>
                  {promoLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.promoVerifyText}>تحقق</Text>
                  }
                </TouchableOpacity>
                <TextInput style={s.promoInput}
                  placeholder="أدخل كود الخصم"
                  value={promoCode}
                  onChangeText={(v) => { setPromoCode(v.toUpperCase()); setPromoData(null); }}
                  textAlign="right" placeholderTextColor="#9ca3af"
                  autoCapitalize="characters" />
              </View>
              {promoData && (
                <View style={s.promoSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={s.promoSuccessText}>خصم {promoData.discountPercent}% مطبق ✅</Text>
                </View>
              )}

              {/* Summary */}
              <View style={s.summary}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryVal}>{Math.round(discountedPrice).toLocaleString()} د.ع</Text>
                  <Text style={s.summaryLabel}>سعر الجملة</Text>
                </View>
                {sellingPrice && (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryVal}>{Number(sellingPrice).toLocaleString()} د.ع</Text>
                    <Text style={s.summaryLabel}>سعر البيع</Text>
                  </View>
                )}
                {promoData && sellingPrice && (
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryVal, { color: '#ef4444' }]}>
                      -{Math.round(Number(sellingPrice) * promoData.discountPercent / 100).toLocaleString()} د.ع
                    </Text>
                    <Text style={s.summaryLabel}>خصم الكود</Text>
                  </View>
                )}
                <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[s.summaryVal, { color: profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: 16 }]}>
                    {Math.round(profit).toLocaleString()} د.ع
                  </Text>
                  <Text style={[s.summaryLabel, { fontWeight: 'bold' }]}>صافي الربح</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={s.addBtn} onPress={addToCart}>
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={s.addBtnText}>إضافة إلى السلة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  sliderBox: { width, height: width, position: 'relative', backgroundColor: '#f3f4f6' },
  sliderImg: { width, height: width },
  downloadBtn: { position: 'absolute', top: 12, left: 12, width: 40, height: 40,
    borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center' },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center',
    flexDirection: 'row', gap: 6, left: 0, right: 0, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
  renewBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#166534',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  renewText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  discountBadge: { position: 'absolute', top: 52, right: 12, backgroundColor: SECONDARY,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  imgCounter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  imgCounterText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 16 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 8 },
  catPill: { backgroundColor: PRIMARY + '15', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 5, alignSelf: 'flex-end', marginBottom: 16 },
  catText: { fontSize: 12, color: PRIMARY, fontWeight: 'bold' },
  infoGrid: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 2 },
  infoBox: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  infoVal: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  oldPrice: { fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through', textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  copyBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22, textAlign: 'right' },
  adLink: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: '#f0f9ff', borderRadius: 10, padding: 10, marginBottom: 8 },
  adLinkText: { flex: 1, fontSize: 13, color: PRIMARY, textAlign: 'right' },
  floatBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 54,
    backgroundColor: PRIMARY, borderRadius: 18, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  floatBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  inputLabel: { fontSize: 13, color: '#374151', textAlign: 'right',
    marginBottom: 8, marginTop: 12, fontWeight: '600' },
  priceInputBox: { flexDirection: 'row', gap: 10 },
  priceInput: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    padding: 12, fontSize: 16, color: '#111827', backgroundColor: '#f9fafb' },
  profitBox: { backgroundColor: '#ecfdf5', borderRadius: 14, padding: 12,
    justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  profitVal: { fontSize: 16, fontWeight: 'bold' },
  profitLabel: { fontSize: 11, color: '#6b7280' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  qtyBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center' },
  qtyVal: { fontSize: 24, fontWeight: 'bold', color: '#111827', minWidth: 40, textAlign: 'center' },
  promoRow: { flexDirection: 'row', gap: 10 },
  promoInput: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  promoVerifyBtn: { backgroundColor: SECONDARY, borderRadius: 14,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  promoVerifyText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  promoSuccess: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#ecfdf5', borderRadius: 10, padding: 10, marginTop: 8 },
  promoSuccessText: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  summary: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, marginTop: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryVal: { fontSize: 14, color: '#111827', fontWeight: '600' },
  addBtn: { backgroundColor: PRIMARY, borderRadius: 16, height: 54,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 16, shadowColor: PRIMARY, shadowOpacity: 0.3,
    shadowRadius: 10, elevation: 5 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
