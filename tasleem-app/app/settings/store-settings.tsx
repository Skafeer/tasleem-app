// tasleem-app/app/settings/store-settings.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Clipboard, Linking,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const BG = '#f2f6f9';
const BORDER = '#e8edf2';

const STORE_BASE_URL = 'https://matjari.vercel.app';

// ─── الألوان الجاهزة (نفس أسماء الباك إند) ──────────────────
const COLORS_LIST = [
  { key: 'primary', label: 'تركوازي',  hex: '#0c6679' },
  { key: 'emerald', label: 'أخضر',    hex: '#10b981' },
  { key: 'blue',    label: 'أزرق',     hex: '#3b82f6' },
  { key: 'purple',  label: 'بنفسجي',  hex: '#8b5cf6' },
  { key: 'rose',    label: 'وردي',     hex: '#f43f5e' },
  { key: 'amber',   label: 'ذهبي',    hex: '#f59e0b' },
  { key: 'orange',  label: 'برتقالي', hex: '#f97316' },
  { key: 'teal',    label: 'فيروزي',  hex: '#14b8a6' },
  { key: 'indigo',  label: 'نيلي',    hex: '#6366f1' },
  { key: 'pink',    label: 'زهر',     hex: '#ec4899' },
  { key: 'cyan',    label: 'سماوي',   hex: '#06b6d4' },
  { key: 'slate',   label: 'رمادي',   hex: '#475569' },
];

const getColorHex = (key: string) =>
  COLORS_LIST.find(c => c.key === key)?.hex || PRIMARY;

