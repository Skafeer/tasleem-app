import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const PROVINCES = [
  'بغداد', 'البصرة', 'نينوى', 'الأنبار', 'كربلاء', 'النجف',
  'ذي قار', 'القادسية', 'بابل', 'ديالى', 'ميسان', 'واسط',
  'صلاح الدين', 'المثنى', 'كركوك', 'دهوك', 'أربيل', 'السليمانية'
];

export default function CheckoutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (e) {
      router.back();
    } finally {
      setLoading(false);
    }
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
    onError: () => {
      toast.error('كود خصم غير صحيح');
      setPromoDiscount(0);
    },
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
      qc.invalidateQueries({ queryKey: ['orders'] });
      router.replace('/(tabs)/orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الطلب'),
  });

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.warning('يرجى إدخال اسم الزبون');
      return;
    }
    if (!customerPhone.trim() || !customerPhone.startsWith('07') || customerPhone.length !== 11) {
      toast.warning('رقم الهاتف يجب أن يبدأ بـ 07 ويكون 11 رقم');
      return;
    }
    if (backupPhone && (!backupPhone.startsWith('07') || backupPhone.length !== 11)) {
      toast.warning('رقم الاحتياطي يجب أن يبدأ بـ 07 ويكون 11 رقم');
      return;
    }
    if (!province.trim()) {
      toast.warning('يرجى اختيار المحافظة');
      return;
    }
    if (!area.trim()) {
      toast.warning('يرجى إدخال المنطقة');
      return;
    }
    if (!address.trim()) {
      toast.warning('يرجى إدخال العنوان التفصيلي');
      return;
    }
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

  const sellingTotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const costTotal = cart.reduce((s, i) => s + i.wholesalePrice * i.quantity, 0);
  const discount = (sellingTotal * promoDiscount) / 100;
  const shipping = province === 'البصرة' ? 3000 : 5000;
  const total = sellingTotal - discount + shipping;
  const profit = sellingTotal - costTotal - discount;

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-forward" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>إتمام الطلب</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>جاري تحميل السلة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header (بدون تدرج) ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>إتمام الطلب</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}>

        {/* معلومات الزبون */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.iconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="person-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={s.cardTitle}>معلومات الزبون</Text>
          </View>

          <Text style={s.label}>اسم الزبون *</Text>
          <TextInput
            style={s.input}
            placeholder="أدخل الاسم الكامل"
            placeholderTextColor="#9ca3af"
            value={customerName}
            onChangeText={setCustomerName}
            textAlign="right"
          />

          <Text style={s.label}>رقم الهاتف *</Text>
          <TextInput
            style={s.input}
            placeholder="07XXXXXXXXX"
            placeholderTextColor="#9ca3af"
            value={customerPhone}
            onChangeText={v => {
              if (v.length <= 11 && /^[0-9]*$/.test(v)) setCustomerPhone(v);
            }}
            keyboardType="phone-pad"
            maxLength={11}
            textAlign="right"
          />

          <Text style={s.label}>رقم الهاتف الاحتياطي</Text>
          <TextInput
            style={s.input}
            placeholder="07XXXXXXXXX (اختياري)"
            placeholderTextColor="#9ca3af"
            value={backupPhone}
            onChangeText={v => {
              if (v.length <= 11 && /^[0-9]*$/.test(v)) setBackupPhone(v);
            }}
            keyboardType="phone-pad"
            maxLength={11}
            textAlign="right"
          />

          <Text style={s.label}>المحافظة *</Text>
          <TouchableOpacity style={s.selectBtn} onPress={() => setShowProvinces(true)}>
            <Text style={[s.selectText, !province && { color: '#9ca3af' }]}>
              {province || 'اختر المحافظة'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>

          <Text style={s.label}>المنطقة *</Text>
          <TextInput
            style={s.input}
            placeholder="مثال: الكرادة، الجادرية"
            placeholderTextColor="#9ca3af"
            value={area}
            onChangeText={setArea}
            textAlign="right"
          />

          <Text style={s.label}>العنوان التفصيلي *</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="المحافظة - المنطقة - أقرب نقطة دالة..."
            placeholderTextColor="#9ca3af"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            textAlign="right"
          />

          <Text style={s.label}>ملاحظات</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="أي ملاحظات إضافية (اختياري)"
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            textAlign="right"
          />
        </View>

        {/* كود الخصم */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.iconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="pricetag-outline" size={18} color="#f59e0b" />
            </View>
            <Text style={s.cardTitle}>كود الخصم</Text>
          </View>

          <View style={s.promoRow}>
            <TextInput
              style={[s.input, s.promoInput]}
              placeholder="أدخل الكود"
              placeholderTextColor="#9ca3af"
              value={promoCode}
              onChangeText={v => setPromoCode(v.toUpperCase())}
              textAlign="right"
            />
            <TouchableOpacity
              style={s.promoBtn}
              onPress={() => promoCode.trim() && verifyPromo.mutate(promoCode)}
              disabled={!promoCode.trim() || verifyPromo.isPending}>
              {verifyPromo.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.promoBtnText}>تطبيق</Text>
              )}
            </TouchableOpacity>
          </View>

          {promoDiscount > 0 && (
            <TouchableOpacity style={s.cancelPromo} onPress={() => { setPromoCode(''); setPromoDiscount(0); }}>
              <Text style={s.cancelPromoText}>إلغاء الخصم ✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ملخص الطلب */}
        <View style={s.summaryCard}>
          <View style={s.cardHeader}>
            <View style={[s.iconBox, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="receipt-outline" size={18} color="#10b981" />
            </View>
            <Text style={s.cardTitle}>ملخص الطلب</Text>
          </View>

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>المجموع الفرعي</Text>
            <Text style={s.summaryValue}>{sellingTotal.toLocaleString()} د.ع</Text>
          </View>

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>ربحك المتوقع 💰</Text>
            <Text style={[s.summaryValue, s.profitValue]}>{profit.toLocaleString()} د.ع</Text>
          </View>

          {promoDiscount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>الخصم ({promoDiscount}%)</Text>
              <Text style={[s.summaryValue, { color: '#10b981' }]}>-{discount.toLocaleString()} د.ع</Text>
            </View>
          )}

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>التوصيل</Text>
            <Text style={s.summaryValue}>{shipping.toLocaleString()} د.ع</Text>
          </View>

          <View style={s.divider} />

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>المجموع الكلي</Text>
            <Text style={s.totalValue}>{total.toLocaleString()} د.ع</Text>
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.submitBtn}
          onPress={handleSubmit}
          disabled={submitOrder.isPending}>
          {submitOrder.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.submitText}>إتمام الطلب</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal اختيار المحافظة */}
      <Modal visible={showProvinces} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>اختر المحافظة</Text>
              <TouchableOpacity onPress={() => setShowProvinces(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PROVINCES.map(p => (
                <TouchableOpacity
                  key={p}
                  style={s.provinceItem}
                  onPress={() => {
                    setProvince(p);
                    setShowProvinces(false);
                  }}>
                  <Ionicons name="location-outline" size={20} color={PRIMARY} />
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
  container: { flex: 1, backgroundColor: BG },

  // ── Header (موحد) ──
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

  // ── Loading ──
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  // ── Scroll ──
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },

  // ── Form ──
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  textarea: {
    height: 70,
    textAlignVertical: 'top',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  selectText: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
  },

  // ── Promo ──
  promoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  promoInput: {
    flex: 1,
    marginBottom: 0,
  },
  promoBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelPromo: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  cancelPromoText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Summary ──
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  profitValue: {
    color: '#10b981',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8edf2',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PRIMARY,
  },

  // ── Footer ──
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 50,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  provinceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  provinceText: {
    fontSize: 15,
    color: '#111827',
    textAlign: 'right',
    flex: 1,
  },
});