import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);

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
    toast.success('تم الحذف من السلة');
  };

  const clearCart = async () => {
    setCart([]);
    await AsyncStorage.removeItem('cart');
    toast.success('تم تفريغ السلة');
  };

  const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>السلة ({cart.length})</Text>
        <TouchableOpacity onPress={clearCart} disabled={cart.length === 0}>
          <Ionicons name="trash-outline" size={22} color={cart.length ? "#ef4444" : "#d1d5db"} />
        </TouchableOpacity>
      </View>

      {cart.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="cart-outline" size={80} color="#d1d5db" />
          <Text style={s.emptyText}>السلة فارغة</Text>
          <TouchableOpacity style={s.shopBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={s.shopBtnText}>تصفح المنتجات</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={i => i.productId.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            renderItem={({ item }) => (
              <View style={s.cartItem}>
                <TouchableOpacity onPress={() => removeItem(item.productId)} style={s.removeBtn}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
                <View style={s.itemInfo}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.itemPrice}>{item.sellingPrice.toLocaleString()} د.ع</Text>
                  <View style={s.qtyBox}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.quantity - 1)}>
                      <Ionicons name="remove" size={18} color="#6b7280" />
                    </TouchableOpacity>
                    <Text style={s.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={async () => {
                      try {
                        const { data: product } = await require('../src/lib/api').default.get(`/api/products/${item.productId}`);
                        if (item.quantity < product.stock) {
                          updateQty(item.productId, item.quantity + 1);
                        } else {
                          toast.warning(`المخزون المتوفر: ${product.stock}`);
                        }
                      } catch (e) { toast.error('فشل التحقق من المخزون'); }
                    }}>
                      <Ionicons name="add" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.itemTotal}>{(item.sellingPrice * item.quantity).toLocaleString()} د.ع</Text>
                </View>
              </View>
            )}
          />

          <View style={s.footer}>
            <View style={s.totalRow}>
              <Text style={s.totalValue}>{subtotal.toLocaleString()} د.ع</Text>
              <Text style={s.totalLabel}>المجموع الفرعي</Text>
            </View>
            <TouchableOpacity style={s.checkoutBtn} onPress={() => router.push('/checkout')}>
              <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.checkoutGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.checkoutText}>متابعة إلى الطلب</Text>
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
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, color: '#9ca3af', marginTop: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  shopBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cartItem: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  removeBtn: { padding: 4 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6, textAlign: 'right' },
  itemPrice: { fontSize: 14, color: '#6b7280', marginBottom: 8, textAlign: 'right' },
  qtyBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 16, fontWeight: '600', color: '#111827', minWidth: 30, textAlign: 'center' },
  itemTotal: { fontSize: 16, fontWeight: 'bold', color: PRIMARY, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  checkoutBtn: { borderRadius: 14, overflow: 'hidden' },
  checkoutGrad: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52 },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
