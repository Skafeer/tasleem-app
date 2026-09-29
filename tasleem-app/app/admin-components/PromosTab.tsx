// tasleem-app/app/admin-components/PromosTab.tsx
import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Clipboard, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const INFO = '#3b82f6';
const PURPLE = '#8b5cf6';
const BG = '#f2f6f9';

const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─── نوع البيانات ──────────────────────────────────────────────
type PromoCode = {
  id: number;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountPercent: number;
  discountAmount: number;
  maxDiscount: number;
  targetType: 'all' | 'specific';
  targetUserIds: string;
  minCartAmount: number;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number;
  maxUsesPerUser: number;
  usedCount: number;
  isActive: boolean;
  stats?: { usageCount: number; totalDiscount: number; uniqueUsers: number };
};

type FilterKey = 'all' | 'active' | 'inactive' | 'expired' | 'exhausted';

// ─── حالة الكود ────────────────────────────────────────────────
function getPromoStatus(p: PromoCode): { label: string; color: string; bg: string } {
  const now = new Date();
  if (!p.isActive) return { label: 'معطل', color: '#6b7280', bg: '#f3f4f6' };
  if (p.startsAt && new Date(p.startsAt) > now) return { label: 'لم يبدأ', color: INFO, bg: '#eff6ff' };
  if (p.expiresAt && new Date(p.expiresAt) < now) return { label: 'منتهي', color: DANGER, bg: '#fef2f2' };
  if (p.maxUses > 0 && p.usedCount >= p.maxUses) return { label: 'مستهلك', color: SECONDARY, bg: '#fffbeb' };
  return { label: 'نشط', color: SUCCESS, bg: '#ecfdf5' };
}

