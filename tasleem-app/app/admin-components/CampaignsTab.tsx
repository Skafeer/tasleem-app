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
const BORDER = '#e8edf2';

const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

const REWARD_TYPES = [
  { key: 'cashback',      label: 'كاش باك',        icon: 'cash-outline',        color: SUCCESS,   bg: '#ecfdf5', desc: 'يُضاف لرصيد التاجر' },
  { key: 'shipping_code', label: 'خصم توصيل',      icon: 'bicycle-outline',     color: PRIMARY,   bg: '#f0f9fa', desc: 'نسبة على التوصيل' },
  { key: 'free_shipping', label: 'توصيل مجاني',    icon: 'car-sport-outline',   color: PURPLE,    bg: '#f5f3ff', desc: 'توصيل مجاني كامل' },
  { key: 'product_code',  label: 'خصم منتج',       icon: 'pricetag-outline',    color: SECONDARY, bg: '#fffbeb', desc: 'نسبة على المنتجات' },
];

type FilterKey = 'active' | 'upcoming' | 'ended';

function getCampaignStatus(c: any): { key: FilterKey; label: string; color: string; icon: string } {
  if (!c.isActive) return { key: 'ended', label: 'معطل', color: '#6b7280', icon: 'close-circle-outline' };
  const now = new Date();
  const starts = new Date(c.startsAt);
  const ends = new Date(c.endsAt);
  if (now < starts) return { key: 'upcoming', label: 'قادم', color: PRIMARY, icon: 'time-outline' };
  if (now > ends) return { key: 'ended', label: 'منتهي', color: '#6b7280', icon: 'time-outline' };
  return { key: 'active', label: 'نشط', color: SUCCESS, icon: 'flash' };
}

function getProductImage(product: any): string | null {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs[0] || product.imageUrl || null;
}

function getRewardText(c: any): string {
  if (!c) return '';
  if (c.rewardType === 'cashback')      return `${fmt(c.rewardValue)} د.ع`;
  if (c.rewardType === 'shipping_code') return `خصم ${c.rewardValue}%`;
  if (c.rewardType === 'free_shipping') return 'مجاني';
  if (c.rewardType === 'product_code')  return `خصم ${c.rewardValue}%`;
  return '';
}

