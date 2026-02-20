import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';
import { useCart } from '../src/lib/cart';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function CartScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { cart, removeFromCart, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const verifyPromo = useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/api/promo-codes/verify', { code });
      return data;
    },
    onSuccess: (data) => {
      setPromoDiscount(data.discountPercent);
      toast.success(`تم تطبيق الخصم ${data.discountPercent}%`);
    },
    onError: () => toast.error('كود خصم غير صحيح'),
  });

  const checkStock = () => {
    for (const item of cart) {
      if (item.quantity > item.stock) {
        toast.error(`المنتج "${item.name}" متوفر فقط ${item.stock} قطعة`);
        return false;
      }
      if (item.stock === 0) {
        toast.error(`المنتج "${item.name}" غير متوفر حالياً`);
        return false;
      }
    }
    return true;
  };

  const submitOrder = useMutation({
    mutationFn: async (orderData: any) => {
      const { data } = await api.post('/api/orders', orderData);
      return data;
    },
    onSuccess: () => {
      toast.success('تم إرسال الطلب بنجاح!');
      clearCart();
      qc.invalidateQueries({ queryKey: ['user'] });
      router.replace('/(tabs)/orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الطلب'),
  });

  const handleSubmit = () => {
    if (cart.length === 0) { toast.warning('السلة فارغة'); return; }
    if (!customerName.trim()) { toast.warning('يرجى إدخال اسم الزبون'); return; }
    
    if (!checkStock()) return;
    
    if (!customerPhone.trim() || !customerPhone.startsWith('07') || customerPhone.length !== 11) {
      toast.warning('رقم الهاتف يجب أن يبدأ بـ 07 ويكون 11 رقم');
      return;
    }
    if (!province.trim()) { toast.warning('يرجى إدخال المحافظة'); return; }
    if (!address.trim()) { toast.warning('يرجى إدخال العنوان'); return; }

    const items = cart.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
    }));

    submitOrder.mutate({
      items, customerName, customerPhone, province, address, notes,
      promoCode: promoDiscount > 0 ? promoCode : '',
    });
  };

  const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const discount = (subtotal * promoDiscount) / 100;
  const isBasra = province.includes('البصرة');
  const shipping = isBasra ? 3000 : 5000;
  const total = subtotal + shipping - discount;

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {cart.map((item, idx) => (
          <View key={idx} style={s.cartItem}>
            <View style={s.itemInfo}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemPrice}>{item.sellingPrice.toLocaleString()} د.ع × {item.quantity}</Text>
              <Text style={s.itemTotal}>{(item.sellingPrice * item.quantity).toLocaleString()} د.ع</Text>
            </View>
            <TouchableOpacity onPress={() => removeFromCart(item.productId)} style={s.removeBtn}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        {cart.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="cart-outline" size={64} color="#d1d5db" />
            <Text style={s.emptyText}>السلة فارغة</Text>
          </View>
        )}

        {cart.length > 0 && (
          <>
            <Text style={s.sectionTitle}>معلومات الزبون</Text>
            <TextInput style={s.input} placeholder="اسم الزبون *" value={customerName}
              onChangeText={setCustomerName} textAlign="right" placeholderTextColor="#9ca3af" />
            <TextInput style={s.input} placeholder="رقم الهاتف (07xxxxxxxxx) *"
              value={customerPhone} onChangeText={v => {
                if (v.length <= 11 && /^[0-9]*$/.test(v)) setCustomerPhone(v);
              }} keyboardType="phone-pad" maxLength={11}
              textAlign="right" placeholderTextColor="#9ca3af" />
            <TextInput style={s.input} placeholder="المحافظة *" value={province}
              onChangeText={setProvince} textAlign="right" placeholderTextColor="#9ca3af" />
            <TextInput style={s.input} placeholder="العنوان التفصيلي *" value={address}
              onChangeText={setAddress} textAlign="right" placeholderTextColor="#9ca3af" />
            <TextInput style={[s.input, { height: 80 }]} placeholder="ملاحظات (اختياري)"
              value={notes} onChangeText={setNotes} multiline
              textAlign="right" placeholderTextColor="#9ca3af" />

            <Text style={s.sectionTitle}>كود الخصم</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={s.promoBtn} onPress={() => verifyPromo.mutate(promoCode)}
                disabled={!promoCode.trim() || verifyPromo.isPending}>
                {verifyPromo.isPending ? <ActivityIndicator color="#fff" /> :
                  <Text style={s.promoBtnText}>تطبيق</Text>}
              </TouchableOpacity>
              <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="أدخل كود الخصم" value={promoCode}
                onChangeText={v => setPromoCode(v.toUpperCase())}
                textAlign="right" placeholderTextColor="#9ca3af" />
            </View>

            <View style={s.summary}>
              <View style={s.summaryRow}>
                <Text style={s.summaryVal}>{subtotal.toLocaleString()} د.ع</Text>
                <Text style={s.summaryLabel}>المجموع الفرعي</Text>
              </View>
              {promoDiscount > 0 && (
                <View style={s.summaryRow}>
                  <Text style={[s.summaryVal, { color: '#10b981' }]}>-{discount.toLocaleString()} د.ع</Text>
                  <Text style={s.summaryLabel}>الخصم ({promoDiscount}%)</Text>
                </View>
              )}
              <View style={s.summaryRow}>
                <Text style={s.summaryVal}>{shipping.toLocaleString()} د.ع</Text>
                <Text style={s.summaryLabel}>التوصيل</Text>
              </View>
              <View style={[s.summaryRow, { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
                <Text style={[s.summaryVal, { fontSize: 18, color: PRIMARY }]}>{total.toLocaleString()} د.ع</Text>
                <Text style={[s.summaryLabel, { fontWeight: 'bold' }]}>المجموع الكلي</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View style={s.footer}>
          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitOrder.isPending}>
            <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {submitOrder.isPending ? <ActivityIndicator color="#fff" /> :
                <><Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={s.submitText}>إرسال الطلب</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  cartItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemPrice: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  itemTotal: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  removeBtn: { padding: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginTop: 16, marginBottom: 10 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#fff', marginBottom: 10 },
  promoBtn: { backgroundColor: SECONDARY, borderRadius: 12, paddingHorizontal: 20,
    justifyContent: 'center', alignItems: 'center' },
  promoBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  summary: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryVal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  submitBtn: { borderRadius: 14, overflow: 'hidden' },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
