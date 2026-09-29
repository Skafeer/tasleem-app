// tasleem-app/app/checkout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const BG = '#f2f6f9';

const PROVINCES = [
  'بغداد', 'البصرة', 'نينوى', 'الأنبار', 'كربلاء', 'النجف',
  'ذي قار', 'القادسية', 'بابل', 'ديالى', 'ميسان', 'واسط',
  'صلاح الدين', 'المثنى', 'كركوك', 'دهوك', 'أربيل', 'السليمانية'
];

const getCartKey = (userId?: number) => userId ? `cart_${userId}` : null;

// ─── نوع الكود المطبق ──────────────────────────────────────────
type AppliedPromo = {
  code: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountPercent?: number;
  discountAmount?: number;
  appliesTo: 'subtotal' | 'shipping';  // ✅ جديد
};

export default function CheckoutScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const CART_KEY = getCartKey(user?.id);

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
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [showProvinces, setShowProvinces] = useState(false);
  const [shippingSubsidy, setShippingSubsidy] = useState(0);

  const loadCart = useCallback(async () => {
    if (userLoading) return;

    if (!CART_KEY) {
      toast.warning('الرجاء تسجيل الدخول أولاً');
      router.back();
      return;
    }

    try {
      const data = await AsyncStorage.getItem(CART_KEY);
      const parsed = data ? JSON.parse(data) : [];
      if (parsed.length === 0) {
        toast.warning('السلة فارغة');
        router.back();
        return;
      }
      setCart(parsed);
    } catch (e) {
      console.error(e);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [CART_KEY, router, userLoading]);

  useEffect(() => {
    if (!userLoading && CART_KEY !== undefined) {
      loadCart();
    }
  }, [CART_KEY, loadCart, userLoading]);

  useFocusEffect(
    useCallback(() => {
      if (!userLoading && CART_KEY !== undefined) {
        loadCart();
      }
    }, [CART_KEY, loadCart, userLoading])
  );

  // ─── حساب المجاميع أولاً ────────────────────────────────────────
  const sellingTotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const costTotal    = cart.reduce((s, i) => s + i.wholesalePrice * i.quantity, 0);
  const minTotal     = cart.reduce((s, i) => s + (i.sellingPriceMin || i.wholesalePrice) * i.quantity, 0);

  // ─── التوصيل الأساسي (قبل الخصم) ────────────────────────────────
  const baseShipping = province === 'البصرة' ? 3000 : 5000;

  // ─── التحقق من الكود (يرسل cartAmount + shippingCost) ────────────
  const verifyPromo = useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/api/promo-codes/verify', {
        code: code.trim().toUpperCase(),
        cartAmount: sellingTotal,
        shippingCost: baseShipping,
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data.valid) {
        toast.error(data.message || 'كود غير صحيح');
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      setAppliedPromo(data.promo);
      setPromoDiscount(data.discount || 0);

      const scopeLabel = data.promo?.appliesTo === 'shipping' ? 'على التوصيل' : 'على المنتجات';
      toast.success(`تم تطبيق الخصم ${scopeLabel}: ${data.discount.toLocaleString()} د.ع`);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'كود خصم غير صحيح';
      toast.error(msg);
      setAppliedPromo(null);
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
      toast.success('تم إرسال الطلب بنجاح');
      if (CART_KEY) {
        await AsyncStorage.removeItem(CART_KEY);
      }
      qc.invalidateQueries({ queryKey: ['user'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      router.replace('/(tabs)/orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الطلب'),
  });

  const isValidPhone = (phone: string) => {
    if (!phone) return false;
    return phone.startsWith('07') && phone.length === 11 && /^[0-9]+$/.test(phone);
  };

  // ═══════════════════════════════════════════════════════════════
  // ─── الحسابات المالية ───
  // ✅ التاجر لا يتحمل الخصم — الشركة تتحمّله
  // ✅ الخصم قد يكون على المنتجات أو على التوصيل
  // ═══════════════════════════════════════════════════════════════
  const promoAppliesTo = appliedPromo?.appliesTo || 'subtotal';

  // خصم المنتجات vs خصم التوصيل
  const productsDiscount = promoAppliesTo === 'subtotal' ? promoDiscount : 0;
  const shippingDiscount = promoAppliesTo === 'shipping' ? promoDiscount : 0;

  // ─── السلايدر: إعانة التاجر للتوصيل ───
  const sliderMax    = baseShipping;
  const sliderStep   = 500;
  const sliderEnabled = sellingTotal > (minTotal + baseShipping);

  // ربح التاجر: لا يُخصم منه الكود (فقط السلايدر)
  const rawProfit     = sellingTotal - costTotal;
  const maxSubsidy    = Math.min(sliderMax, Math.max(0, rawProfit - 1));
  const safeSubsidy   = Math.min(shippingSubsidy, maxSubsidy);

  // التوصيل النهائي على العميل = التوصيل الأساسي - إعانة التاجر - خصم التوصيل من الكود
  const shippingAfterSubsidy = Math.max(0, baseShipping - safeSubsidy);
  const customerShipping = Math.max(0, shippingAfterSubsidy - shippingDiscount);

  // الإجمالي = المنتجات + التوصيل - خصم المنتجات
  const total = sellingTotal - productsDiscount + customerShipping;

  // ربح التاجر النهائي = الربح الأساسي - إعانة السلايدر
  const profit = rawProfit - safeSubsidy;

  const isFreeShipping = customerShipping === 0;

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.warning('يرجى إدخال اسم الزبون');
      return;
    }

    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

    if (!isValidPhone(cleanPhone)) {
      toast.warning('رقم الهاتف يجب أن يبدأ بـ 07 ويكون 11 رقم');
      return;
    }

    const cleanBackup = backupPhone ? backupPhone.replace(/[^0-9]/g, '') : '';
    if (cleanBackup && !isValidPhone(cleanBackup)) {
      toast.warning('رقم الهاتف الاحتياطي يجب أن يبدأ بـ 07 ويكون 11 رقم');
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

    submitOrder.mutate({
      items,
      customerName,
      customerPhone: cleanPhone,
      backupPhone: cleanBackup || null,
      province,
      address: fullAddress,
      notes: notes || '',
      promoCode: appliedPromo ? appliedPromo.code : '',
      shippingSubsidy: safeSubsidy,
    });
  };

  const clearPromo = () => {
    setPromoCode('');
    setAppliedPromo(null);
    setPromoDiscount(0);
  };

  // ─── نص الخصم المعروض ──────────────────────────────────────────
  const promoDisplayText = (() => {
    if (!appliedPromo) return '';
    if (appliedPromo.discountType === 'percentage') {
      return `${appliedPromo.discountPercent}%`;
    }
    return `${(appliedPromo.discountAmount || 0).toLocaleString()} د.ع`;
  })();

  // ─── تسمية نوع الكود ──────────────────────────────────────────
  const promoScopeLabel = promoAppliesTo === 'shipping' ? 'توصيل' : 'منتجات';

  // ─── تلميح السلايدر ────────────────────────────────────────────
  const sliderHint = (() => {
    if (!sliderEnabled) return { text: 'ارفع سعر البيع لتفعيل هذه الميزة', icon: 'information-circle-outline', color: '#9ca3af' };
    if (safeSubsidy === 0) return { text: 'اسحب للخصم من ربحك وتوفير التوصيل للزبون', icon: 'hand-left-outline', color: '#6b7280' };
    if (baseShipping - safeSubsidy <= 0) return { text: `التوصيل مجاني — خصمت ${safeSubsidy.toLocaleString()} د.ع من ربحك`, icon: 'checkmark-circle', color: SUCCESS };
    return { text: `خصمت ${safeSubsidy.toLocaleString()} د.ع — تبقى ${(baseShipping - safeSubsidy).toLocaleString()} د.ع على الزبون`, icon: 'cash-outline', color: PRIMARY };
  })();

  if (loading || userLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
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
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>إتمام الطلب</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}>

        {/* ── معلومات الزبون ── */}
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
              const cleaned = v.replace(/[^0-9]/g, '');
              if (cleaned.length <= 11) setCustomerPhone(cleaned);
            }}
            keyboardType="phone-pad"
            maxLength={11}
            textAlign="right"
          />

          <Text style={s.label}>رقم الهاتف الاحتياطي (اختياري)</Text>
          <TextInput
            style={s.input}
            placeholder="07XXXXXXXXX (اختياري)"
            placeholderTextColor="#9ca3af"
            value={backupPhone}
            onChangeText={v => {
              const cleaned = v.replace(/[^0-9]/g, '');
              if (cleaned.length <= 11) setBackupPhone(cleaned);
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

        {/* ── كود الخصم ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.iconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="pricetag-outline" size={18} color={SECONDARY} />
            </View>
            <Text style={s.cardTitle}>كود الخصم</Text>
          </View>

          {!appliedPromo ? (
            <>
              <View style={s.promoRow}>
                <TextInput
                  style={[s.input, s.promoInput]}
                  placeholder="أدخل الكود"
                  placeholderTextColor="#9ca3af"
                  value={promoCode}
                  onChangeText={v => setPromoCode(v.toUpperCase())}
                  autoCapitalize="characters"
                  textAlign="right"
                />
                <TouchableOpacity
                  style={[s.promoBtn, (!promoCode.trim() || verifyPromo.isPending) && s.promoBtnOff]}
                  onPress={() => promoCode.trim() && verifyPromo.mutate(promoCode)}
                  disabled={!promoCode.trim() || verifyPromo.isPending}>
                  {verifyPromo.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.promoBtnText}>تطبيق</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* ─── بطاقة الكود المطبق ─── */
            <View style={s.appliedPromoBox}>
              <View style={s.appliedPromoTop}>
                <TouchableOpacity style={s.removePromoBtn} onPress={clearPromo}>
                  <Ionicons name="close-circle" size={22} color={DANGER} />
                </TouchableOpacity>
                <View style={s.appliedPromoInfo}>
                  <View style={s.appliedPromoCodeRow}>
                    <Text style={s.appliedPromoCode}>{appliedPromo.code}</Text>
                    <View style={s.appliedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#fff" />
                      <Text style={s.appliedBadgeTxt}>مطبق</Text>
                    </View>
                  </View>
                  {!!appliedPromo.title && (
                    <Text style={s.appliedPromoTitle}>{appliedPromo.title}</Text>
                  )}
                </View>
              </View>

              <View style={s.appliedPromoDetails}>
                <View style={s.appliedDetailItem}>
                  <Text style={s.appliedDetailLabel}>النوع</Text>
                  <Text style={[s.appliedDetailVal, { color: PRIMARY }]}>
                    {promoScopeLabel}
                  </Text>
                </View>
                <View style={s.appliedDetailDivider} />
                <View style={s.appliedDetailItem}>
                  <Text style={s.appliedDetailLabel}>الخصم</Text>
                  <Text style={[s.appliedDetailVal, { color: SECONDARY }]}>
                    {promoDisplayText}
                  </Text>
                </View>
                <View style={s.appliedDetailDivider} />
                <View style={s.appliedDetailItem}>
                  <Text style={s.appliedDetailLabel}>التوفير</Text>
                  <Text style={[s.appliedDetailVal, { color: SUCCESS }]}>
                    {promoDiscount.toLocaleString()} د.ع
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── ملخص الطلب ── */}
        <View style={s.summaryCard}>
          <View style={s.cardHeader}>
            <View style={[s.iconBox, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="receipt-outline" size={18} color={SUCCESS} />
            </View>
            <Text style={s.cardTitle}>ملخص الطلب</Text>
          </View>

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>المجموع الفرعي</Text>
            <Text style={s.summaryValue}>{sellingTotal.toLocaleString()} د.ع</Text>
          </View>

          <View style={s.summaryRow}>
            <View style={s.rowLabelWrap}>
              <Ionicons name="trending-up-outline" size={14} color={SUCCESS} />
              <Text style={s.summaryLabel}>ربحك المتوقع</Text>
            </View>
            <Text style={[s.summaryValue, { color: SUCCESS }]}>
              {profit.toLocaleString()} د.ع
            </Text>
          </View>

          {/* ─── خصم المنتجات (لو كان على المنتجات) ─── */}
          {productsDiscount > 0 && appliedPromo && (
            <View style={s.summaryRow}>
              <View style={s.rowLabelWrap}>
                <Ionicons name="pricetag-outline" size={14} color={SUCCESS} />
                <Text style={s.summaryLabel}>
                  خصم منتجات ({appliedPromo.code})
                </Text>
              </View>
              <Text style={[s.summaryValue, { color: SUCCESS }]}>
                -{productsDiscount.toLocaleString()} د.ع
              </Text>
            </View>
          )}

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>التوصيل</Text>
            {isFreeShipping ? (
              <View style={s.freeBadge}>
                <Ionicons name="car-sport" size={13} color="#059669" />
                <Text style={s.freeBadgeText}>مجاني</Text>
              </View>
            ) : (
              <Text style={s.summaryValue}>
                {customerShipping.toLocaleString()} د.ع
              </Text>
            )}
          </View>

          {/* ─── خصم التوصيل (لو كان على التوصيل) ─── */}
          {shippingDiscount > 0 && appliedPromo && (
            <View style={s.summaryRow}>
              <View style={s.rowLabelWrap}>
                <Ionicons name="bicycle-outline" size={14} color={SUCCESS} />
                <Text style={s.summaryLabel}>
                  خصم توصيل ({appliedPromo.code})
                </Text>
              </View>
              <Text style={[s.summaryValue, { color: SUCCESS }]}>
                -{shippingDiscount.toLocaleString()} د.ع
              </Text>
            </View>
          )}

          {/* ── السلايدر ── */}
          <View style={[s.sliderCard, !sliderEnabled && { opacity: 0.45 }]}>
            <View style={s.sliderHeader}>
              <Ionicons name="car-outline" size={18} color={PRIMARY} />
              <Text style={s.sliderTitle}>ادفع كلفة التوصيل من ربحك</Text>
            </View>

            <View style={s.sliderHintRow}>
              <Ionicons name={sliderHint.icon as any} size={14} color={sliderHint.color} />
              <Text style={s.sliderHint}>{sliderHint.text}</Text>
            </View>

            <Slider
              style={s.slider}
              minimumValue={0}
              maximumValue={sliderMax}
              step={sliderStep}
              value={safeSubsidy}
              onValueChange={v => sliderEnabled && setShippingSubsidy(v)}
              minimumTrackTintColor={PRIMARY}
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor={sliderEnabled ? PRIMARY : '#9ca3af'}
              disabled={!sliderEnabled}
            />

            <View style={s.sliderLabels}>
              <Text style={s.sliderLabel}>مجاني كلياً</Text>
              <Text style={s.sliderLabel}>بدون خصم</Text>
            </View>

            {safeSubsidy > 0 && (
              <View style={s.sliderImpact}>
                <Text style={s.sliderImpactText}>
                  ربحك بعد خصم التوصيل:{' '}
                  <Text style={{ color: profit > 0 ? SUCCESS : DANGER, fontWeight: '700' }}>
                    {profit.toLocaleString()} د.ع
                  </Text>
                </Text>
              </View>
            )}
          </View>

          <View style={s.divider} />

          <View style={s.totalRow}>
            <View style={s.rowLabelWrap}>
              <Ionicons name="wallet-outline" size={18} color={PRIMARY} />
              <Text style={s.totalLabel}>المجموع الكلي</Text>
            </View>
            <Text style={s.totalValue}>{total.toLocaleString()} د.ع</Text>
          </View>
        </View>

      </ScrollView>

      {/* ── Footer ── */}
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

      {/* ── Modal المحافظات ── */}
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

/* ============================================================
 *  Styles
 * ============================================================ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Header
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  // Loading
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#9ca3af' },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },

  // Form
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
    marginBottom: 8,
  },
  textarea: { height: 70, textAlignVertical: 'top' },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  selectText: { fontSize: 14, color: '#111827', textAlign: 'right' },

  // Promo
  promoRow: { flexDirection: 'row', gap: 10 },
  promoInput: { flex: 1, marginBottom: 0 },
  promoBtn: {
    backgroundColor: SECONDARY,
    borderRadius: 12,
    paddingHorizontal: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnOff: { opacity: 0.5 },
  promoBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Applied Promo Card
  appliedPromoBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#86efac',
    gap: 12,
  },
  appliedPromoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  removePromoBtn: { padding: 2 },
  appliedPromoInfo: { flex: 1, alignItems: 'flex-end' },
  appliedPromoCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedPromoCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
    letterSpacing: 1,
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: SUCCESS,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  appliedBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  appliedPromoTitle: {
    fontSize: 12,
    color: '#065f46',
    marginTop: 3,
    textAlign: 'right',
  },
  appliedPromoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  appliedDetailItem: { flex: 1, alignItems: 'center', gap: 3 },
  appliedDetailDivider: { width: 1, height: 30, backgroundColor: '#e8edf2' },
  appliedDetailLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  appliedDetailVal: { fontSize: 13, fontWeight: 'bold' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  divider: { height: 1, backgroundColor: '#e8edf2', marginVertical: 10 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: PRIMARY },

  // Free shipping badge
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  freeBadgeText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  // Slider
  sliderCard: {
    backgroundColor: '#f0f9fa',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#d4eef3',
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sliderTitle: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  sliderHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sliderHint: {
    flex: 1,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'right',
  },
  slider: { width: '100%', height: 40 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sliderLabel: { fontSize: 10, color: '#9ca3af' },
  sliderImpact: { marginTop: 8, alignItems: 'center' },
  sliderImpactText: { fontSize: 12, color: '#374151' },

  // Footer
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
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal
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
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
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