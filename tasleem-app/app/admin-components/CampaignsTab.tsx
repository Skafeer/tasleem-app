// tasleem-app/app/admin-components/CampaignsTab.tsx
import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const PURPLE = '#8b5cf6';
const BG = '#f2f6f9';

const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

const REWARD_TYPES = [
  { key: 'cashback',      label: 'كاش باك',       icon: 'cash',        color: SUCCESS,  desc: 'يُضاف المبلغ لرصيد التاجر' },
  { key: 'shipping_code', label: 'كود خصم توصيل', icon: 'bicycle',     color: PRIMARY,  desc: 'كود بنسبة على التوصيل' },
  { key: 'free_shipping', label: 'توصيل مجاني',   icon: 'car-sport',   color: PURPLE,   desc: 'كود بتوصيل مجاني' },
  { key: 'product_code',  label: 'كود خصم منتج',  icon: 'pricetag',    color: SECONDARY, desc: 'كود بنسبة على المنتجات' },
];

type FilterKey = 'active' | 'upcoming' | 'ended' | 'all';

function getCampaignStatus(c: any): { key: FilterKey | 'active' | 'upcoming' | 'ended'; label: string; color: string; bg: string } {
  if (!c.isActive) return { key: 'ended', label: 'معطل', color: '#6b7280', bg: '#f3f4f6' };
  const now = new Date();
  const starts = new Date(c.startsAt);
  const ends = new Date(c.endsAt);
  if (now < starts) return { key: 'upcoming', label: 'قادم', color: PRIMARY, bg: PRIMARY + '15' };
  if (now > ends) return { key: 'ended', label: 'منتهي', color: '#6b7280', bg: '#f3f4f6' };
  return { key: 'active', label: 'نشط', color: SUCCESS, bg: '#ecfdf5' };
}

function getProductImage(product: any): string | null {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs[0] || product.imageUrl || null;
}

function getRewardText(c: any): string {
  if (!c) return '';
  if (c.rewardType === 'cashback') return `${fmt(c.rewardValue)} د.ع`;
  if (c.rewardType === 'shipping_code') return `خصم ${c.rewardValue}% توصيل`;
  if (c.rewardType === 'free_shipping') return 'توصيل مجاني';
  if (c.rewardType === 'product_code') return `خصم ${c.rewardValue}% منتج`;
  return '';
}