export default function CampaignsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('active');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detailsCampaign, setDetailsCampaign] = useState<any>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

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

  // ─── Stats ───
  const stats = useMemo(() => {
    const now = new Date();
    const list = campaigns as any[];
    const active   = list.filter((c: any) => c.isActive && new Date(c.startsAt) <= now && new Date(c.endsAt) >= now).length;
    const upcoming = list.filter((c: any) => c.isActive && new Date(c.startsAt) > now).length;
    const ended    = list.filter((c: any) => !c.isActive || new Date(c.endsAt) < now).length;
    return { active, upcoming, ended };
  }, [campaigns]);

  // ─── Filter ───
  const filtered = useMemo(() => {
    const now = new Date();
    return (campaigns as any[]).filter((c: any) => {
      if (filter === 'active')   return c.isActive && new Date(c.startsAt) <= now && new Date(c.endsAt) >= now;
      if (filter === 'upcoming') return c.isActive && new Date(c.startsAt) > now;
      if (filter === 'ended')    return !c.isActive || new Date(c.endsAt) < now;
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
      toast.success(editing ? 'تم تعديل التحدي' : 'تم إنشاء التحدي');
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
      toast.success('تم حذف التحدي');
      setDetailsCampaign(null);
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ─── Modal ───
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
      rewardData: { codePrefix: 'GIFT', expiresInDays: 30, maxDiscount: '' },
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
    if (!form.title.trim()) return toast.warning('أدخل عنوان التحدي');
    if (!form.productId) return toast.warning('اختر المنتج');
    if (!form.targetCount || Number(form.targetCount) <= 0) return toast.warning('أدخل عدد الطلبات');
    if (!form.startsAt || !form.endsAt) return toast.warning('أدخل الفترة');
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
      'حذف التحدي',
      `هل تريد حذف "${c.title}" نهائياً؟\nسيتم حذف كل المشاركات والمكافآت.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(c.id) },
      ]
    );
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return (products as any[]).slice(0, 30);
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

      {/* ─── Stats ─── */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: SUCCESS }]}>{stats.active}</Text>
          <Text style={s.statLbl}>نشطة</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: PRIMARY }]}>{stats.upcoming}</Text>
          <Text style={s.statLbl}>قادمة</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: '#6b7280' }]}>{stats.ended}</Text>
          <Text style={s.statLbl}>منتهية</Text>
        </View>
      </View>

      {/* ─── Filters ─── */}
      <View style={s.filtersWrap}>
        {([
          ['active', 'نشطة'],
          ['upcoming', 'قادمة'],
          ['ended', 'منتهية'],
        ] as [FilterKey, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.chip, filter === key && s.chipActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.7}>
            <Text style={[s.chipTxt, filter === key && s.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Add Button ─── */}
      <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={s.addBtnTxt}>إنشاء تحدي جديد</Text>
      </TouchableOpacity>

      {/* ─── List ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="trophy-outline" size={36} color={PRIMARY} />
            </View>
            <Text style={s.emptyTitle}>لا توجد تحديات</Text>
            <Text style={s.emptySub}>اضغط "إنشاء تحدي جديد" للبدء</Text>
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

              {/* Top: Image + Info + Status */}
              <View style={s.cardTop}>
                {productImg ? (
                  <Image source={{ uri: productImg }} style={s.productImg} resizeMode="cover" />
                ) : (
                  <View style={[s.productImg, s.productImgPlaceholder]}>
                    <Ionicons name="cube-outline" size={24} color="#d1d5db" />
                  </View>
                )}

                <View style={s.infoWrap}>
                  <View style={[s.statusBadge, { backgroundColor: st.color + '15' }]}>
                    <Ionicons name={st.icon as any} size={10} color={st.color} />
                    <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                  </View>
                  <Text style={s.campaignTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={s.productName} numberOfLines={1}>
                    {c.product?.name || `منتج #${c.productId}`}
                  </Text>
                </View>
              </View>

              {/* Details Row */}
              <View style={s.detailsRow}>
                <View style={s.detailItem}>
                  <Ionicons name="flag-outline" size={12} color="#9ca3af" />
                  <Text style={s.detailVal}>{c.targetCount}</Text>
                  <Text style={s.detailLbl}>طلب</Text>
                </View>
                <View style={s.detailDivider} />
                <View style={s.detailItem}>
                  <Ionicons name={rewardMeta.icon as any} size={12} color={rewardMeta.color} />
                  <Text style={[s.detailVal, { color: rewardMeta.color }]} numberOfLines={1}>
                    {getRewardText(c)}
                  </Text>
                </View>
                <View style={s.detailDivider} />
                <View style={s.detailItem}>
                  <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                  <Text style={s.detailVal} numberOfLines={1}>{fmtDate(c.endsAt)}</Text>
                </View>
              </View>

              {/* Actions */}
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
                <View style={s.actionDivider} />
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={(e) => { e.stopPropagation(); setDetailsCampaign(c); }}>
                  <Ionicons name="stats-chart-outline" size={14} color={PRIMARY} />
                  <Text style={[s.actionBtnTxt, { color: PRIMARY }]}>تفاصيل</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ══════════════════════════════════════════════════════ */}
      {/* ─── Modal: Create / Edit ─── */}
      {/* ══════════════════════════════════════════════════════ */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>

              <View style={s.modalHeader}>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
                <Text style={s.modalTitle}>
                  {editing ? 'تعديل التحدي' : 'إنشاء تحدي جديد'}
                </Text>
                <View style={{ width: 22 }} />
              </View>

              <ScrollView
                contentContainerStyle={s.modalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">

                {/* Title */}
                <Text style={s.inputLabel}>عنوان التحدي</Text>
                <TextInput
                  style={s.input}
                  placeholder="مثال: بِع 7 قطع واحصل على كاش باك"
                  value={form.title}
                  onChangeText={v => setForm((p: any) => ({ ...p, title: v }))}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />

                {/* Description */}
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

                {/* Product Picker */}
                <Text style={s.inputLabel}>المنتج</Text>
                <TouchableOpacity
                  style={s.pickerBtn}
                  onPress={() => setProductPickerOpen(true)}
                  activeOpacity={0.7}>
                  <Ionicons name="chevron-down" size={18} color="#6b7280" />
                  <Text
                    style={[s.pickerTxt, !selectedProduct && { color: '#9ca3af' }]}
                    numberOfLines={1}>
                    {selectedProduct ? selectedProduct.name : 'اختر المنتج'}
                  </Text>
                </TouchableOpacity>

                {/* Target Count */}
                <Text style={s.inputLabel}>عدد الطلبات المطلوبة</Text>
                <TextInput
                  style={s.input}
                  placeholder="7"
                  value={form.targetCount}
                  onChangeText={v => setForm((p: any) => ({ ...p, targetCount: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="numeric"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />

                {/* Period */}
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>تاريخ البداية</Text>
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
                    <Text style={s.inputLabel}>تاريخ النهاية</Text>
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

                {/* Reward Type */}
                <Text style={s.sectionTitle}>نوع المكافأة</Text>
                <View style={s.rewardGrid}>
                  {REWARD_TYPES.map(rt => {
                    const isActive = form.rewardType === rt.key;
                    return (
                      <TouchableOpacity
                        key={rt.key}
                        style={[
                          s.rewardTypeBtn,
                          isActive && { borderColor: rt.color, backgroundColor: rt.color + '10' },
                        ]}
                        onPress={() => setForm((p: any) => ({ ...p, rewardType: rt.key }))}
                        activeOpacity={0.7}>
                        <Ionicons
                          name={rt.icon as any}
                          size={20}
                          color={isActive ? rt.color : '#6b7280'}
                        />
                        <Text style={[s.rewardTypeLbl, isActive && { color: rt.color }]}>
                          {rt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Reward Value */}
                <Text style={s.inputLabel}>
                  {form.rewardType === 'cashback' ? 'قيمة الكاش باك (د.ع)' : 'نسبة الخصم (%)'}
                </Text>
                <TextInput
                  style={s.input}
                  placeholder={form.rewardType === 'cashback' ? '7000' : '50'}
                  value={form.rewardValue}
                  onChangeText={v => setForm((p: any) => ({ ...p, rewardValue: v.replace(/[^0-9.]/g, '') }))}
                  keyboardType="numeric"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />

                {/* Code Options */}
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
                        <Text style={s.inputLabel}>الصلاحية (أيام)</Text>
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

      {/* ══════════════════════════════════════════════════════ */}
      {/* ─── Modal: Product Picker ─── */}
      {/* ══════════════════════════════════════════════════════ */}
      <Modal visible={productPickerOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => { setProductPickerOpen(false); setProductSearch(''); }}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>اختر المنتج</Text>
              <View style={{ width: 22 }} />
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
                      }}
                      activeOpacity={0.7}>
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
                        <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ─── Modal: Campaign Details ─── */}
      {/* ══════════════════════════════════════════════════════ */}
      {detailsCampaign && (
        <CampaignDetailsModal
          campaign={detailsCampaign}
          onClose={() => setDetailsCampaign(null)}
          onEdit={() => { setDetailsCampaign(null); openEdit(detailsCampaign); }}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// ─── Campaign Details Modal ───
// ══════════════════════════════════════════════════════════════
function CampaignDetailsModal({ campaign, onClose, onEdit }: any) {
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
            <TouchableOpacity onPress={onEdit}>
              <Ionicons name="create-outline" size={20} color={SECONDARY} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={PRIMARY} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.modalBody}>

              {/* Header Card */}
              <View style={s.detailsHeaderCard}>
                <Text style={s.detailsTitle}>{campaign.title}</Text>
                {!!campaign.description && (
                  <Text style={s.detailsDesc}>{campaign.description}</Text>
                )}
              </View>

              {/* Stats Grid */}
              <View style={s.detailsStatsGrid}>
                <View style={s.detailsStatBox}>
                  <View style={[s.detailsStatIcon, { backgroundColor: PRIMARY + '15' }]}>
                    <Ionicons name="people-outline" size={16} color={PRIMARY} />
                  </View>
                  <Text style={[s.detailsStatVal, { color: PRIMARY }]}>
                    {stats.participantsCount || 0}
                  </Text>
                  <Text style={s.detailsStatLbl}>مشارك</Text>
                </View>

                <View style={s.detailsStatBox}>
                  <View style={[s.detailsStatIcon, { backgroundColor: SUCCESS + '15' }]}>
                    <Ionicons name="checkmark-done-outline" size={16} color={SUCCESS} />
                  </View>
                  <Text style={[s.detailsStatVal, { color: SUCCESS }]}>
                    {stats.countedOrders || 0}
                  </Text>
                  <Text style={s.detailsStatLbl}>طلب محتسب</Text>
                </View>

                <View style={s.detailsStatBox}>
                  <View style={[s.detailsStatIcon, { backgroundColor: SECONDARY + '15' }]}>
                    <Ionicons name="trophy-outline" size={16} color={SECONDARY} />
                  </View>
                  <Text style={[s.detailsStatVal, { color: SECONDARY }]}>
                    {stats.winnersCount || 0}
                  </Text>
                  <Text style={s.detailsStatLbl}>وصلوا الهدف</Text>
                </View>
              </View>

              {/* Participants List */}
              <View style={s.sectionTitleRow}>
                <Ionicons name="people-outline" size={16} color={PRIMARY} />
                <Text style={s.sectionTitle}>المشاركون ({participants.length})</Text>
              </View>

              {participants.length === 0 ? (
                <Text style={s.emptySmall}>لا يوجد مشاركون بعد</Text>
              ) : (
                participants.map((p: any) => {
                  const progress = Math.min(100, Math.round((p.progressCount / campaign.targetCount) * 100));
                  return (
                    <View key={p.id} style={s.participantRow}>
                      <View style={s.participantRight}>
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
                      <View style={s.participantLeft}>
                        <Text style={[s.participantCount, p.targetReached && { color: SUCCESS }]}>
                          {p.progressCount}/{campaign.targetCount}
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

// ═════════════════════════════════════════════════════════════
// ─── الأنماط ───
// ═════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptySub: { fontSize: 13, color: '#9ca3af' },
  emptySmall: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: BORDER },
  statVal: { fontSize: 20, fontWeight: 'bold' },
  statLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  // ─── Filters ───
  filtersWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipTxt: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  chipTxtActive: { color: '#fff' },

  // ─── Add Button ───
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 13,
  },
  addBtnTxt: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // ─── List ───
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },

  // ─── Card ───
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 12,
  },
  productImg: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  productImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  infoWrap: {
    flex: 1, alignItems: 'flex-end', justifyContent: 'center', gap: 4,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTxt: { fontSize: 9, fontWeight: 'bold' },
  campaignTitle: {
    fontSize: 14, fontWeight: 'bold', color: '#111827',
    textAlign: 'right',
  },
  productName: {
    fontSize: 11, color: '#6b7280',
    textAlign: 'right',
  },

  // ─── Details Row ───
  detailsRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  detailDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },
  detailVal: { fontSize: 11, fontWeight: 'bold', color: '#111827' },
  detailLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  // ─── Actions ───
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  actionBtnTxt: { fontSize: 12, fontWeight: '600' },
  actionDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 6 },

  // ─── Empty ───
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },

  // ─── Modal ───
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  modalBody: { padding: 20, paddingBottom: 10 },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  // ─── Inputs ───
  inputLabel: {
    fontSize: 12, color: '#6b7280',
    textAlign: 'right',
    marginBottom: 6, marginTop: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, padding: 11,
    fontSize: 14, color: '#111827',
    backgroundColor: '#f9fafb',
  },
  row: { flexDirection: 'row', gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: 'bold', color: PRIMARY,
    textAlign: 'right',
    marginTop: 18, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    paddingBottom: 6,
  },

  // ─── Picker ───
  pickerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  pickerTxt: {
    flex: 1, fontSize: 14, color: '#111827',
    textAlign: 'right',
  },

  // ─── Reward Grid ───
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardTypeBtn: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    gap: 6,
  },
  rewardTypeLbl: {
    fontSize: 11, fontWeight: '700',
    color: '#6b7280',
  },

  // ─── Footer Buttons ───
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnTxt: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  saveBtn: {
    flex: 2, height: 48, borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: 'row-reverse',
    justifyContent: 'center', alignItems: 'center',
    gap: 8,
  },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // ─── Search ───
  searchWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1.5, borderColor: BORDER,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#111827',
    textAlign: 'right',
  },

  // ─── Product Row ───
  productRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
  },
  productRowActive: {
    backgroundColor: PRIMARY + '10',
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  productRowImg: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  productRowImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productRowName: {
    fontSize: 13, fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  productRowPrice: {
    fontSize: 11, color: '#6b7280',
    marginTop: 2,
  },

  // ─── Details Modal ───
  detailsHeaderCard: {
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailsTitle: {
    fontSize: 17, fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  detailsDesc: {
    fontSize: 12, color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  detailsStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  detailsStatBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailsStatIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  detailsStatVal: {
    fontSize: 18, fontWeight: 'bold',
  },
  detailsStatLbl: {
    fontSize: 10, color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },

  // ─── Section Title ───
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  // ─── Participant Row ───
  participantRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  participantRight: { flex: 1, gap: 6 },
  participantName: {
    fontSize: 13, fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  progressTrack: {
    height: 6, backgroundColor: '#f3f4f6',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  participantLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  participantCount: {
    fontSize: 12, fontWeight: 'bold',
    color: PRIMARY,
  },
});