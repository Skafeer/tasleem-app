import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
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

const PROVINCES = [
  'بغداد', 'البصرة', 'نينوى', 'الأنبار', 'كربلاء', 'النجف', 
  'ذي قار', 'القادسية', 'بابل', 'ديالى', 'ميسان', 'واسط',
  'صلاح الدين', 'المثنى', 'كركوك', 'دهوك', 'أربيل', 'السليمانية'
];

export default function CheckoutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [province, setProvince] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [showProvinces, setShowProvinces] = useState(false);

  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    try {
      const data = await AsyncStorage.getItem('cart');
      const parsed = data ? JSON.parse(data) : [];
      if (parsed.length === 0) {
        toast.warning('السلة فارغة');
        router.back();
      }
      setCart(parsed);
    } catch (e) { router.back(); }
  };

  const verifyPromo = useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/api/promo-codes/verify', { code });
      return data;
    },
    onSuccess: (data) => {
      setPromoDiscount(data.discountPercent);
      toast.success(`تم تطبيق خصم ${data.discountPercent}%`);
    },
    onError: () => { toast.error('كود خصم غير صحيح'); setPromoDiscount(0); },
  });

  const checkStock = async () => {
    try {
      for (const item of cart) {
        const { data: product } = await api.get(`/api/products/${item.productId}`);
        if (item.quantity > product.stock) {
          toast.error(`"${item.name}" متوفر فقط ${product.stock} قطعة`);
          return false;
        }
        if (product.stock === 0) {
          toast.error(`"${item.name}" غير متوفر`);
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
      toast.success('تم إرسال الطلب بنجاح! 🎉');
      await AsyncStorage.removeItem('cart');
      qc.invalidateQueries({ queryKey: ['user'] });
      router.replace('/(tabs)/orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الطلب'),
  });

  const handleSubmit = async () => {
    if (!customerName.trim()) { toast.warning('يرجى إدخال اسم الزبون'); return; }
    if (!customerPhone.trim() || !customerPhone.startsWith('07') || customerPhone.length !== 11) {
      toast.warning('رقم الهاتف يجب أن يبدأ بـ 07 ويكون 11 رقم');
      return;
    }
    if (backupPhone && (!backupPhone.startsWith('07') || backupPhone.length !== 11)) {
      toast.warning('رقم الاحتياطي يجب أن يبدأ بـ 07 ويكون 11 رقم');
      return;
    }
    if (!province.trim()) { toast.warning('يرجى اختيار المحافظة'); return; }
    if (!area.trim()) { toast.warning('يرجى إدخال المنطقة'); return; }
    if (!address.trim()) { toast.warning('يرجى إدخال العنوان التفصيلي'); return; }
    if (!(await checkStock())) return;

    const items = cart.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
    }));

    const fullAddress = `${province} - ${area} - ${address}`;
    const phoneDetails = backupPhone ? `${customerPhone} (احتياطي: ${backupPhone})` : customerPhone;

    submitOrder.mutate({
      items,
      customerName,
      customerPhone: phoneDetails,
      province,
      address: fullAddress,
      notes: notes || '',
      promoCode: promoDiscount > 0 ? promoCode : '',
    });
  };

  const subtotal = cart.reduce((s, i) => s + i.wholesalePrice * i.quantity, 0);
  const discount = (subtotal * promoDiscount) / 100;
  const shipping = province === 'البصرة' ? 3000 : 5000;
  const total = subtotal - discount + shipping;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>إتمام الطلب</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Ionicons name="person-outline" size={20} color={PRIMARY} />
          <Text style={s.sectionTitle}>معلومات الزبون</Text>
        </View>
        
        <Text style={s.label}>اسم الزبون *</Text>
        <TextInput style={s.input} placeholder="أدخل الاسم الكامل"
          value={customerName} onChangeText={setCustomerName}
          textAlign="right" placeholderTextColor="#9ca3af" />

        <Text style={s.label}>رقم الهاتف *</Text>
        <TextInput style={s.input} placeholder="07XXXXXXXXX"
          value={customerPhone}
          onChangeText={v => { if (v.length <= 11 && /^[0-9]*$/.test(v)) setCustomerPhone(v); }}
          keyboardType="phone-pad" maxLength={11}
          textAlign="right" placeholderTextColor="#9ca3af" />

        <Text style={s.label}>رقم الهاتف الاحتياطي</Text>
        <TextInput style={s.input} placeholder="07XXXXXXXXX (اختياري)"
          value={backupPhone}
          onChangeText={v => { if (v.length <= 11 && /^[0-9]*$/.test(v)) setBackupPhone(v); }}
          keyboardType="phone-pad" maxLength={11}
          textAlign="right" placeholderTextColor="#9ca3af" />

        <Text style={s.label}>المحافظة *</Text>
        <TouchableOpacity style={s.selectBtn} onPress={() => setShowProvinces(true)}>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
          <Text style={[s.selectText, !province && { color: '#9ca3af' }]}>
            {province || 'اختر المحافظة'}
          </Text>
        </TouchableOpacity>

        <Text style={s.label}>المنطقة *</Text>
        <TextInput style={s.input} placeholder="مثال: الكرادة، الجادرية"
          value={area} onChangeText={setArea}
          textAlign="right" placeholderTextColor="#9ca3af" />

        <Text style={s.label}>العنوان التفصيلي *</Text>
        <TextInput style={[s.input, { height: 70 }]}
          placeholder="المحافظة - المنطقة - اقرب نقطة دالة..."
          value={address} onChangeText={setAddress} multiline
          textAlign="right" placeholderTextColor="#9ca3af" />

        <Text style={s.label}>ملاحظات</Text>
        <TextInput style={[s.input, { height: 70 }]}
          placeholder="أي ملاحظات إضافية (اختياري)"
          value={notes} onChangeText={setNotes} multiline
          textAlign="right" placeholderTextColor="#9ca3af" />

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pricetag-outline" size={20} color={PRIMARY} />
          <Text style={s.sectionTitle}>كود الخصم</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.promoBtn}
            onPress={() => promoCode.trim() && verifyPromo.mutate(promoCode)}
            disabled={!promoCode.trim() || verifyPromo.isPending}>
            {verifyPromo.isPending ? <ActivityIndicator color="#fff" size="small" /> :
              <Text style={s.promoBtnText}>تطبيق</Text>}
          </TouchableOpacity>
          <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder="أدخل الكود"
            value={promoCode}
            onChangeText={v => setPromoCode(v.toUpperCase())}
            textAlign="right" placeholderTextColor="#9ca3af" />
        </View>
        {promoDiscount > 0 && (
          <TouchableOpacity style={s.cancelPromo} onPress={() => { setPromoCode(''); setPromoDiscount(0); }}>
            <Text style={s.cancelPromoText}>إلغاء الخصم ✕</Text>
          </TouchableOpacity>
        )}

        <View style={s.summary}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Ionicons name="receipt-outline" size={20} color={PRIMARY} />
          <Text style={s.summaryTitle}>ملخص الطلب</Text>
        </View>
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
          <View style={[s.summaryRow, { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8 }]}>
            <Text style={[s.summaryVal, { fontSize: 22, color: PRIMARY }]}>{total.toLocaleString()} د.ع</Text>
            <Text style={[s.summaryLabel, { fontWeight: 'bold', fontSize: 16 }]}>المجموع الكلي</Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitOrder.isPending}>
          <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {submitOrder.isPending ? <ActivityIndicator color="#fff" /> :
              <><Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={s.submitText}>إتمام الطلب</Text></>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal visible={showProvinces} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowProvinces(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>اختر المحافظة</Text>
            </View>
            <ScrollView>
              {PROVINCES.map(p => (
                <TouchableOpacity key={p} style={s.provinceItem}
                  onPress={() => { setProvince(p); setShowProvinces(false); }}>
                  <Ionicons name="location" size={20} color={PRIMARY} />
                  <Text style={s.provinceText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginTop: 20, marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', textAlign: 'right',
    marginBottom: 6, marginTop: 10, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#fff', marginBottom: 10 },
  selectBtn: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginBottom: 10 },
  selectText: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' },
  promoBtn: { backgroundColor: SECONDARY, borderRadius: 12, paddingHorizontal: 20,
    justifyContent: 'center', alignItems: 'center', minWidth: 70 },
  promoBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  cancelPromo: { alignSelf: 'flex-end', marginTop: 6 },
  cancelPromoText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  summary: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 12 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryVal: { fontSize: 15, fontWeight: '600', color: '#111827' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 6 },
  submitBtn: { borderRadius: 14, overflow: 'hidden' },
  submitGrad: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  provinceItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  provinceText: { fontSize: 15, color: '#111827', textAlign: 'right' },
});