// ═════════════════════════════════════════════════════════════
// ─── الشاشة ───
// ═════════════════════════════════════════════════════════════
export default function StoreSettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // ─── النموذج ───
  const [form, setForm] = useState({
    name: '',
    phone: '',
    description: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    color: 'primary',
  });

  // ─── جلب بيانات المتجر ───
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-store'],
    queryFn: async () => {
      const { data } = await api.get('/api/store/my');
      return data as { store: any | null; products?: any[] };
    },
  });

  const existingStore = data?.store || null;
  const storeProducts = data?.products || [];

  // ─── تحميل البيانات في النموذج عند الجلب ───
  useEffect(() => {
    if (existingStore) {
      setForm({
        name: existingStore.name || '',
        phone: existingStore.phone || '',
        description: existingStore.description || '',
        instagram: existingStore.instagram || '',
        facebook: existingStore.facebook || '',
        tiktok: existingStore.tiktok || '',
        color: existingStore.color || 'primary',
      });
    } else {
      // تحميل الرقم من الحساب
      api.get('/api/auth/me').then(({ data: user }) => {
        setForm(f => ({ ...f, phone: user?.phone || '' }));
      }).catch(() => {});
    }
  }, [existingStore?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ─── إنشاء متجر ───
  const createStore = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/store/create', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success('تم إنشاء المتجر بنجاح');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الإنشاء'),
  });

  // ─── تحديث الإعدادات ───
  const updateStore = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.patch('/api/store/settings', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success('تم حفظ الإعدادات');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحفظ'),
  });

  const isPending = createStore.isPending || updateStore.isPending;

  // ─── التحقق والحفظ ───
  const handleSave = () => {
    if (!form.name.trim()) return toast.warning('أدخل اسم المتجر');
    if (!form.phone.trim()) return toast.warning('أدخل رقم التواصل');
    if (!/^07[0-9]{9}$/.test(form.phone.trim()))
      return toast.warning('رقم التواصل يجب أن يبدأ بـ 07 ويكون 11 رقم');

    if (existingStore) {
      updateStore.mutate(form);
    } else {
      createStore.mutate(form);
    }
  };

  // ─── نسخ الرابط ───
  const copyLink = () => {
    if (!existingStore?.code) return;
    const link = `${STORE_BASE_URL}/${existingStore.code}`;
    Clipboard.setString(link);
    toast.success('تم نسخ رابط المتجر');
  };

  // ─── فتح الرابط ───
  const openLink = () => {
    if (!existingStore?.code) return;
    Linking.openURL(`${STORE_BASE_URL}/${existingStore.code}`);
  };

  // ─── مشاركة الرابط ───
  const shareLink = () => {
    if (!existingStore?.code) return;
    const link = `${STORE_BASE_URL}/${existingStore.code}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`تسوق من متجرنا: ${link}`)}`)
      .catch(() => {
        Clipboard.setString(link);
        toast.success('تم نسخ الرابط');
      });
  };

  // ─── عرض التحميل ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>إعدادات الموقع الإلكتروني</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingTxt}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const storeColorHex = getColorHex(form.color);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ─── Header ─── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>إعدادات الموقع الإلكتروني</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          keyboardShouldPersistTaps="handled">

          {/* ═══ حالة المتجر ═══ */}
          {existingStore ? (
            <View style={[s.statusCard, { borderColor: SUCCESS + '40', backgroundColor: SUCCESS + '08' }]}>
              <View style={[s.statusIconBox, { backgroundColor: SUCCESS + '20' }]}>
                <Ionicons name="checkmark-circle" size={26} color={SUCCESS} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[s.statusTitle, { color: SUCCESS }]}>المتجر نشط</Text>
                <Text style={s.statusSub}>رابط متجرك جاهز للمشاركة</Text>
              </View>
            </View>
          ) : (
            <View style={[s.statusCard, { borderColor: PRIMARY + '30', backgroundColor: PRIMARY + '06' }]}>
              <View style={[s.statusIconBox, { backgroundColor: PRIMARY + '15' }]}>
                <Ionicons name="storefront-outline" size={26} color={PRIMARY} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[s.statusTitle, { color: PRIMARY }]}>لم تنشئ متجرك بعد</Text>
                <Text style={s.statusSub}>أنشئ متجراً إلكترونياً مجانياً</Text>
              </View>
            </View>
          )}

          {/* ═══ رابط المتجر (يظهر فقط عند الإنشاء) ═══ */}
          {existingStore && (
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIconBox, { backgroundColor: PRIMARY + '12' }]}>
                  <Ionicons name="link-outline" size={16} color={PRIMARY} />
                </View>
                <Text style={s.sectionTitle}>رابط المتجر</Text>
              </View>

              <View style={s.linkBox}>
                <Text style={s.linkText} numberOfLines={1}>
                  {STORE_BASE_URL}/{existingStore.code}
                </Text>
              </View>

              <View style={s.linkActionsRow}>
                <TouchableOpacity style={s.linkActionBtn} onPress={copyLink}>
                  <Ionicons name="copy-outline" size={16} color={PRIMARY} />
                  <Text style={s.linkActionTxt}>نسخ</Text>
                </TouchableOpacity>
                <View style={s.linkActionDivider} />
                <TouchableOpacity style={s.linkActionBtn} onPress={openLink}>
                  <Ionicons name="open-outline" size={16} color={PRIMARY} />
                  <Text style={s.linkActionTxt}>فتح</Text>
                </TouchableOpacity>
                <View style={s.linkActionDivider} />
                <TouchableOpacity style={s.linkActionBtn} onPress={shareLink}>
                  <Ionicons name="share-social-outline" size={16} color={PRIMARY} />
                  <Text style={s.linkActionTxt}>مشاركة</Text>
                </TouchableOpacity>
              </View>

              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
                <Text style={s.hintTxt}>
                  ضع هذا الرابط في Bio حسابك على Instagram أو TikTok
                </Text>
              </View>
            </View>
          )}

          {/* ═══ معلومات المتجر ═══ */}
          <View style={s.card}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIconBox, { backgroundColor: PRIMARY + '12' }]}>
                <Ionicons name="storefront-outline" size={16} color={PRIMARY} />
              </View>
              <Text style={s.sectionTitle}>معلومات المتجر</Text>
            </View>

            <Text style={s.inputLabel}>اسم المتجر</Text>
            <TextInput
              style={s.input}
              placeholder="مثال: متجر الأناقة"
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              textAlign="right"
              placeholderTextColor="#9ca3af"
              maxLength={100}
            />

            <Text style={s.inputLabel}>رقم التواصل</Text>
            <TextInput
              style={s.input}
              placeholder="07XXXXXXXXX"
              value={form.phone}
              onChangeText={v => {
                const cleaned = v.replace(/[^0-9]/g, '');
                if (cleaned.length <= 11) setForm(f => ({ ...f, phone: cleaned }));
              }}
              keyboardType="phone-pad"
              maxLength={11}
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />

            <Text style={s.inputLabel}>وصف قصير (اختياري)</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="وصف مختصر لمتجرك..."
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              textAlign="right"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>

          {/* ═══ حسابات التواصل ═══ */}
          <View style={s.card}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIconBox, { backgroundColor: PRIMARY + '12' }]}>
                <Ionicons name="share-social-outline" size={16} color={PRIMARY} />
              </View>
              <Text style={s.sectionTitle}>حسابات التواصل</Text>
            </View>

            {/* Instagram */}
            <View style={s.socialRow}>
              <View style={[s.socialIconBox, { backgroundColor: '#e1306c15' }]}>
                <Ionicons name="logo-instagram" size={18} color="#e1306c" />
              </View>
              <TextInput
                style={s.socialInput}
                placeholder="Instagram (اختياري)"
                value={form.instagram}
                onChangeText={v => setForm(f => ({ ...f, instagram: v }))}
                textAlign="right"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>

            {/* Facebook */}
            <View style={s.socialRow}>
              <View style={[s.socialIconBox, { backgroundColor: '#1877f215' }]}>
                <Ionicons name="logo-facebook" size={18} color="#1877f2" />
              </View>
              <TextInput
                style={s.socialInput}
                placeholder="Facebook (اختياري)"
                value={form.facebook}
                onChangeText={v => setForm(f => ({ ...f, facebook: v }))}
                textAlign="right"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>

            {/* TikTok */}
            <View style={s.socialRow}>
              <View style={[s.socialIconBox, { backgroundColor: '#00000015' }]}>
                <Ionicons name="logo-tiktok" size={18} color="#000" />
              </View>
              <TextInput
                style={s.socialInput}
                placeholder="TikTok (اختياري)"
                value={form.tiktok}
                onChangeText={v => setForm(f => ({ ...f, tiktok: v }))}
                textAlign="right"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* ═══ لون المتجر ═══ */}
          <View style={s.card}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIconBox, { backgroundColor: PRIMARY + '12' }]}>
                <Ionicons name="color-palette-outline" size={16} color={PRIMARY} />
              </View>
              <Text style={s.sectionTitle}>لون المتجر</Text>
            </View>

            <View style={s.colorsGrid}>
              {COLORS_LIST.map(c => {
                const isSelected = form.color === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      s.colorBtn,
                      { backgroundColor: c.hex },
                      isSelected && s.colorBtnActive,
                    ]}
                    onPress={() => setForm(f => ({ ...f, color: c.key }))}
                    activeOpacity={0.7}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* معاينة */}
            <View style={[s.previewBox, { borderColor: storeColorHex + '40' }]}>
              <View style={[s.previewHeader, { backgroundColor: storeColorHex }]}>
                <Text style={s.previewHeaderTxt}>
                  {form.name || 'اسم متجرك'}
                </Text>
                <View style={s.previewHeaderIcons}>
                  <Ionicons name="cart-outline" size={16} color="#fff" />
                </View>
              </View>
              <View style={s.previewBody}>
                <View style={s.previewProductCard}>
                  <View style={[s.previewProductImg, { backgroundColor: storeColorHex + '20' }]}>
                    <Ionicons name="image-outline" size={18} color={storeColorHex} />
                  </View>
                  <View style={s.previewProductLines}>
                    <View style={[s.previewLine, { backgroundColor: '#e5e7eb', width: '80%' }]} />
                    <View style={[s.previewLine, { backgroundColor: storeColorHex + '40', width: '50%' }]} />
                  </View>
                </View>
                <View style={s.previewProductCard}>
                  <View style={[s.previewProductImg, { backgroundColor: storeColorHex + '20' }]}>
                    <Ionicons name="image-outline" size={18} color={storeColorHex} />
                  </View>
                  <View style={s.previewProductLines}>
                    <View style={[s.previewLine, { backgroundColor: '#e5e7eb', width: '80%' }]} />
                    <View style={[s.previewLine, { backgroundColor: storeColorHex + '40', width: '50%' }]} />
                  </View>
                </View>
              </View>
              <Text style={s.previewLabel}>معاينة مباشرة</Text>
            </View>
          </View>

          {/* ═══ زر الحفظ ═══ */}
          <TouchableOpacity
            style={[s.saveBtn, isPending && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isPending}
            activeOpacity={0.85}>
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={existingStore ? 'checkmark-circle-outline' : 'rocket-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={s.saveBtnTxt}>
                  {existingStore ? 'حفظ التعديلات' : 'إنشاء المتجر'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ═══ ملاحظة ═══ */}
          {!existingStore && (
            <View style={s.noteBox}>
              <Ionicons name="gift-outline" size={16} color={PRIMARY} />
              <Text style={s.noteTxt}>
                المتجر الإلكتروني مجاني بالكامل — بعد الإنشاء ستحصل على رابط دائم
              </Text>
            </View>
          )}

          {existingStore && storeProducts.length > 0 && (
            <View style={s.noteBox}>
              <Ionicons name="cube-outline" size={16} color={PRIMARY} />
              <Text style={s.noteTxt}>
                لديك {storeProducts.length} منتج في متجرك
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════
// ─── الأنماط ───
// ═════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5, borderColor: '#d4eef3',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },

  // ─── Scroll ───
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },

  // ─── Status Card ───
  statusCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  statusIconBox: {
    width: 50, height: 50, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  statusTitle: { fontSize: 15, fontWeight: 'bold' },
  statusSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  // ─── Card ───
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionIconBox: {
    width: 30, height: 30, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 'bold',
    color: '#111827', flex: 1, textAlign: 'right',
  },

  // ─── Link Box ───
  linkBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY + '25',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  linkActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    marginBottom: 12,
  },
  linkActionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkActionTxt: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  linkActionDivider: { width: 1, backgroundColor: '#f3f4f6' },

  hintBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: PRIMARY + '06',
    borderRadius: 10,
  },
  hintTxt: {
    flex: 1, fontSize: 11, color: '#6b7280',
    textAlign: 'right', lineHeight: 16,
  },

  // ─── Inputs ───
  inputLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  textarea: { height: 70, textAlignVertical: 'top', paddingTop: 10 },

  // ─── Social Row ───
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  socialIconBox: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  socialInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },

  // ─── Colors ───
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorBtn: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorBtnActive: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // ─── Preview ───
  previewBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  previewHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewHeaderTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  previewHeaderIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBody: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  previewProductCard: {
    flex: 1,
    gap: 6,
  },
  previewProductImg: {
    height: 40, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  previewProductLines: { gap: 4 },
  previewLine: { height: 6, borderRadius: 3 },
  previewLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    fontWeight: '600',
  },

  // ─── Save Button ───
  saveBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // ─── Note ───
  noteBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: PRIMARY + '08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY + '20',
  },
  noteTxt: {
    flex: 1,
    fontSize: 12,
    color: PRIMARY,
    textAlign: 'right',
    fontWeight: '600',
    lineHeight: 18,
  },
});