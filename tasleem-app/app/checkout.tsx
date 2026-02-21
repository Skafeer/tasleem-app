import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function CheckoutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    try {
      const data = await AsyncStorage.getItem('cart');
      setCart(data ? JSON.parse(data) : []);
    } catch (e) { router.back(); }
  };

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

  const checkStock = async () => {
    try {
      for (const item of cart) {
        const { data: product } = await api.get(`/api/products/${item.productId}`);
        if (item.quantity > product.stock) {
          toast.error(`المنتج "${item.name}" متوفر فقط ${product.stock} قطعة`);
          return false;
        }
        if (product.stock === 0) {
          toast.error(`المنتج "${item.name}" غير متوفر حالياً`);
          return false;
        }
      }
      return true;
    } catch (e) {
      toast.error('فشل التحقق من المخزون');
      return false;
    }
  };

  const submitOrder = useMutation({
    mutationFn: async (orderData: any) => {
      const { data } = await api.post('/api/orders', orderData);
      return data;
    },
    onSuccess: async () => {
      toast.success('تم إرسال الطلب بنجاح!');
      await AsyncStorage.removeItem('cart');
      qc.invalidateQueries({ queryKey: ['user'] });
      router.replace('/(tabs)/orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الطلب'),
  });

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.warning('السلة فارغة'); return; }
    if (!customerName.trim()) { toast.warning('يرجى إدخال اسم الزبون'); return; }
    if (!(await checkStock())) return;
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
        <Text style={s.headerTitle}>إتمام الطلب</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
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
            <Text style={[s.summaryVal, { fontSize: 20, color: PRIMARY }]}>{total.toLocaleString()} د.ع</Text>
            <Text style={[s.summaryLabel, { fontWeight: 'bold' }]}>المجموع الكلي</Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitOrder.isPending}>
          <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {submitOrder.isPending ? <ActivityIndicator color="#fff" /> :
              <><Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={s.submitText}>إرسال الطلب</Text></>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
