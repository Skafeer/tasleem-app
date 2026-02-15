import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const PROVINCES = [
  'بغداد','البصرة','نينوى','أربيل','النجف','كربلاء','ذي قار',
  'كركوك','بابل','الأنبار','سليمانية','دهوك','ديالى',
  'القادسية','ميسان','واسط','صلاح الدين','المثنى'
];

export default function CartScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [province, setProvince] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showProvinces, setShowProvinces] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const raw = await AsyncStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    },
  });

  const updateCart = async (newItems: any[]) => {
    await AsyncStorage.setItem('cart', JSON.stringify(newItems));
    queryClient.setQueryData(['cart'], newItems);
  };

  const removeItem = (productId: number) => {
    updateCart(items.filter((i: any) => i.product.id !== productId));
    toast.info('تم حذف المنتج من السلة');
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty < 1) { removeItem(productId); return; }
    updateCart(items.map((i: any) =>
      i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const deliveryFee = province.includes('البصرة') ? 3000 : province ? 5000 : 0;
  const totalWholesale = items.reduce((s: number, i: any) => s + Number(i.product.wholesalePrice) * i.quantity, 0);
  const totalSelling   = items.reduce((s: number, i: any) => s + Number(i.sellingPrice) * i.quantity, 0);
  const totalOrder     = totalSelling + deliveryFee;
  const totalProfit    = totalSelling - totalWholesale;
  const totalItems     = items.reduce((s: number, i: any) => s + i.quantity, 0);

  const createOrder = useMutation({
    mutationFn: async (data: any) => {
      console.log('Sending order:', JSON.stringify(data));
      const res = await api.post('/api/orders', data);
      return res.data;
    },
    onSuccess: () => {
      updateCart([]);
      toast.success('تم إرسال طلبك بنجاح وسيتم معالجته قريباً', 'تم استلام الطلب! 🎉');
      setTimeout(() => router.replace('/(tabs)/orders'), 1500);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'فشل إرسال الطلب';
      console.log('Order error:', JSON.stringify(e?.response?.data));
      toast.error(msg, 'خطأ في الطلب');
    },
  });

  const handleConfirm = () => {
    if (!province || !customerName || !customerPhone || !address) {
      toast.warning('يرجى ملء جميع الحقول المطلوبة', 'بيانات ناقصة');
      return;
    }
    const phoneRegex = /^07\d{9}$/;
    if (!phoneRegex.test(customerPhone)) {
      toast.error('يجب أن يبدأ رقم الهاتف بـ 07 ويتكون من 11 رقماً', 'رقم هاتف غير صالح');
      return;
    }

    const orderData = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      province: province.trim(),
      address: address.trim(),
      notes: backupPhone ? `رقم هاتف احتياطي: ${backupPhone}` : '',
      items: items.map((i: any) => ({
        productId: Number(i.product.id),
        quantity: Number(i.quantity),
        sellingPrice: Number(i.sellingPrice),
      })),
    };

    createOrder.mutate(orderData);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={s.title}>سلة التسوق</Text>
      </View>

      {items.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="cart-outline" size={64} color="#e5e7eb" />
          <Text style={s.emptyText}>سلة التسوق فارغة حالياً</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={s.browseBtnText}>تصفح المنتجات</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

          <View style={s.secHead}>
            <Ionicons name="bag-outline" size={20} color={PRIMARY} />
            <Text style={s.secTitle}>المنتجات المختارة</Text>
          </View>

          {items.map((item: any, idx: number) => (
            <View key={`${item.product.id}-${idx}`} style={s.productCard}>
              <Image source={{ uri: item.product.imageUrl }}
                style={s.productImg} resizeMode="cover" />
              <View style={s.productInfo}>
                <View style={s.productTop}>
                  <TouchableOpacity onPress={() => removeItem(item.product.id)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                  <Text style={s.productName} numberOfLines={2}>{item.product.name}</Text>
                </View>
                <View style={s.priceRow}>
                  <View>
                    <Text style={s.priceLabel}>سعر البيع:</Text>
                    <Text style={s.priceVal}>{Number(item.sellingPrice).toLocaleString()} د.ع</Text>
                  </View>
                  <View>
                    <Text style={s.priceLabel}>الربح للقطعة:</Text>
                    <Text style={s.profitVal}>
                      {(Number(item.sellingPrice) - Number(item.product.wholesalePrice)).toLocaleString()} د.ع
                    </Text>
                  </View>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn}
                    onPress={() => updateQty(item.product.id, item.quantity + 1)}>
                    <Ionicons name="add" size={16} color="#374151" />
                  </TouchableOpacity>
                  <Text style={s.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn}
                    onPress={() => updateQty(item.product.id, item.quantity - 1)}>
                    <Ionicons name="remove" size={16} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <View style={[s.secHead, { marginTop: 8 }]}>
            <Ionicons name="person-outline" size={20} color={PRIMARY} />
            <Text style={s.secTitle}>معلومات الزبون</Text>
          </View>

          <View style={s.formCard}>
            <Text style={s.label}>اسم الزبون <Text style={s.req}>*</Text></Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="الاسم الثلاثي للزبون"
                value={customerName} onChangeText={setCustomerName}
                textAlign="right" placeholderTextColor="#9ca3af" />
              <Ionicons name="person-outline" size={18} color="#9ca3af" />
            </View>

            <Text style={s.label}>رقم الهاتف <Text style={s.req}>*</Text></Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="07XXXXXXXXX"
                value={customerPhone} onChangeText={setCustomerPhone}
                keyboardType="phone-pad" placeholderTextColor="#9ca3af" />
              <Ionicons name="call-outline" size={18} color="#9ca3af" />
            </View>

            <Text style={s.label}>رقم هاتف احتياطي (اختياري)</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="07XXXXXXXXX"
                value={backupPhone} onChangeText={setBackupPhone}
                keyboardType="phone-pad" placeholderTextColor="#9ca3af" />
              <Ionicons name="call-outline" size={18} color="#9ca3af" />
            </View>

            <Text style={s.label}>المحافظة <Text style={s.req}>*</Text></Text>
            <TouchableOpacity style={s.inputWrap}
              onPress={() => setShowProvinces(!showProvinces)}>
              <Text style={[s.input, !province && { color: '#9ca3af' }]}>
                {province || 'اختر المحافظة'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>
            {showProvinces && (
              <View style={s.provinceList}>
                {PROVINCES.map(p => (
                  <TouchableOpacity key={p} style={s.provinceItem}
                    onPress={() => { setProvince(p); setShowProvinces(false); }}>
                    <Text style={s.provinceText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.label}>العنوان بالتفصيل <Text style={s.req}>*</Text></Text>
            <View style={[s.inputWrap, { height: 90, alignItems: 'flex-start', paddingTop: 10 }]}>
              <TextInput style={[s.input, { height: 70 }]}
                placeholder="المنطقة - رقم الزقاق - أقرب نقطة دالة"
                value={address} onChangeText={setAddress}
                multiline textAlign="right" placeholderTextColor="#9ca3af" />
              <Ionicons name="location-outline" size={18} color="#9ca3af" style={{ marginTop: 2 }} />
            </View>
          </View>

          <View style={[s.secHead, { marginTop: 8 }]}>
            <Ionicons name="car-outline" size={20} color={PRIMARY} />
            <Text style={s.secTitle}>ملخص الطلب</Text>
          </View>

          <View style={s.summaryCard}>
            <View style={s.sumRow}>
              <Text style={s.sumVal}>{totalItems} قطع</Text>
              <Text style={s.sumLabel}>عدد المنتجات</Text>
            </View>
            <View style={s.sumRow}>
              <Text style={s.sumVal}>{totalSelling.toLocaleString()} د.ع</Text>
              <Text style={s.sumLabel}>إجمالي سعر المنتجات</Text>
            </View>
            <View style={s.sumRow}>
              <Text style={[s.sumVal, { color: PRIMARY }]}>
                {deliveryFee > 0 ? `${deliveryFee.toLocaleString()} د.ع` : 'يحدد بعد اختيار المحافظة'}
              </Text>
              <Text style={s.sumLabel}>أجور التوصيل</Text>
            </View>
            <View style={s.divider} />
            <View style={s.sumRow}>
              <Text style={[s.sumVal, { color: PRIMARY, fontSize: 20 }]}>
                {totalOrder.toLocaleString()} د.ع
              </Text>
              <Text style={[s.sumLabel, { fontWeight: 'bold', color: '#111827', fontSize: 15 }]}>
                المبلغ الكلي
              </Text>
            </View>
            <View style={s.profitBox}>
              <Text style={s.profitBoxVal}>{totalProfit.toLocaleString()} د.ع</Text>
              <Text style={s.profitBoxLabel}>صافي ربحك من هذا الطلب:</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.confirmBtn,
              (!province || !customerName || !customerPhone || !address || createOrder.isPending)
              && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={!province || !customerName || !customerPhone || !address || createOrder.isPending}>
            {createOrder.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.confirmText}>تأكيد الطلب الآن</Text>
            }
          </TouchableOpacity>
          <Text style={s.hint}>عند النقر على تأكيد، سيتم إرسال الطلب للمعالجة مباشرة</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 15, color: '#9ca3af', fontWeight: '500' },
  browseBtn: { backgroundColor: PRIMARY, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  secHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
  secTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  productCard: { backgroundColor: '#fff', borderRadius: 20, padding: 14,
    flexDirection: 'row-reverse', gap: 12, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  productImg: { width: 90, height: 90, borderRadius: 14 },
  productInfo: { flex: 1 },
  productTop: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#111827',
    flex: 1, textAlign: 'right' },
  deleteBtn: { width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  priceRow: { flexDirection: 'row-reverse', gap: 16, marginBottom: 10 },
  priceLabel: { fontSize: 10, color: '#9ca3af', textAlign: 'right' },
  priceVal: { fontSize: 13, fontWeight: 'bold', color: PRIMARY, textAlign: 'right' },
  profitVal: { fontSize: 13, fontWeight: 'bold', color: '#16a34a', textAlign: 'right' },
  qtyRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1,
    borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 15, fontWeight: 'bold', color: '#111827',
    minWidth: 24, textAlign: 'center' },
  formCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151',
    textAlign: 'right', marginBottom: 6, marginTop: 10 },
  req: { color: '#ef4444' },
  inputWrap: { flexDirection: 'row-reverse', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, height: 46, backgroundColor: '#f9fafb' },
  input: { flex: 1, fontSize: 14, color: '#111827', paddingRight: 8 },
  provinceList: { backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb', marginTop: 4, marginBottom: 8, maxHeight: 200 },
  provinceItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  provinceText: { fontSize: 14, color: '#374151', textAlign: 'right' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 16 },
  sumRow: { flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  sumLabel: { fontSize: 13, color: '#6b7280' },
  sumVal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 20 },
  profitBox: { flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#f0fdf4',
    margin: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  profitBoxLabel: { fontSize: 12, color: '#16a34a', fontWeight: 'bold' },
  profitBoxVal: { fontSize: 15, fontWeight: 'bold', color: '#15803d' },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 18, height: 56,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  hint: { textAlign: 'center', fontSize: 11, color: '#9ca3af', marginBottom: 8 },
});
