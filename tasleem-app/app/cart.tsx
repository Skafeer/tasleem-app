import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Image, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
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
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
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
    updateCart(items.filter((i: any) => i.productId !== productId));
    toast.info('تم حذف المنتج من السلة');
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty < 1) { removeItem(productId); return; }
    updateCart(items.map((i: any) =>
      i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const deliveryFee = province.includes('البصرة') ? 3000 : province ? 5000 : 0;
  const totalWholesale = items.reduce((s: number, i: any) => s + Number(i.wholesalePrice) * i.quantity, 0);
  const totalSelling   = items.reduce((s: number, i: any) => s + Number(i.sellingPrice) * i.quantity, 0);
  const totalOrder     = totalSelling + deliveryFee;
  const totalProfit    = totalSelling - totalWholesale;
  const totalItems     = items.reduce((s: number, i: any) => s + i.quantity, 0);

  const createOrder = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/orders', data);
      return res.data;
    },
    onSuccess: async () => {
      await updateCart([]);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('تم إرسال طلبك بنجاح! 🎉');
      router.replace('/(tabs)/orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الطلب'),
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
  const handleSubmit = () => {
    if (items.length === 0) { toast.warning('السلة فارغة'); return; }
    if (!customerName.trim()) { toast.warning('يرجى إدخال اسم الزبون'); return; }
    if (!checkStock()) return;
    if (!checkStock()) return;
    
    if (!customerPhone.trim() || !customerPhone.startsWith('07') || customerPhone.length !== 11) {
      toast.warning('رقم الهاتف يجب أن يبدأ بـ 07 ويكون 11 رقم'); return;
    }
    if (!province) { toast.warning('يرجى اختيار المحافظة'); return; }
    if (!address.trim()) { toast.warning('يرجى إدخال العنوان'); return; }

    createOrder.mutate({
      customerName, customerPhone, province, address, notes,
      items: items.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        sellingPrice: i.sellingPrice,
      })),
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>سلة التسوق</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={() => updateCart([])} style={s.clearBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="cart-outline" size={80} color="#d1d5db" />
          <Text style={s.emptyTitle}>السلة فارغة</Text>
          <Text style={s.emptyText}>أضف منتجات من الصفحة الرئيسية</Text>
          <TouchableOpacity style={s.shopBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={s.shopBtnText}>تصفح المنتجات</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 12 }}>

          {/* Cart Items */}
          {items.map((item: any) => (
            <View key={item.productId} style={s.itemCard}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={s.itemImg} resizeMode="cover" />
                : <View style={[s.itemImg, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={24} color="#d1d5db" />
                  </View>
              }
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
                <View style={s.itemPrices}>
                  <Text style={s.itemProfit}>
                    ربح: {((item.sellingPrice - item.wholesalePrice) * item.quantity).toLocaleString()} د.ع
                  </Text>
                  <Text style={s.itemPrice}>{item.sellingPrice?.toLocaleString()} د.ع</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.quantity - 1)}>
                    <Ionicons name="remove" size={16} color={PRIMARY} />
                  </TouchableOpacity>
                  <Text style={s.qtyVal}>{item.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.quantity + 1)}>
                    <Ionicons name="add" size={16} color={PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={() => removeItem(item.productId)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {/* Summary */}
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>ملخص الطلب</Text>
            {[
              { label: 'عدد المنتجات', value: `${totalItems} قطعة` },
              { label: 'إجمالي سعر المنتجات', value: `${totalSelling.toLocaleString()} د.ع` },
              { label: 'أجور التوصيل', value: `${deliveryFee.toLocaleString()} د.ع`, color: SECONDARY },
              { label: 'المبلغ الكلي', value: `${totalOrder.toLocaleString()} د.ع`, bold: true, color: PRIMARY },
            ].map((row, i) => (
              <View key={i} style={s.summaryRow}>
                <Text style={[s.summaryVal, row.bold && { fontWeight: 'bold', fontSize: 16 },
                  row.color && { color: row.color }]}>{row.value}</Text>
                <Text style={s.summaryLabel}>{row.label}</Text>
              </View>
            ))}
            <View style={[s.summaryRow, s.profitRow]}>
              <Text style={s.profitVal}>صافي ربحك من هذا الطلب: {totalProfit.toLocaleString()} د.ع</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={s.formCard}>
            <Text style={s.formTitle}>بيانات الزبون</Text>

            <Text style={s.label}>اسم الزبون *</Text>
            <TextInput style={s.input} placeholder="الاسم الكامل"
              value={customerName} onChangeText={setCustomerName}
              textAlign="right" placeholderTextColor="#9ca3af" />

            <Text style={s.label}>رقم الهاتف * (07xxxxxxxxx)</Text>
            <TextInput style={s.input} placeholder="07xxxxxxxxx"
              value={customerPhone}
              onChangeText={(v) => {
                if (v.length <= 11 && /^[0-9]*$/.test(v)) setCustomerPhone(v);
              }}
              maxLength={11}
              keyboardType="phone-pad" textAlign="right" placeholderTextColor="#9ca3af" />

            <Text style={s.label}>المحافظة *</Text>
            <TouchableOpacity style={s.provincePicker}
              onPress={() => setShowProvinces(!showProvinces)}>
              <Ionicons name={showProvinces ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
              <Text style={[s.provinceText, !province && { color: '#9ca3af' }]}>
                {province || 'اختر المحافظة'}
              </Text>
            </TouchableOpacity>
            {showProvinces && (
              <View style={s.provinceList}>
                {PROVINCES.map(p => (
                  <TouchableOpacity key={p} style={[s.provinceItem, province === p && s.provinceItemActive]}
                    onPress={() => { setProvince(p); setShowProvinces(false); }}>
                    <Text style={[s.provinceItemText, province === p && { color: PRIMARY, fontWeight: 'bold' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.label}>العنوان التفصيلي *</Text>
            <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="الحي، الشارع، المنزل..."
              value={address} onChangeText={setAddress}
              multiline textAlign="right" placeholderTextColor="#9ca3af" />

            <Text style={s.label}>ملاحظات (اختياري)</Text>
            <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="أي ملاحظات إضافية..."
              value={notes} onChangeText={setNotes}
              multiline textAlign="right" placeholderTextColor="#9ca3af" />
          </View>

          <TouchableOpacity style={[s.submitBtn, createOrder.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit} disabled={createOrder.isPending}>
            {createOrder.isPending
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                  <Text style={s.submitText}>تأكيد الطلب الآن</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
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
  clearBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef2f2',
    justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151' },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  shopBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  shopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12,
    flexDirection: 'row-reverse', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  itemImg: { width: 80, height: 80, borderRadius: 12 },
  itemInfo: { flex: 1, gap: 5 },
  itemName: { fontSize: 13, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  itemPrices: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  itemProfit: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center' },
  qtyVal: { fontSize: 16, fontWeight: 'bold', color: '#111827', minWidth: 24, textAlign: 'center' },
  delBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fef2f2',
    justifyContent: 'center', alignItems: 'center', marginRight: 'auto' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  summaryTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryVal: { fontSize: 14, color: '#111827', fontWeight: '500' },
  profitRow: { backgroundColor: '#ecfdf5', borderRadius: 10, padding: 10, marginTop: 6 },
  profitVal: { fontSize: 13, color: '#10b981', fontWeight: 'bold', textAlign: 'center', flex: 1 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  formTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 12 },
  label: { fontSize: 12, color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 10, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  provincePicker: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f9fafb' },
  provinceText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  provinceList: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    marginTop: 4, maxHeight: 200, overflow: 'hidden' },
  provinceItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  provinceItemActive: { backgroundColor: PRIMARY + '10' },
  provinceItemText: { fontSize: 14, color: '#374151', textAlign: 'right' },
  submitBtn: { backgroundColor: PRIMARY, borderRadius: 16, height: 54,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
