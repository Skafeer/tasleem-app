import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { toast } from '../src/lib/toast';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    try {
      const data = await AsyncStorage.getItem('cart');
      setCart(data ? JSON.parse(data) : []);
    } catch (e) { console.error(e); }
  };

  const updateQty = async (productId: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = cart.map(i => i.productId === productId ? { ...i, quantity: newQty } : i);
    setCart(updated);
    await AsyncStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = async (productId: number) => {
    const updated = cart.filter(i => i.productId !== productId);
    setCart(updated);
    await AsyncStorage.setItem('cart', JSON.stringify(updated));
    toast.success('تم الحذف');
  };

  const clearCart = async () => {
    setCart([]);
    await AsyncStorage.removeItem('cart');
    toast.success('تم تفريغ السلة');
  };

  const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <LinearGradient colors={['#0c6679', '#0a8a9f']} style={s.header}>
        <TouchableOpacity onPress={clearCart} disabled={cart.length === 0} style={s.trashBtn}>
          <Ionicons name="trash-outline" size={20} color={cart.length ? "#fca5a5" : "rgba(255,255,255,0.3)"} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>السلة ({cart.length})</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {cart.length === 0 ? (
        <View style={s.emptyBox}>
          <View style={s.emptyIconBox}>
            <Ionicons name="cart-outline" size={48} color="#9ca3af" />
          </View>
          <Text style={s.emptyTitle}>السلة فارغة</Text>
          <Text style={s.emptySubText}>أضف منتجات من الصفحة الرئيسية</Text>
          <TouchableOpacity style={s.shopBtn} onPress={() => router.push('/(tabs)')}>
            <Ionicons name="storefront-outline" size={16} color="#fff" />
            <Text style={s.shopBtnText}>تصفح المنتجات</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={i => i.productId.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
            onRefresh={() => { setRefreshing(true); loadCart().finally(() => setRefreshing(false)); }}
            refreshing={refreshing}
            renderItem={({ item }) => (
              <View style={s.cartItem}>
                <Image source={{ uri: item.imageUrl }} style={s.itemImage} />
                <View style={s.itemInfo}>
                  <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.itemPrice}>{item.sellingPrice.toLocaleString()} د.ع</Text>
                  <View style={s.qtyBox}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.quantity - 1)}>
                      <Ionicons name="remove" size={18} color="#6b7280" />
                    </TouchableOpacity>
                    <Text style={s.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={async () => {
                      try {
                        const { data: product } = await api.get(`/api/products/${item.productId}`);
                        if (item.quantity < product.stock) {
                          updateQty(item.productId, item.quantity + 1);
                        } else {
                          toast.warning(`المخزون المتوفر: ${product.stock}`);
                        }
                      } catch (e) { toast.error('فشل التحقق'); }
                    }}>
                      <Ionicons name="add" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.itemTotal}>الإجمالي: {(item.sellingPrice * item.quantity).toLocaleString()} د.ع</Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.productId)} style={s.removeBtn}>
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={s.footer}>
            <View style={s.totalRow}>
              <Text style={s.totalValue}>{subtotal.toLocaleString()} د.ع</Text>
              <Text style={s.totalLabel}>المجموع</Text>
            </View>
            <TouchableOpacity style={s.checkoutBtn} onPress={() => router.push('/checkout')}>
              <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.checkoutGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.checkoutText}>متابعة الطلب</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center' },
  trashBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyIconBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
  emptySubText: { fontSize: 13, color: '#9ca3af' },
  shopBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  shopBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cartItem: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    flexDirection: 'row-reverse', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  itemImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f3f4f6' },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6, textAlign: 'right' },
  itemPrice: { fontSize: 14, color: PRIMARY, fontWeight: '600', marginBottom: 8, textAlign: 'right' },
  qtyBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 15, fontWeight: '600', color: '#111827', minWidth: 25, textAlign: 'center' },
  itemTotal: { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  removeBtn: { position: 'absolute', top: 10, left: 10 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 6 },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  checkoutBtn: { borderRadius: 14, overflow: 'hidden' },
  checkoutGrad: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54 },
  checkoutText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
