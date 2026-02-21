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
  const seed = id * 12345 + 67890;
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
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await api.get(`/api/products/${id}`); return data; },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}>
          <Text style={s.errorText}>المنتج غير موجود</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getImages = (p: any) => {
    if (p.images && p.images.trim()) {
      return p.images.split(',').map((u: string) => u.trim()).filter(Boolean);
    }
    return p.imageUrl ? [p.imageUrl] : [];
  };

  const images = getImages(product);
  const discountedPrice = product.discount > 0
    ? product.wholesalePrice * (1 - product.discount / 100)
    : product.wholesalePrice;
  const profit = sellingPrice ? Number(sellingPrice) - discountedPrice : 0;

  const handleAddToCart = async () => {
    if (!sellingPrice || Number(sellingPrice) < product.sellingPriceMin) {
      toast.warning(`السعر يجب أن يكون ${Math.round(product.sellingPriceMin).toLocaleString()} د.ع أو أكثر`);
      return;
    }
    try {
      const cartData = await AsyncStorage.getItem('cart');
      const cart = cartData ? JSON.parse(cartData) : [];
      const existing = cart.findIndex((i: any) => i.productId === product.id);
      if (existing >= 0) {
        cart[existing].quantity += Number(quantity);
        cart[existing].sellingPrice = Number(sellingPrice);
      } else {
        cart.push({
          productId: product.id, name: product.name,
          imageUrl: images[0] || '',
          wholesalePrice: discountedPrice,
          sellingPrice: Number(sellingPrice),
          quantity: Number(quantity),
          stock: product.stock,
        });
      }
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      toast.success('تمت الإضافة إلى السلة ✅');
      setTimeout(() => router.push('/cart'), 100);
      setShowCart(false);
      setSellingPrice(''); setQuantity('1');
    } catch { toast.error('فشل الإضافة إلى السلة'); }
  };

  const copyText = (text: string) => {
    Clipboard.setString(text);
    toast.success('تم النسخ ✅');
  };

  const openLink = (url: string) => {
    if (url.trim()) Linking.openURL(url);
  };

  const adLinks = product.adLinks ? product.adLinks.split(',').map((l: string) => l.trim()).filter(Boolean) : [];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {images.length > 0 && (
          <View>
            <FlatList
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentIndex(idx);
              }}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={[s.image, { width }]} resizeMode="cover" />
              )}
            />
            {images.length > 1 && (
              <View style={s.dots}>
                {images.map((_, idx) => (
                  <View key={idx} style={[s.dot, currentIndex === idx && s.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={s.content}>
          <Text style={s.name}>{product.name}</Text>
          <Text style={s.productCode}>🏷️ #{generateProductCode(product.id)}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>{product.category}</Text>
          </View>

          {product.description && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>📝 الوصف</Text>
              <Text style={s.desc}>{product.description}</Text>
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionTitle}>💰 الأسعار</Text>
            <View style={s.priceBox}>
              <View style={s.priceRow}>
                <Text style={s.priceVal}>{Math.round(product.wholesalePrice).toLocaleString()} د.ع</Text>
                <Text style={s.priceLabel}>سعر الجملة</Text>
              </View>
              {product.discount > 0 && (
                <View style={s.priceRow}>
                  <Text style={[s.priceVal, { color: '#10b981' }]}>{Math.round(discountedPrice).toLocaleString()} د.ع</Text>
                  <Text style={s.priceLabel}>بعد الخصم ({product.discount}%)</Text>
                </View>
              )}
              <View style={s.priceRow}>
                <Text style={[s.priceVal, { color: SECONDARY }]}>{Math.round(product.sellingPriceMin).toLocaleString()} د.ع</Text>
                <Text style={s.priceLabel}>أدنى سعر بيع</Text>
              </View>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>📦 المخزون</Text>
            <Text style={s.stock}>{product.stock} قطعة متوفرة</Text>
          </View>

          {adLinks.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🔗 روابط إعلانية</Text>
              {adLinks.map((link: string, idx: number) => (
                <View key={idx} style={s.linkBox}>
                  <TouchableOpacity style={s.linkBtn} onPress={() => openLink(link)}>
                    <Ionicons name="open-outline" size={18} color={PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.linkBtn} onPress={() => copyText(link)}>
                    <Ionicons name="copy-outline" size={18} color={PRIMARY} />
                  </TouchableOpacity>
                  <Text style={s.linkText} numberOfLines={1}>{link}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={s.floatBtn} onPress={() => setShowCart(true)}>
        <Ionicons name="cart" size={20} color="#fff" />
        <Text style={s.floatBtnText}>إضافة إلى السلة</Text>
      </TouchableOpacity>

      <Modal visible={showCart} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>تحديد السعر والكمية</Text>
            </View>

            <Text style={s.modalLabel}>سعر البيع (د.ع) *</Text>
            <TextInput style={s.modalInput}
              placeholder={`⚠️ الحد الأدنى: ${Math.round(product.sellingPriceMin).toLocaleString()} د.ع`}
              value={sellingPrice} onChangeText={setSellingPrice}
              keyboardType="number-pad" textAlign="right" placeholderTextColor="#9ca3af" />

            <Text style={s.modalLabel}>الكمية</Text>
            <View style={s.qtyBox}>
              <TouchableOpacity style={s.qtyBtn}
                onPress={() => setQuantity(q => String(Math.max(1, Number(q) - 1)))}>
                <Ionicons name="remove" size={20} color="#6b7280" />
              </TouchableOpacity>
              <TextInput style={s.qtyInput} value={quantity}
                onChangeText={v => /^\d*$/.test(v) && setQuantity(v || '1')}
                keyboardType="number-pad" textAlign="center" />
              <TouchableOpacity style={s.qtyBtn}
                onPress={() => {
                  const newQty = Number(quantity) + 1;
                  if (newQty <= product.stock) {
                    setQuantity(String(newQty));
                  } else {
                    toast.warning(`المخزون المتوفر: ${product.stock}`);
                  }
                }}>
                <Ionicons name="add" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {sellingPrice && (
              <View style={s.summary}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryVal}>{Math.round(discountedPrice).toLocaleString()} د.ع</Text>
                  <Text style={s.summaryLabel}>سعر الجملة</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={[s.summaryVal, { color: profit > 0 ? '#10b981' : '#ef4444' }]}>
                    {Math.round(profit).toLocaleString()} د.ع
                  </Text>
                  <Text style={s.summaryLabel}>صافي الربح</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={s.addBtn} onPress={handleAddToCart}>
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#9ca3af' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827',
    textAlign: 'center', marginHorizontal: 10 },
  image: { height: 300, backgroundColor: '#f3f4f6' },
  dots: { position: 'absolute', bottom: 16, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 24 },
  content: { padding: 16, paddingBottom: 100 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 4 },
  productCode: { fontSize: 13, color: '#6b7280', marginTop: 4, fontWeight: '600',
    letterSpacing: 1, textAlign: 'right', marginBottom: 8 },
  badge: { alignSelf: 'flex-end', backgroundColor: '#dbeafe', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16 },
  badgeText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 10 },
  desc: { fontSize: 14, color: '#6b7280', lineHeight: 22, textAlign: 'right' },
  priceBox: { backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, gap: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: '#6b7280' },
  priceVal: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  stock: { fontSize: 15, color: '#10b981', fontWeight: '600', textAlign: 'right' },
  linkBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  linkText: { flex: 1, fontSize: 13, color: '#374151', textAlign: 'right' },
  linkBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  floatBtn: { position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: PRIMARY, borderRadius: 14, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8, height: 52,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  floatBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalLabel: { fontSize: 13, color: '#374151', textAlign: 'right',
    marginBottom: 8, marginTop: 12, fontWeight: '600' },
  modalInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  qtyBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  qtyInput: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 10, fontSize: 16, fontWeight: '600', color: '#111827' },
  summary: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginTop: 16, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryVal: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  addBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
