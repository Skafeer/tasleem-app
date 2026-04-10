import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from '../src/lib/toast';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCart();
    setRefreshing(false);
  };

  const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);

  const CartItem = ({ item }: { item: any }) => (
    <View style={s.cartItem}>
      <Image source={{ uri: item.imageUrl }} style={s.itemImage} />
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={s.itemPrice}>{item.sellingPrice.toLocaleString()} د.ع</Text>
        
        <View style={s.qtyBox}>
          <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.quantity - 1)}>
            <Ionicons name="remove" size={16} color="#6b7280" />
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
            <Ionicons name="add" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        <Text style={s.itemTotal}>الإجمالي: {(item.sellingPrice * item.quantity).toLocaleString()} د.ع</Text>
      </View>
      
      <TouchableOpacity onPress={() => removeItem(item.productId)} style={s.removeBtn}>
        <Ionicons name="close-circle" size={24} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const EmptyState = () => (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconBox}>
        <Ionicons name="cart-outline" size={50} color="#9ca3af" />
      </View>
      <Text style={s.emptyTitle}>السلة فارغة</Text>
      <Text style={s.emptyText}>أضف منتجات من الصفحة الرئيسية</Text>
      <TouchableOpacity style={s.shopBtn} onPress={() => router.push('/(tabs)')}>
        <Ionicons name="storefront-outline" size={16} color="#fff" />
        <Text style={s.shopBtnText}>تصفح المنتجات</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header (بدون تدرج) ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={22} color="#111827" />
        </TouchableOpacity>
        
        <Text style={s.headerTitle}>السلة ({cart.length})</Text>
        
        <TouchableOpacity 
          onPress={clearCart} 
          disabled={cart.length === 0} 
          style={[s.trashBtn, cart.length === 0 && s.trashBtnDisabled]}>
          <Ionicons 
            name="trash-outline" 
            size={20} 
            color={cart.length ? "#ef4444" : "#d1d5db"} 
          />
        </TouchableOpacity>
      </View>

      {cart.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={item => item.productId.toString()}
            contentContainerStyle={s.listContent}
            renderItem={({ item }) => <CartItem item={item} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
            }
            showsVerticalScrollIndicator={false}
          />

          {/* ── Footer (بدون تدرج) ── */}
          <View style={s.footer}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>المجموع</Text>
              <Text style={s.totalValue}>{subtotal.toLocaleString()} د.ع</Text>
            </View>
            
            <TouchableOpacity style={s.checkoutBtn} onPress={() => router.push('/checkout')}>
              <Text style={s.checkoutText}>متابعة الطلب</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header (موحد مع باقي الصفحات) ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashBtnDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },

  // ── List ──
  listContent: {
    padding: 16,
    paddingBottom: 140,
  },

  // ── Cart Item Card ──
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
    position: 'relative',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 4,
  },

  // ── Footer (بدون تدرج) ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 50,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  shopBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});