export default function PromosTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null);
  const [statsPromo, setStatsPromo] = useState<PromoCode | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  // ── النموذج ──
  const [form, setForm] = useState<any>({
    code: '',
    title: '',
    description: '',
    discountType: 'percentage',
    discountPercent: '',
    discountAmount: '',
    maxDiscount: '',
    targetType: 'all',
    targetUserIds: [] as number[],
    minCartAmount: '',
    startsAt: '',
    expiresAt: '',
    maxUses: '',
    maxUsesPerUser: '1',
    isActive: true,
  });

  // ── جلب الأكواد ──
  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data } = await api.get('/api/promo-codes');
      return data as PromoCode[];
    },
    refetchInterval: 30000,
  });

  // ── جلب التجار (لاختيار تجار محددين) ──
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const merchants = useMemo(
    () => (users as any[]).filter((u: any) => u.role === 'merchant'),
    [users]
  );

  // ── Mutations ──
  const savePromo = useMutation({
    mutationFn: async (d: any) => {
      if (editPromo) {
        const { data } = await api.patch(`/api/promo-codes/${editPromo.id}`, d);
        return data;
      }
      const { data } = await api.post('/api/promo-codes', d);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success(editPromo ? 'تم تعديل الكود ✅' : 'تم إضافة الكود ✅');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحفظ'),
  });

  const togglePromo = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { data } = await api.patch(`/api/promo-codes/${id}`, { isActive });
      return data;
    },
    onSuccess: (_: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success(vars.isActive ? 'تم تفعيل الكود' : 'تم تعطيل الكود');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const deletePromo = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/promo-codes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('تم حذف الكود');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ── الإحصائيات العامة ──
  const stats = useMemo(() => {
    const list = promos as PromoCode[];
    const now = new Date();
    const active = list.filter(p =>
      p.isActive &&
      (!p.expiresAt || new Date(p.expiresAt) > now) &&
      (p.maxUses === 0 || p.usedCount < p.maxUses)
    ).length;
    const expired = list.filter(p =>
      p.expiresAt && new Date(p.expiresAt) < now
    ).length;
    const totalDiscount = list.reduce((s, p) => s + (p.stats?.totalDiscount || 0), 0);
    const totalUsages = list.reduce((s, p) => s + (p.stats?.usageCount || 0), 0);
    return { active, expired, totalDiscount, totalUsages, total: list.length };
  }, [promos]);

  // ── الفلترة والبحث ──
  const filtered = useMemo(() => {
    const list = promos as PromoCode[];
    const now = new Date();
    return list
      .filter(p => {
        if (filter === 'active') {
          return p.isActive && (!p.expiresAt || new Date(p.expiresAt) > now) && (p.maxUses === 0 || p.usedCount < p.maxUses);
        }
        if (filter === 'inactive') return !p.isActive;
        if (filter === 'expired') return p.expiresAt && new Date(p.expiresAt) < now;
        if (filter === 'exhausted') return p.maxUses > 0 && p.usedCount >= p.maxUses;
        return true;
      })
      .filter(p => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
      })
      .sort((a, b) => b.id - a.id);
  }, [promos, filter, search]);

  // ── دوال المودال ──
  const openAdd = () => {
    setEditPromo(null);
    setForm({
      code: '',
      title: '',
      description: '',
      discountType: 'percentage',
      discountPercent: '',
      discountAmount: '',
      maxDiscount: '',
      targetType: 'all',
      targetUserIds: [],
      minCartAmount: '',
      startsAt: '',
      expiresAt: '',
      maxUses: '',
      maxUsesPerUser: '1',
      isActive: true,
    });
    setActiveTab('basic');
    setShowModal(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditPromo(p);
    setForm({
      code: p.code,
      title: p.title || '',
      description: p.description || '',
      discountType: p.discountType || 'percentage',
      discountPercent: p.discountPercent ? String(p.discountPercent) : '',
      discountAmount: p.discountAmount ? String(p.discountAmount) : '',
      maxDiscount: p.maxDiscount ? String(p.maxDiscount) : '',
      targetType: p.targetType || 'all',
      targetUserIds: p.targetUserIds
        ? p.targetUserIds.split(',').map((s: string) => Number(s.trim())).filter(Boolean)
        : [],
      minCartAmount: p.minCartAmount ? String(p.minCartAmount) : '',
      startsAt: p.startsAt ? p.startsAt.split('T')[0] : '',
      expiresAt: p.expiresAt ? p.expiresAt.split('T')[0] : '',
      maxUses: p.maxUses ? String(p.maxUses) : '',
      maxUsesPerUser: p.maxUsesPerUser ? String(p.maxUsesPerUser) : '1',
      isActive: p.isActive,
    });
    setActiveTab('basic');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPromo(null);
  };

  const handleSave = () => {
    if (!form.code.trim()) return toast.warning('يرجى إدخال الكود');
    if (!form.title.trim()) return toast.warning('يرجى إدخال عنوان الكود');

    if (form.discountType === 'percentage') {
      const pct = Number(form.discountPercent);
      if (!pct || pct <= 0 || pct > 100) return toast.warning('نسبة الخصم يجب أن تكون بين 1 و 100');
    } else {
      const amt = Number(form.discountAmount);
      if (!amt || amt <= 0) return toast.warning('مبلغ الخصم يجب أن يكون أكبر من صفر');
    }

    if (form.targetType === 'specific' && form.targetUserIds.length === 0) {
      return toast.warning('اختر تاجراً واحداً على الأقل');
    }

    savePromo.mutate({
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountPercent: form.discountType === 'percentage' ? Number(form.discountPercent) : 0,
      discountAmount: form.discountType === 'fixed' ? Number(form.discountAmount) : 0,
      maxDiscount: Number(form.maxDiscount) || 0,
      targetType: form.targetType,
      targetUserIds: form.targetType === 'specific' ? form.targetUserIds.join(',') : '',
      minCartAmount: Number(form.minCartAmount) || 0,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59').toISOString() : null,
      maxUses: Number(form.maxUses) || 0,
      maxUsesPerUser: Number(form.maxUsesPerUser) || 1,
      isActive: form.isActive,
    });
  };

  const confirmDelete = (p: PromoCode) => {
    Alert.alert('حذف الكود', `هل تريد حذف كود "${p.code}" نهائياً؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deletePromo.mutate(p.id) },
    ]);
  };

  const copyCode = (code: string) => {
    Clipboard.setString(code);
    toast.success(`تم نسخ الكود: ${code}`);
  };

  // ── إدارة اختيار التجار ──
  const toggleUserSelection = (userId: number) => {
    setForm((prev: any) => {
      const selected = prev.targetUserIds as number[];
      return {
        ...prev,
        targetUserIds: selected.includes(userId)
          ? selected.filter((id) => id !== userId)
          : [...selected, userId],
      };
    });
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={s.loadingTxt}>جاري تحميل الأكواد...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* ─── الإحصائيات ─── */}
      <View style={s.statsGrid}>
        <View style={[s.statCard, { borderTopColor: SUCCESS }]}>
          <Text style={[s.statVal, { color: SUCCESS }]}>{stats.active}</Text>
          <Text style={s.statLabel}>نشط</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: DANGER }]}>
          <Text style={[s.statVal, { color: DANGER }]}>{stats.expired}</Text>
          <Text style={s.statLabel}>منتهي</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: PURPLE }]}>
          <Text style={[s.statVal, { color: PURPLE }]}>{stats.totalUsages}</Text>
          <Text style={s.statLabel}>استخدام</Text>
        </View>
        <View style={[s.statCard, { borderTopColor: PRIMARY }]}>
          <Text style={[s.statVal, { color: PRIMARY }]}>{fmt(stats.totalDiscount)}</Text>
          <Text style={s.statLabel}>خصومات د.ع</Text>
        </View>
      </View>

      {/* ─── البحث ─── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="ابحث بالكود أو العنوان..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
          textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ─── الفلاتر ─── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll}>
        {([
          ['all', 'الكل', stats.total],
          ['active', 'نشط', stats.active],
          ['expired', 'منتهي', stats.expired],
          ['exhausted', 'مستهلك', 0],
          ['inactive', 'معطل', 0],
        ] as [FilterKey, string, number][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.chip, filter === key && s.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[s.chipTxt, filter === key && s.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ─── زر الإضافة ─── */}
      <TouchableOpacity style={s.addBtn} onPress={openAdd}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={s.addBtnTxt}>إضافة كود خصم جديد</Text>
      </TouchableOpacity>

      {/* ─── القائمة ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="pricetag-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد أكواد</Text>
            <Text style={s.emptySubTxt}>جرب تغيير الفلتر أو البحث</Text>
          </View>
        }
        renderItem={({ item: p }) => {
          const st = getPromoStatus(p);
          const usagePct = p.maxUses > 0 ? Math.min(100, (p.usedCount / p.maxUses) * 100) : 0;

          return (
            <View style={[s.card, !p.isActive && s.cardInactive]}>

              {/* رأس الكارد */}
              <View style={s.cardHeader}>
                <View style={s.codeBox}>
                  <View style={[s.iconBox, { backgroundColor: st.bg }]}>
                    <Ionicons name="pricetag" size={24} color={st.color} />
                  </View>
                  <View style={s.codeInfo}>
                    <TouchableOpacity style={s.codeRow} onPress={() => copyCode(p.code)}>
                      <Text style={[s.code, !p.isActive && { color: '#9ca3af' }]}>{p.code}</Text>
                      <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                    </TouchableOpacity>
                    <Text style={s.title} numberOfLines={1}>{p.title || 'بدون عنوان'}</Text>
                  </View>
                </View>

                <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {/* تفاصيل الخصم */}
              <View style={s.detailsRow}>
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>الخصم</Text>
                  <Text style={[s.detailVal, { color: SECONDARY }]}>
                    {p.discountType === 'percentage' ? `${p.discountPercent}%` : `${fmt(p.discountAmount)} د.ع`}
                  </Text>
                </View>
                {p.maxDiscount > 0 && (
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>السقف</Text>
                    <Text style={s.detailVal}>{fmt(p.maxDiscount)}</Text>
                  </View>
                )}
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>النطاق</Text>
                  <Text style={s.detailVal}>
                    {p.targetType === 'all' ? 'الجميع' : 'محدد'}
                  </Text>
                </View>
                {p.minCartAmount > 0 && (
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>الحد الأدنى</Text>
                    <Text style={s.detailVal}>{fmt(p.minCartAmount)}</Text>
                  </View>
                )}
              </View>

              {/* شريط الاستخدام */}
              {p.maxUses > 0 && (
                <View style={s.usageBox}>
                  <View style={s.usageHeader}>
                    <Text style={s.usageTxt}>
                      {p.usedCount} / {p.maxUses} استخدام
                    </Text>
                    <Text style={s.usagePct}>{Math.round(usagePct)}%</Text>
                  </View>
                  <View style={s.usageTrack}>
                    <View
                      style={[
                        s.usageFill,
                        {
                          width: `${usagePct}%`,
                          backgroundColor: usagePct >= 100 ? DANGER : usagePct >= 70 ? SECONDARY : SUCCESS,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* الصلاحية */}
              {(p.startsAt || p.expiresAt) && (
                <View style={s.datesRow}>
                  {p.startsAt && (
                    <View style={s.dateItem}>
                      <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
                      <Text style={s.dateTxt}>من {fmtDate(p.startsAt)}</Text>
                    </View>
                  )}
                  {p.expiresAt && (
                    <View style={s.dateItem}>
                      <Ionicons name="calendar-outline" size={11} color="#9ca3af" />
                      <Text style={s.dateTxt}>إلى {fmtDate(p.expiresAt)}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={s.divider} />

              {/* الأزرار */}
              <View style={s.actionsRow}>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => setStatsPromo(p)}
                >
                  <Ionicons name="stats-chart-outline" size={14} color={INFO} />
                  <Text style={[s.actionBtnTxt, { color: INFO }]}>إحصائيات</Text>
                </TouchableOpacity>

                <View style={s.actionDivider} />

                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => openEdit(p)}
                >
                  <Ionicons name="create-outline" size={14} color={SECONDARY} />
                  <Text style={[s.actionBtnTxt, { color: SECONDARY }]}>تعديل</Text>
                </TouchableOpacity>

                <View style={s.actionDivider} />

                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => confirmDelete(p)}
                >
                  <Ionicons name="trash-outline" size={14} color={DANGER} />
                  <Text style={[s.actionBtnTxt, { color: DANGER }]}>حذف</Text>
                </TouchableOpacity>
              </View>

              {/* زر التفعيل */}
              <TouchableOpacity
                style={s.toggleRow}
                onPress={() => togglePromo.mutate({ id: p.id, isActive: !p.isActive })}
                disabled={togglePromo.isPending}
              >
                <View style={[s.toggleTrack, p.isActive && s.toggleTrackOn]}>
                  <View style={[s.toggleThumb, p.isActive && s.toggleThumbOn]} />
                </View>
                <Text style={[s.toggleLabel, { color: p.isActive ? SUCCESS : '#9ca3af' }]}>
                  {p.isActive ? 'الكود فعال' : 'الكود معطل'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* ══════════════════════════════════════════════════════ */}
      {/* ─── مودال الإضافة / التعديل ─── */}
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
                  {editPromo ? 'تعديل كود الخصم' : 'إضافة كود خصم'}
                </Text>
                <Ionicons name="pricetag-outline" size={22} color={SECONDARY} />
              </View>

              {/* التبويبات */}
              <View style={s.tabsRow}>
                <TouchableOpacity
                  style={[s.tab, activeTab === 'basic' && s.tabActive]}
                  onPress={() => setActiveTab('basic')}
                >
                  <Ionicons name="information-circle-outline" size={14} color={activeTab === 'basic' ? '#fff' : '#6b7280'} />
                  <Text style={[s.tabTxt, activeTab === 'basic' && s.tabTxtActive]}>أساسي</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tab, activeTab === 'advanced' && s.tabActive]}
                  onPress={() => setActiveTab('advanced')}
                >
                  <Ionicons name="options-outline" size={14} color={activeTab === 'advanced' ? '#fff' : '#6b7280'} />
                  <Text style={[s.tabTxt, activeTab === 'advanced' && s.tabTxtActive]}>متقدم</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ═══ التبويب الأساسي ═══ */}
                {activeTab === 'basic' && (
                  <>
                    <Text style={s.inputLabel}>الكود *</Text>
                    <TextInput
                      style={s.input}
                      placeholder="SAVE10"
                      value={form.code}
                      onChangeText={v => setForm((p: any) => ({ ...p, code: v.toUpperCase() }))}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="characters"
                    />

                    <Text style={s.inputLabel}>العنوان *</Text>
                    <TextInput
                      style={s.input}
                      placeholder="مثال: خصم 10% للعملاء الجدد"
                      value={form.title}
                      onChangeText={v => setForm((p: any) => ({ ...p, title: v }))}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />

                    <Text style={s.inputLabel}>الوصف (اختياري)</Text>
                    <TextInput
                      style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                      placeholder="وصف تفصيلي للكود..."
                      value={form.description}
                      onChangeText={v => setForm((p: any) => ({ ...p, description: v }))}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                      multiline
                    />
                    
                    <View style={s.typeRow}>
                      <TouchableOpacity
                        style={[s.typeBtn, form.discountType === 'percentage' && s.typeBtnActive]}
                      onPress={() => setForm((p: any) => ({ ...p, discountType: 'percentage' }))}>
                        <Ionicons name="calculator-outline" size={16} color={form.discountType === 'percentage' ? '#fff' : '#6b7280'} />
                        <Text style={[s.typeTxt, form.discountType === 'percentage' && s.typeTxtActive]}>نسبة %</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.typeBtn, form.discountType === 'fixed' && s.typeBtnActive]}
                        onPress={() => setForm((p: any) => ({ ...p, discountType: 'fixed' }))}>
                        <Ionicons name="cash-outline" size={16} color={form.discountType === 'fixed' ? '#fff' : '#6b7280'} />
                        <Text style={[s.typeTxt, form.discountType === 'fixed' && s.typeTxtActive]}>مبلغ ثابت</Text>
                      </TouchableOpacity>
                    </View>

                    {form.discountType === 'percentage' ? (
                      <>
                        <Text style={s.inputLabel}>نسبة الخصم (%) *</Text>
                        <TextInput
                          style={s.input}
                          placeholder="10"
                          value={form.discountPercent}
                          onChangeText={v => setForm((p: any) => ({ ...p, discountPercent: v }))}
                          keyboardType="numeric"
                          textAlign="right"
                          placeholderTextColor="#9ca3af"
                        />
                      </>
                    ) : (
                      <>
                        <Text style={s.inputLabel}>مبلغ الخصم (د.ع) *</Text>
                        <TextInput
                          style={s.input}
                          placeholder="5000"
                          value={form.discountAmount}
                          onChangeText={v => setForm((p: any) => ({ ...p, discountAmount: v }))}
                          keyboardType="numeric"
                          textAlign="right"
                          placeholderTextColor="#9ca3af"
                        />
                      </>
                    )}

                    {form.discountType === 'percentage' && (
                      <>
                        <Text style={s.inputLabel}>سقف الخصم (د.ع) — اختياري</Text>
                        <TextInput
                          style={s.input}
                          placeholder="اتركه فارغاً لبلا سقف"
                          value={form.maxDiscount}
                          onChangeText={v => setForm((p: any) => ({ ...p, maxDiscount: v }))}
                          keyboardType="numeric"
                          textAlign="right"
                          placeholderTextColor="#9ca3af"
                        />
                      </>
                    )}

                    {/* حالة التفعيل */}
                    <View style={s.switchRow}>
                      <Switch
                        value={form.isActive}
                        onValueChange={v => setForm((p: any) => ({ ...p, isActive: v }))}
                        trackColor={{ false: '#d1d5db', true: SUCCESS + '60' }}
                        thumbColor={form.isActive ? SUCCESS : '#f3f4f6'}
                      />
                      <Text style={[s.switchLabel, { color: form.isActive ? SUCCESS : '#9ca3af' }]}>
                        {form.isActive ? '✅ الكود فعال' : '❌ الكود معطل'}
                      </Text>
                    </View>
                  </>
                )}

                {/* ═══ التبويب المتقدم ═══ */}
                {activeTab === 'advanced' && (
                  <>
                    <Text style={s.sectionTitle}>النطاق والاستهداف</Text>

                    <View style={s.typeRow}>
                      <TouchableOpacity
                        style={[s.typeBtn, form.targetType === 'all' && s.typeBtnActive]}
                        onPress={() => setForm((p: any) => ({ ...p, targetType: 'all' }))}
                      >
                        <Ionicons name="people-outline" size={16} color={form.targetType === 'all' ? '#fff' : '#6b7280'} />
                        <Text style={[s.typeTxt, form.targetType === 'all' && s.typeTxtActive]}>جميع التجار</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.typeBtn, form.targetType === 'specific' && s.typeBtnActive]}
                        onPress={() => setForm((p: any) => ({ ...p, targetType: 'specific' }))}
                      >
                        <Ionicons name="person-outline" size={16} color={form.targetType === 'specific' ? '#fff' : '#6b7280'} />
                        <Text style={[s.typeTxt, form.targetType === 'specific' && s.typeTxtActive]}>تجار محددون</Text>
                      </TouchableOpacity>
                    </View>

                    {form.targetType === 'specific' && (
                      <View style={s.merchantsBox}>
                        <Text style={s.merchantsHeader}>
                          اختر التجار ({form.targetUserIds.length} محدد)
                        </Text>
                        <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                          {merchants.length === 0 ? (
                            <Text style={s.emptySmall}>لا يوجد تجار</Text>
                          ) : (
                            merchants.map((m: any) => {
                              const selected = form.targetUserIds.includes(m.id);
                              return (
                                <TouchableOpacity
                                  key={m.id}
                                  style={[s.merchantRow, selected && s.merchantRowActive]}
                                  onPress={() => toggleUserSelection(m.id)}
                                >
                                  <View style={[s.checkbox, selected && s.checkboxActive]}>
                                    {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={s.merchantName}>{m.storeName}</Text>
                                    <Text style={s.merchantPhone}>{m.phone}</Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </ScrollView>
                      </View>
                    )}

                    <Text style={s.sectionTitle}>الشروط</Text>

                    <Text style={s.inputLabel}>الحد الأدنى للسلة (د.ع) — اختياري</Text>
                    <TextInput
                      style={s.input}
                      placeholder="0"
                      value={form.minCartAmount}
                      onChangeText={v => setForm((p: any) => ({ ...p, minCartAmount: v }))}
                      keyboardType="numeric"
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />

                    <Text style={s.inputLabel}>تاريخ البدء (اختياري)</Text>
                    <TextInput
                      style={s.input}
                      placeholder="2025-01-01"
                      value={form.startsAt}
                      onChangeText={v => setForm((p: any) => ({ ...p, startsAt: v }))}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />

                    <Text style={s.inputLabel}>تاريخ الانتهاء (اختياري)</Text>
                    <TextInput
                      style={s.input}
                      placeholder="2025-12-31"
                      value={form.expiresAt}
                      onChangeText={v => setForm((p: any) => ({ ...p, expiresAt: v }))}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />

                    <Text style={s.sectionTitle}>حدود الاستخدام</Text>

                    <Text style={s.inputLabel}>الحد الأقصى الكلي (0 = بلا حد)</Text>
                    <TextInput
                      style={s.input}
                      placeholder="100"
                      value={form.maxUses}
                      onChangeText={v => setForm((p: any) => ({ ...p, maxUses: v }))}
                      keyboardType="numeric"
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                    />

                    <Text style={s.inputLabel}>الحد الأقصى لكل تاجر</Text>
                    <TextInput
                      style={s.input}
                      placeholder="1"
                      value={form.maxUsesPerUser}
                      onChangeText={v => setForm((p: any) => ({ ...p, maxUsesPerUser: v }))}
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
                  style={[s.saveBtn, savePromo.isPending && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={savePromo.isPending}
                >
                  {savePromo.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={s.saveBtnTxt}>{editPromo ? 'حفظ التعديلات' : 'إضافة الكود'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ─── مودال الإحصائيات ─── */}
      {/* ══════════════════════════════════════════════════════ */}
      <Modal visible={!!statsPromo} transparent animationType="slide" onRequestClose={() => setStatsPromo(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setStatsPromo(null)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>إحصائيات {statsPromo?.code}</Text>
              <Ionicons name="stats-chart" size={20} color={INFO} />
            </View>

            {statsPromo && (
              <ScrollView contentContainerStyle={s.modalBody}>
                <View style={s.statsGrid2}>
                  <View style={[s.statCardLarge, { borderColor: INFO + '40' }]}>
                    <Ionicons name="repeat" size={20} color={INFO} />
                    <Text style={[s.statValLarge, { color: INFO }]}>
                      {statsPromo.stats?.usageCount || statsPromo.usedCount || 0}
                    </Text>
                    <Text style={s.statLabelLarge}>عدد الاستخدامات</Text>
                  </View>
                  <View style={[s.statCardLarge, { borderColor: SUCCESS + '40' }]}>
                    <Ionicons name="cash" size={20} color={SUCCESS} />
                    <Text style={[s.statValLarge, { color: SUCCESS }]}>
                      {fmt(statsPromo.stats?.totalDiscount || 0)}
                    </Text>
                    <Text style={s.statLabelLarge}>إجمالي الخصم د.ع</Text>
                  </View>
                  <View style={[s.statCardLarge, { borderColor: PURPLE + '40' }]}>
                    <Ionicons name="people" size={20} color={PURPLE} />
                    <Text style={[s.statValLarge, { color: PURPLE }]}>
                      {statsPromo.stats?.uniqueUsers || 0}
                    </Text>
                    <Text style={s.statLabelLarge}>تجار مميزون</Text>
                  </View>
                </View>

                <View style={s.infoBox}>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>نوع الخصم</Text>
                    <Text style={s.infoVal}>
                      {statsPromo.discountType === 'percentage'
                        ? `${statsPromo.discountPercent}%`
                        : `${fmt(statsPromo.discountAmount)} د.ع`}
                    </Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>النطاق</Text>
                    <Text style={s.infoVal}>
                      {statsPromo.targetType === 'all' ? 'جميع التجار' : 'تجار محددون'}
                    </Text>
                  </View>
                  {statsPromo.maxUses > 0 && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>الحد الأقصى</Text>
                      <Text style={s.infoVal}>
                        {statsPromo.usedCount} / {statsPromo.maxUses}
                      </Text>
                    </View>
                  )}
                  {statsPromo.expiresAt && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>تاريخ الانتهاء</Text>
                      <Text style={s.infoVal}>{fmtDate(statsPromo.expiresAt)}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── الأنماط ───
// ═══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt: { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptySubTxt: { fontSize: 13, color: '#9ca3af' },
  emptySmall: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },

  // الإحصائيات
  statsGrid: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#e8edf2',
    gap: 2,
  },
  statVal: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },

  // البحث
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' },

  // الفلاتر
  filtersScroll: { maxHeight: 46, paddingHorizontal: 12, marginBottom: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 7,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  chipTxt: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTxtActive: { color: PRIMARY },

  // زر الإضافة
  addBtn: {
    flexDirection: 'row',
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

  // الكارد
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  cardInactive: { opacity: 0.7 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 10,
  },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  codeInfo: { flex: 1, alignItems: 'flex-end' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  code: { fontSize: 17, fontWeight: 'bold', color: '#111827', letterSpacing: 1 },
  title: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusTxt: { fontSize: 10, fontWeight: 'bold' },

  // التفاصيل
  detailsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10, gap: 8, flexWrap: 'wrap' },
  detailItem: { flex: 1, minWidth: 70, backgroundColor: '#f8fafc', borderRadius: 10, padding: 8, alignItems: 'center' },
  detailLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  detailVal: { fontSize: 12, fontWeight: 'bold', color: '#111827' },

  // الاستخدام
  usageBox: { paddingHorizontal: 14, paddingBottom: 10 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  usageTxt: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  usagePct: { fontSize: 11, color: '#6b7280', fontWeight: 'bold' },
  usageTrack: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: 6, borderRadius: 3 },

  // التواريخ
  datesRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10, gap: 12, flexWrap: 'wrap' },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt: { fontSize: 10, color: '#6b7280' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },

  // الأزرار
  actionsRow: { flexDirection: 'row', paddingVertical: 6 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  actionBtnTxt: { fontSize: 11, fontWeight: '600' },
  actionDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackOn: { backgroundColor: SUCCESS },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel: { fontSize: 12, fontWeight: '700' },

  // المودال
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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

  // التبويبات
  tabsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  tabActive: { backgroundColor: PRIMARY },
  tabTxt: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  tabTxtActive: { color: '#fff' },

  modalBody: { padding: 20, paddingBottom: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  inputLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'right',
    marginTop: 18,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 6,
  },

  // نوع الخصم
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  typeBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  typeTxt: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  typeTxtActive: { color: '#fff' },

  // المفتاح
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  switchLabel: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },

  // التجار
  merchantsBox: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  merchantsHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 8,
  },
  merchantRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 3,
    backgroundColor: '#fff',
  },
  merchantRowActive: { backgroundColor: PRIMARY + '08' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  merchantName: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'right' },
  merchantPhone: { fontSize: 11, color: '#9ca3af', textAlign: 'right' },

  // أزرار المودال
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnTxt: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // إحصائيات المودال
  statsGrid2: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCardLarge: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 6,
  },
  statValLarge: { fontSize: 16, fontWeight: 'bold' },
  statLabelLarge: { fontSize: 10, color: '#6b7280', fontWeight: '600', textAlign: 'center' },

  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  infoVal: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
});