import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, ActivityIndicator,
  FlatList, Alert, Clipboard, Linking, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';


const generateProductCode = (id: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seed = id * 12345 + 67890; // seed ثابت لنفس الـ ID
  let code = '';
  let tempSeed = seed;
  for (let i = 0; i < 5; i++) {
    code += chars[tempSeed % chars.length];
    tempSeed = Math.floor(tempSeed / chars.length) + (i * 17);
  }
  return code;
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
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
    : product?.wholesalePrice || 0;

  const promoDiscount = promoData && sellingPrice
    ? (Number(sellingPrice) * promoData.discountPercent / 100) : 0;
  const profit = sellingPrice ? Number(sellingPrice) - discountedPrice - promoDiscount : 0;

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
    if (!sellingPrice || Number(sellingPrice) < product.sellingPriceMin) {
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
          productId: product.id, name: product.name,
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
      router.push('/cart');
      setShowCart(false);
      setSellingPrice(''); setQuantity('1');
      setPromoCode(''); setPromoData(null);
    } catch { toast.error('فشل الإضافة إلى السلة'); }
  };

  const copyText = (text: string) => {
    Clipboard.setString(text);
    toast.success('تم النسخ ✅');
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
  const sliderHeight = Math.min(width, 420);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Slider */}
        <View style={[s.sliderBox, { height: sliderHeight }]}>
          <FlatList ref={flatRef} data={images} horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={e => {
              setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }}
                style={{ width, height: sliderHeight }} resizeMode="cover" />
            )} />

          {/* Download */}
          <TouchableOpacity style={s.downloadBtn}
            onPress={() => Alert.alert('تحميل الصور', 'اختر خيار التحميل', [
              { text: 'تحميل هذه الصورة', onPress: () => Linking.openURL(images[activeImg]) },
              { text: `تحميل جميع الصور (${images.length})`, onPress: () => images.forEach((u: string) => Linking.openURL(u)) },
              { text: 'إلغاء', style: 'cancel' },
            ])}>
            <Ionicons name="download-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Dots */}
          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_: any, i: number) => (
                <TouchableOpacity key={i}
                  style={[s.dot, i === activeImg && s.dotActive]}
                  onPress={() => {
                    flatRef.current?.scrollToIndex({ index: i, animated: true });
                    setActiveImg(i);
                  }} />
              ))}
            </View>
          )}

          {product.isRenewable && (
            <View style={s.renewBadge}><Text style={s.renewText}>قابل للتجديد</Text></View>
          )}
          {hasDiscount && (
            <View style={s.discountBadge}><Text style={s.discountText}>خصم {product.discount}%</Text></View>
          )}
          <View style={s.imgCounter}>
            <Text style={s.imgCounterText}>{activeImg + 1}/{images.length}</Text>
          </View>
        </View>

        <View style={s.content}>
          <Text style={s.name}>{product.name}</Text>
          <Text style={s.productCode}>رقم المنتج : #{generateProductCode(product.id)}</Text>
          {/* <Text style={s.productId}>🔢 رقم المنتج: #{product.id}</Text> */}
          <View style={s.catPill}><Text style={s.catText}>{product.category}</Text></View>

          {/* Info */}
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
                  <Ionicons name="open-outline" size={14} color="#9ca3af" />
                  <Text style={s.adLinkText} numberOfLines={1}>{link.trim()}</Text>
                  <Ionicons name="link-outline" size={16} color={PRIMARY} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <TouchableOpacity onPress={() => copyText(product.description)} style={s.copyBtn}>
                  <Ionicons name="copy-outline" size={18} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={s.sectionTitle}>📋 المواصفات</Text>
              </View>
              <Text style={s.description}>{product.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Float Button */}
      <View style={s.floatWrapper}>
        <TouchableOpacity style={s.floatBtn} onPress={() => setShowCart(true)}>
          <Ionicons name="cart-outline" size={22} color="#fff" />
          <Text style={s.floatBtnText}>إضافة إلى السلة</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Modal */}
      <Modal visible={showCart} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setShowCart(false); setPromoCode(''); setPromoData(null); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>تحديد السعر والكمية</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.inputLabel}>سعر البيع (د.ع) *</Text>
              <View style={s.priceInputBox}>
                <View style={s.profitBox}>
                  <Text style={[s.profitVal, { color: profit >= 0 ? '#10b981' : '#ef4444' }]}>
                    {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()}
                  </Text>
                  <Text style={s.profitLabel}>الربح</Text>
                </View>
                <TextInput style={s.priceInput}
                  placeholder={`الحد الأدنى: ${Math.round(product?.sellingPriceMin || 0).toLocaleString()} د.ع`}
                  value={sellingPrice} onChangeText={setSellingPrice}
                  keyboardType="numeric" textAlign="right"
                  placeholderTextColor="#9ca3af" />
              </View>

              <Text style={s.inputLabel}>الكمية</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity style={s.qtyBtn}
                  onPress={() => setQuantity(q => String(Math.max(1, Number(q) - 1)))}>
                  <Ionicons name="remove" size={20} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={s.qtyVal}>{quantity}</Text>
                <TouchableOpacity style={s.qtyBtn}
                  onPress={() => { const newQty = Number(quantity) + 1; if (newQty <= product.stock) { setQuantity(String(newQty)); } else { toast.warning(`المخزون المتوفر: ${product.stock}`); } }}>
                  <Ionicons name="add" size={20} color={PRIMARY} />
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>كود الخصم (اختياري)</Text>
              <View style={s.promoRow}>
                <TouchableOpacity
                  style={[s.promoVerifyBtn, promoLoading && { opacity: 0.6 }]}
                  onPress={verifyPromo} disabled={promoLoading}>
                  {promoLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.promoVerifyText}>تحقق</Text>}
                </TouchableOpacity>
                <TextInput style={s.promoInput}
                  placeholder="أدخل كود الخصم"
                  value={promoCode}
                  onChangeText={v => { setPromoCode(v.toUpperCase()); setPromoData(null); }}
                  textAlign="right" placeholderTextColor="#9ca3af"
                  autoCapitalize="characters" />
              </View>
              {promoData && (
                <View style={s.promoSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={s.promoSuccessText}>خصم {promoData.discountPercent}% مطبق ✅</Text>
                </View>
              )}

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
                      -{Math.round(promoDiscount).toLocaleString()} د.ع
                    </Text>
                    <Text style={s.summaryLabel}>خصم الكود</Text>
                  </View>
                )}
                <View style={[s.summaryRow, s.summaryTotal]}>
                  <Text style={[s.summaryVal,
                    { color: profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: 16 }]}>
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
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#111827',
    textAlign: 'center', marginHorizontal: 8 },
  sliderBox: { position: 'relative', backgroundColor: '#f3f4f6' },
  downloadBtn: { position: 'absolute', top: 12, left: 12, width: 38, height: 38,
    borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center' },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
  renewBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#166534',
    borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  renewText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  discountBadge: { position: 'absolute', top: 48, right: 12, backgroundColor: SECONDARY,
    borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  imgCounter: { position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 9,
    paddingHorizontal: 8, paddingVertical: 3 },
  imgCounterText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  content: { padding: 14 },
  productCode: { fontSize: 13, color: '#6b7280', marginTop: 4, fontWeight: '600', letterSpacing: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 8 },
  catPill: { backgroundColor: PRIMARY + '15', borderRadius: 9, paddingHorizontal: 11,
    paddingVertical: 4, alignSelf: 'flex-end', marginBottom: 14 },
  catText: { fontSize: 11, color: PRIMARY, fontWeight: 'bold' },
  infoGrid: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 12, shadowColor: '#000',
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  infoBox: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  infoVal: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  oldPrice: { fontSize: 11, color: '#9ca3af', textDecorationLine: 'line-through', textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  copyBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center' },
  description: { fontSize: 13, color: '#374151', lineHeight: 21, textAlign: 'right' },
  adLink: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: '#f0f9ff', borderRadius: 9, padding: 9, marginBottom: 7 },
  adLinkText: { flex: 1, fontSize: 12, color: PRIMARY, textAlign: 'right' },
  floatWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, paddingBottom: 20, backgroundColor: 'transparent' },
  floatBtn: { height: 52, backgroundColor: PRIMARY, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 },
  floatBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, paddingBottom: 36, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  inputLabel: { fontSize: 12, color: '#374151', textAlign: 'right',
    marginBottom: 7, marginTop: 10, fontWeight: '600' },
  priceInputBox: { flexDirection: 'row', gap: 9 },
  priceInput: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 11, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  profitBox: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 11,
    justifyContent: 'center', alignItems: 'center', minWidth: 75 },
  profitVal: { fontSize: 15, fontWeight: 'bold' },
  profitLabel: { fontSize: 10, color: '#6b7280' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  qtyBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center' },
  qtyVal: { fontSize: 22, fontWeight: 'bold', color: '#111827',
    minWidth: 36, textAlign: 'center' },
  promoRow: { flexDirection: 'row', gap: 9 },
  promoInput: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 11, fontSize: 13, color: '#111827', backgroundColor: '#f9fafb' },
  promoVerifyBtn: { backgroundColor: SECONDARY, borderRadius: 12,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  promoVerifyText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  promoSuccess: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#ecfdf5', borderRadius: 9, padding: 9, marginTop: 7 },
  promoSuccessText: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  summary: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginTop: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryTotal: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 },
  summaryLabel: { fontSize: 12, color: '#6b7280' },
  summaryVal: { fontSize: 13, color: '#111827', fontWeight: '600' },
  addBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 14, shadowColor: PRIMARY, shadowOpacity: 0.28,
    shadowRadius: 8, elevation: 4 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