export default function CampaignsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('active');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detailsCampaign, setDetailsCampaign] = useState<any>(null);

  // ─── النموذج ───
  const [form, setForm] = useState<any>({
    title: '',
    description: '',
    productId: null,
    targetCount: '',
    startsAt: '',
    endsAt: '',
    rewardType: 'cashback',
    rewardValue: '',
    rewardData: {
      codePrefix: 'GIFT',
      expiresInDays: 30,
      maxDiscount: '',
    },
  });

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // ─── الجلب ───
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/campaigns');
      return data as any[];
    },
    refetchInterval: 30000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/api/products');
      return data as any[];
    },
  });

  // ─── الإحصائيات ───
  const stats = useMemo(() => {
    const now = new Date();
    const list = campaigns as any[];
    const active = list.filter((c: any) => c.isActive && new Date(c.startsAt) <= now && new Date(c.endsAt) >= now).length;
    const upcoming = list.filter((c: any) => c.isActive && new Date(c.startsAt) > now).length;
    const ended = list.filter((c: any) => !c.isActive || new Date(c.endsAt) < now).length;
    return { active, upcoming, ended, total: list.length };
  }, [campaigns]);

  // ─── الفلترة ───
  const filtered = useMemo(() => {
    const now = new Date();
    return (campaigns as any[]).filter((c: any) => {
      if (filter === 'active') return c.isActive && new Date(c.startsAt) <= now && new Date(c.endsAt) >= now;
      if (filter === 'upcoming') return c.isActive && new Date(c.startsAt) > now;
      if (filter === 'ended') return !c.isActive || new Date(c.endsAt) < now;
      return true;
    }).sort((a: any, b: any) => b.id - a.id);
  }, [campaigns, filter]);

  // ─── Mutations ───
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const res = await api.patch(`/api/admin/campaigns/${editing.id}`, data);
        return res.data;
      }
      const res = await api.post('/api/admin/campaigns', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast.success(editing ? 'تم تعديل الحملة ✅' : 'تم إنشاء الحملة ✅');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحفظ'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/admin/campaigns/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast.success('تم حذف الحملة');
      setDetailsCampaign(null);
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ─── دوال المودال ───
  const openAdd = () => {
    setEditing(null);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 86400000);
    setForm({
      title: '',
      description: '',
      productId: null,
      targetCount: '',
      startsAt: today.toISOString().split('T')[0],
      endsAt: nextWeek.toISOString().split('T')[0],
      rewardType: 'cashback',
      rewardValue: '',
      rewardData: {
        codePrefix: 'GIFT',
        expiresInDays: 30,
        maxDiscount: '',
      },
    });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    let rd: any = {};
    try { rd = JSON.parse(c.rewardData || '{}'); } catch {}
    setForm({
      title: c.title || '',
      description: c.description || '',
      productId: c.productId,
      targetCount: String(c.targetCount || ''),
      startsAt: c.startsAt ? c.startsAt.split('T')[0] : '',
      endsAt: c.endsAt ? c.endsAt.split('T')[0] : '',
      rewardType: c.rewardType || 'cashback',
      rewardValue: String(c.rewardValue || ''),
      rewardData: {
        codePrefix: rd.codePrefix || 'GIFT',
        expiresInDays: rd.expiresInDays || 30,
        maxDiscount: rd.maxDiscount || '',
      },
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!form.title.trim()) return toast.warning('أدخل عنوان الحملة');
    if (!form.productId) return toast.warning('اختر المنتج');
    if (!form.targetCount || Number(form.targetCount) <= 0) return toast.warning('أدخل عدد الطلبات المطلوبة');
    if (!form.startsAt || !form.endsAt) return toast.warning('أدخل فترة الحملة');
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return toast.warning('تاريخ النهاية يجب أن يكون بعد البداية');
    if (!form.rewardValue || Number(form.rewardValue) <= 0) return toast.warning('أدخل قيمة المكافأة');

    if ((form.rewardType === 'shipping_code' || form.rewardType === 'product_code')) {
      const v = Number(form.rewardValue);
      if (v <= 0 || v > 100) return toast.warning('النسبة يجب أن تكون بين 1 و 100');
    }

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim(),
      productId: Number(form.productId),
      targetCount: Number(form.targetCount),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt + 'T23:59:59').toISOString(),
      rewardType: form.rewardType,
      rewardValue: Number(form.rewardValue),
      rewardData: JSON.stringify({
        codePrefix: form.rewardData.codePrefix || 'GIFT',
        expiresInDays: Number(form.rewardData.expiresInDays) || 30,
        maxDiscount: Number(form.rewardData.maxDiscount) || 0,
      }),
    };

    saveMutation.mutate(payload);
  };

  const confirmDelete = (c: any) => {
    Alert.alert(
      'حذف الحملة',
      `هل تريد حذف حملة "${c.title}" نهائياً؟\nسيتم حذف كل المشاركات والمكافآت المرتبطة.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(c.id) },
      ]
    );
  };

  // ─── اختيار المنتج ───
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 30);
    const q = productSearch.trim().toLowerCase();
    return (products as any[]).filter((p: any) => p.name?.toLowerCase().includes(q)).slice(0, 30);
  }, [products, productSearch]);

  const selectedProduct = useMemo(
    () => (products as any[]).find((p: any) => p.id === form.productId),
    [products, form.productId]
  );

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* ─── الإحصائيات ─── */}
      <View style={s.statsGrid}>
        <View style={[s.statCard, { borderTopColor: SUCCESS }]}>
          <Text style={[s.statVal, { color: SUCCESS }]}>{stats.active}</Text>
          <Text style={s.statLabel}>نشطة</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: PRIMARY }]}>
          <Text style={[s.statVal, { color: PRIMARY }]}>{stats.upcoming}</Text>
          <Text style={s.statLabel}>قادمة</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: '#6b7280' }]}>
          <Text style={[s.statVal, { color: '#6b7280' }]}>{stats.ended}</Text>
          <Text style={s.statLabel}>منتهية</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: SECONDARY }]}>
          <Text style={[s.statVal, { color: SECONDARY }]}>{stats.total}</Text>
          <Text style={s.statLabel}>الكل</Text>
        </View>
      </View>

      {/* ─── الفلاتر ─── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll}>
        {([
          ['active', 'نشطة'],
          ['upcoming', 'قادمة'],
          ['ended', 'منتهية'],
          ['all', 'الكل'],
        ] as [FilterKey, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.chip, filter === key && s.chipActive]}
            onPress={() => setFilter(key)}>
            <Text style={[s.chipTxt, filter === key && s.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ─── زر الإضافة ─── */}
      <TouchableOpacity style={s.addBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={s.addBtnTxt}>إنشاء تحدي جديد</Text>
      </TouchableOpacity>

      {/* ─── القائمة ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="trophy-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد تحديات</Text>
            <Text style={s.emptySubTxt}>اضغط "إنشاء تحدي جديد" للبدء</Text>
          </View>
        }
        renderItem={({ item: c }) => {
          const st = getCampaignStatus(c);
          const productImg = getProductImage(c.product);
          const rewardMeta = REWARD_TYPES.find(r => r.key === c.rewardType) || REWARD_TYPES[0];

          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.85}
              onPress={() => setDetailsCampaign(c)}>

              {/* الحالة */}
              <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
              </View>

              {/* المنتج */}
              <View style={s.cardHeader}>
                {productImg ? (
                  <Image source={{ uri: productImg }} style={s.productImg} resizeMode="cover" />
                ) : (
                  <View style={[s.productImg, s.productImgPlaceholder]}>
                    <Ionicons name="cube-outline" size={24} color="#d1d5db" />
                  </View>
                )}
                <View style={s.productInfo}>
                  <Text style={s.campaignTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={s.productName} numberOfLines={1}>
                    {c.product?.name || `منتج #${c.productId}`}
                  </Text>
                </View>
              </View>

              {/* التفاصيل */}
              <View style={s.detailsRow}>
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>الهدف</Text>
                  <Text style={s.detailVal}>{c.targetCount} طلب</Text>
                </View>
                <View style={s.detailDivider} />
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>المكافأة</Text>
                  <Text style={[s.detailVal, { color: rewardMeta.color }]} numberOfLines={1}>
                    {getRewardText(c)}
                  </Text>
                </View>
                <View style={s.detailDivider} />
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>ينتهي</Text>
                  <Text style={s.detailVal}>{fmtDate(c.endsAt)}</Text>
                </View>
              </View>

              {/* الأزرار */}
              <View style={s.actionsRow}>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={(e) => { e.stopPropagation(); openEdit(c); }}>
                  <Ionicons name="create-outline" size={14} color={SECONDARY} />
                  <Text style={[s.actionBtnTxt, { color: SECONDARY }]}>تعديل</Text>
                </TouchableOpacity>
                <View style={s.actionDivider} />
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={(e) => { e.stopPropagation(); confirmDelete(c); }}>
                  <Ionicons name="trash-outline" size={14} color={DANGER} />
                  <Text style={[s.actionBtnTxt, { color: DANGER }]}>حذف</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── مودال إنشاء / تعديل ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>

              <View style={s.modalHeader}>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
                <Text style={s.modalTitle}>
                  {editing ? 'تعديل الحملة' : 'إنشاء تحدي جديد'}
                </Text>
                <Ionicons name="trophy" size={22} color={SECONDARY} />
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* العنوان */}
                <Text style={s.inputLabel}>عنوان التحدي *</Text>
                <TextInput
                  style={s.input}
                  placeholder="مثال: بِع 7 قطع واحصل على كاش باك"
                  value={form.title}
                  onChangeText={v => setForm((p: any) => ({ ...p, title: v }))}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />

                {/* الوصف */}
                <Text style={s.inputLabel}>الوصف (اختياري)</Text>
                <TextInput
                  style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="وصف التحدي..."
                  value={form.description}
                  onChangeText={v => setForm((p: any) => ({ ...p, description: v }))}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                  multiline
                />

                {/* المنتج */}
                <Text style={s.inputLabel}>المنتج *</Text>
                <TouchableOpacity
                  style={s.productPicker}
                  onPress={() => setProductPickerOpen(true)}>
                  <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  <Text style={[s.productPickerTxt, !selectedProduct && { color: '#9ca3af' }]} numberOfLines={1}>
                    {selectedProduct ? selectedProduct.name : 'اختر المنتج'}
                  </Text>
                </TouchableOpacity>

                {/* عدد الطلبات */}
                <Text style={s.inputLabel}>عدد الطلبات المطلوبة *</Text>
                <TextInput
                  style={s.input}
                  placeholder="7"
                  value={form.targetCount}
                  onChangeText={v => setForm((p: any) => ({ ...p, targetCount: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="numeric"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />

                {/* الفترة */}
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>تاريخ البداية *</Text>
                    <TextInput
                      style={s.input}
                      placeholder="2026-10-01"
                      value={form.startsAt}
                      onChangeText={v => setForm((p: any) => ({ ...p, startsAt: v }))}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>تاريخ النهاية *</Text>
                    <TextInput
                      style={s.input}
                      placeholder="2026-10-07"
                      value={form.endsAt}
                      onChangeText={v => setForm((p: any) => ({ ...p, endsAt: v }))}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                {/* نوع المكافأة */}
                <Text style={s.sectionTitle}>المكافأة</Text>
                <View style={s.rewardTypeGrid}>
                  {REWARD_TYPES.map(rt => (
                    <TouchableOpacity
                      key={rt.key}
                      style={[s.rewardTypeBtn, form.rewardType === rt.key && { borderColor: rt.color, backgroundColor: rt.color + '10' }]}
                      onPress={() => setForm((p: any) => ({ ...p, rewardType: rt.key }))}>
                      <Ionicons name={rt.icon as any} size={22} color={form.rewardType === rt.key ? rt.color : '#6b7280'} />
                      <Text style={[s.rewardTypeLabel, form.rewardType === rt.key && { color: rt.color }]}>
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* قيمة المكافأة */}
                <Text style={s.inputLabel}>
                  {form.rewardType === 'cashback' ? 'قيمة الكاش باك (د.ع) *' :
                   form.rewardType === 'free_shipping' ? 'قيمة (اتركها 100)' :
                   'نسبة الخصم (%) *'}
                </Text>
                <TextInput
                  style={s.input}
                  placeholder={form.rewardType === 'cashback' ? '7000' : '50'}
                  value={form.rewardValue}
                  onChangeText={v => setForm((p: any) => ({ ...p, rewardValue: v.replace(/[^0-9.]/g, '') }))}
                  keyboardType="numeric"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                  editable={form.rewardType !== 'free_shipping'}
                />
                {form.rewardType === 'free_shipping' && (
                  <TouchableOpacity
                    style={s.autoFillBtn}
                    onPress={() => setForm((p: any) => ({ ...p, rewardValue: '100' }))}>
                    <Ionicons name="flash" size={14} color={PRIMARY} />
                    <Text style={s.autoFillTxt}>استخدم 100% (توصيل مجاني)</Text>
                  </TouchableOpacity>
                )}

                {/* خيارات الكود */}
                {(form.rewardType === 'shipping_code' || form.rewardType === 'product_code' || form.rewardType === 'free_shipping') && (
                  <>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.inputLabel}>بادئة الكود</Text>
                        <TextInput
                          style={s.input}
                          placeholder="GIFT"
                          value={form.rewardData.codePrefix}
                          onChangeText={(v: string) => setForm((p: any) => ({ ...p, rewardData: { ...p.rewardData, codePrefix: v.toUpperCase() } }))}
                          textAlign="right"
                          placeholderTextColor="#9ca3af"
                          autoCapitalize="characters"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.inputLabel}>صلاحية الكود (أيام)</Text>
                        <TextInput
                          style={s.input}
                          placeholder="30"
                          value={String(form.rewardData.expiresInDays)}
                          onChangeText={(v: string) => setForm((p: any) => ({ ...p, rewardData: { ...p.rewardData, expiresInDays: v.replace(/[^0-9]/g, '') } }))}
                          keyboardType="numeric"
                          textAlign="right"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>

                    <Text style={s.inputLabel}>سقف الخصم (د.ع) — اختياري</Text>
                    <TextInput
                      style={s.input}
                      placeholder="اتركه فارغاً لبلا سقف"
                      value={String(form.rewardData.maxDiscount || '')}
                      onChangeText={(v: string) => setForm((p: any) => ({ ...p, rewardData: { ...p.rewardData, maxDiscount: v.replace(/[^0-9]/g, '') } }))}
                      keyboardType="numeric"
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />
                  </>
                )}

              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                  <Text style={s.cancelBtnTxt}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={s.saveBtnTxt}>{editing ? 'حفظ التعديلات' : 'إنشاء التحدي'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── مودال اختيار المنتج ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal visible={productPickerOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setProductPickerOpen(false); setProductSearch(''); }}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>اختر المنتج</Text>
              <Ionicons name="cube" size={22} color={PRIMARY} />
            </View>

            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={16} color="#9ca3af" />
              <TextInput
                style={s.searchInput}
                placeholder="ابحث عن منتج..."
                value={productSearch}
                onChangeText={setProductSearch}
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {filteredProducts.length === 0 ? (
                <Text style={s.emptySmall}>لا توجد منتجات</Text>
              ) : (
                filteredProducts.map((p: any) => {
                  const img = getProductImage(p);
                  const isSelected = form.productId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[s.productRow, isSelected && s.productRowActive]}
                      onPress={() => {
                        setForm((prev: any) => ({ ...prev, productId: p.id }));
                        setProductPickerOpen(false);
                        setProductSearch('');
                      }}>
                      {img ? (
                        <Image source={{ uri: img }} style={s.productRowImg} resizeMode="cover" />
                      ) : (
                        <View style={[s.productRowImg, s.productRowImgPlaceholder]}>
                          <Ionicons name="cube-outline" size={20} color="#d1d5db" />
                        </View>
                      )}
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={s.productRowName} numberOfLines={1}>{p.name}</Text>
                        <Text style={s.productRowPrice}>
                          {Number(p.wholesalePrice || 0).toLocaleString()} د.ع
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={SUCCESS} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── مودال تفاصيل الحملة ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {detailsCampaign && (
        <CampaignDetailsModal
          campaign={detailsCampaign}
          onClose={() => setDetailsCampaign(null)}
          onDeleted={() => setDetailsCampaign(null)}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// ─── مودال تفاصيل الحملة ───
// ══════════════════════════════════════════════════════════════════
function CampaignDetailsModal({ campaign, onClose }: any) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-details', campaign.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/admin/campaigns/${campaign.id}`);
      return data;
    },
    enabled: !!campaign?.id,
  });

  const stats = data?.stats || {};
  const participants = data?.participants || [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalCard, { maxHeight: '92%' }]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>تفاصيل التحدي</Text>
            <Ionicons name="stats-chart" size={22} color={PRIMARY} />
          </View>

          {isLoading ? (
            <View style={s.center}>
              <ActivityIndicator color={PRIMARY} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.modalBody}>

              {/* العنوان */}
              <View style={s.detailsHeader}>
                <Text style={s.detailsTitle}>{campaign.title}</Text>
                {!!campaign.description && (
                  <Text style={s.detailsDesc}>{campaign.description}</Text>
                )}
              </View>

              {/* الإحصائيات */}
              <View style={s.detailsStats}>
                <View style={s.detailsStatItem}>
                  <Text style={[s.detailsStatVal, { color: PRIMARY }]}>
                    {stats.participantsCount || 0}
                  </Text>
                  <Text style={s.detailsStatLbl}>مشارك</Text>
                </View>
                <View style={s.detailsStatDivider} />
                <View style={s.detailsStatItem}>
                  <Text style={[s.detailsStatVal, { color: SUCCESS }]}>
                    {stats.countedOrders || 0}
                  </Text>
                  <Text style={s.detailsStatLbl}>طلب محتسب</Text>
                </View>
                <View style={s.detailsStatDivider} />
                <View style={s.detailsStatItem}>
                  <Text style={[s.detailsStatVal, { color: SECONDARY }]}>
                    {stats.winnersCount || 0}
                  </Text>
                  <Text style={s.detailsStatLbl}>وصلوا الهدف</Text>
                </View>
              </View>

              {/* قائمة المشاركين */}
              <Text style={s.sectionTitle}>المشاركون ({participants.length})</Text>

              {participants.length === 0 ? (
                <Text style={s.emptySmall}>لا يوجد مشاركون بعد</Text>
              ) : (
                participants.map((p: any) => {
                  const progress = Math.min(100, Math.round((p.progressCount / campaign.targetCount) * 100));
                  return (
                    <View key={p.id} style={s.participantRow}>
                      <View style={s.participantInfo}>
                        <Text style={s.participantName}>{p.user?.storeName || `#${p.userId}`}</Text>
                        <View style={s.progressTrack}>
                          <View
                            style={[
                              s.progressFill,
                              {
                                width: `${progress}%`,
                                backgroundColor: p.targetReached ? SUCCESS : PRIMARY,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={s.participantStats}>
                        <Text style={[s.participantCount, p.targetReached && { color: SUCCESS }]}>
                          {p.progressCount} / {campaign.targetCount}
                        </Text>
                        {p.targetReached && (
                          <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                        )}
                      </View>
                    </View>
                  );
                })
              )}

            </ScrollView>
          )}

          <View style={s.modalFooter}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnTxt}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// ─── الأنماط ───
// ══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptySubTxt: { fontSize: 13, color: '#9ca3af' },
  emptySmall: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },

  // Stats
  statsGrid: { flexDirection: 'row', padding: 10, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10,
    alignItems: 'center', borderTopWidth: 3,
    borderWidth: 1, borderColor: '#e8edf2', gap: 2,
  },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },

  // Filters
  filtersScroll: { maxHeight: 46, paddingHorizontal: 12, marginBottom: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: '#f3f4f6', marginRight: 7,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  chipTxt: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTxtActive: { color: PRIMARY },

  // Add
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 14,
    marginHorizontal: 12, marginBottom: 12, paddingVertical: 13,
  },
  addBtnTxt: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Card
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statusPill: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 2,
  },
  statusTxt: { fontSize: 10, fontWeight: 'bold' },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  productImg: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#f3f4f6' },
  productImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, alignItems: 'flex-end' },
  campaignTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  productName: { fontSize: 11, color: '#6b7280', textAlign: 'right', marginTop: 3 },

  detailsRow: {
    flexDirection: 'row', backgroundColor: '#f8fafc',
    borderRadius: 12, padding: 10, marginBottom: 10,
  },
  detailItem: { flex: 1, alignItems: 'center', gap: 2 },
  detailDivider: { width: 1, backgroundColor: '#e8edf2' },
  detailLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '600' },
  detailVal: { fontSize: 11, fontWeight: 'bold', color: '#111827' },

  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  actionBtnTxt: { fontSize: 12, fontWeight: '600' },
  actionDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  modalBody: { padding: 20, paddingBottom: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  // Inputs
  inputLabel: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 6, marginTop: 12, fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb',
  },
  row: { flexDirection: 'row', gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: 'bold', color: PRIMARY, textAlign: 'right',
    marginTop: 18, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 6,
  },

  // Product picker
  productPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f9fafb',
  },
  productPickerTxt: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' },

  // Reward type grid
  rewardTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rewardTypeBtn: {
    width: '48%', paddingVertical: 14, borderRadius: 12,
    borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
    alignItems: 'center', gap: 6,
  },
  rewardTypeLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textAlign: 'center' },

  autoFillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 6,
    backgroundColor: PRIMARY + '10', borderRadius: 10, alignSelf: 'flex-start',
  },
  autoFillTxt: { fontSize: 11, color: PRIMARY, fontWeight: '600' },

  // Buttons
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnTxt: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  saveBtn: {
    flex: 2, height: 48, borderRadius: 12, backgroundColor: PRIMARY,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#f8fafc', borderRadius: 12,
    paddingHorizontal: 12, height: 42,
    borderWidth: 1.5, borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' },

  // Product row (picker)
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 12, marginBottom: 6,
    backgroundColor: '#f8fafc',
  },
  productRowActive: { backgroundColor: PRIMARY + '10', borderWidth: 1.5, borderColor: PRIMARY },
  productRowImg: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#f3f4f6' },
  productRowImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productRowName: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'right' },
  productRowPrice: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  // Details modal
  detailsHeader: { alignItems: 'flex-end', marginBottom: 16 },
  detailsTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  detailsDesc: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  detailsStats: {
    flexDirection: 'row', backgroundColor: '#f8fafc',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  detailsStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  detailsStatDivider: { width: 1, backgroundColor: '#e8edf2' },
  detailsStatVal: { fontSize: 20, fontWeight: 'bold' },
  detailsStatLbl: { fontSize: 10, color: '#6b7280', fontWeight: '600' },

  // Participants
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  participantInfo: { flex: 1, gap: 6 },
  participantName: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'right' },
  progressTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  participantStats: { alignItems: 'center', gap: 4 },
  participantCount: { fontSize: 12, fontWeight: 'bold', color: PRIMARY },
});