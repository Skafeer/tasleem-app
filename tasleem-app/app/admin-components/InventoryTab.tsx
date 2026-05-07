import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, Image, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY  = '#0c6679';
const BG       = '#f2f6f9';
const DANGER   = '#ef4444';
const WARNING  = '#f59e0b';
const SUCCESS  = '#10b981';
const PURPLE   = '#8b5cf6';

type Filter = 'all' | 'low' | 'out' | 'stale';

interface Product {
  id: number;
  name: string;
  imageUrl: string;
  stock: number;
  wholesalePrice: number;
  category: string;
  isActive: boolean;
  totalSold: number;
}

interface InventoryStats {
  total: number;
  outOfStock: number;
  lowStock: number;
  stale: number;
  totalValue: number;
}

interface LogEntry {
  id: number;
  change: number;
  reason: string;
  note: string | null;
  stock_after: number;
  created_at: string;
  admin_name: string | null;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  manual:   { label: 'تعديل يدوي', color: PRIMARY  },
  order:    { label: 'طلب جديد',   color: DANGER   },
  cancel:   { label: 'إلغاء طلب', color: WARNING  },
  returned: { label: 'مرتجع',      color: PURPLE   },
};

const timeAgo = (date: string) => {
  const d    = new Date(date.endsWith('Z') ? date : date + 'Z');
  const diff = Date.now() - d.getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${day} يوم`;
};

// أيام حتى النفاد بناءً على معدل المبيعات
const daysUntilEmpty = (stock: number, totalSold: number): number | null => {
  if (stock === 0 || totalSold === 0) return null;
  const dailyRate = totalSold / 30; // افتراض 30 يوم
  if (dailyRate === 0) return null;
  return Math.round(stock / dailyRate);
};

const getStockStatus = (stock: number) => {
  if (stock === 0) return { color: DANGER,  label: 'نافد',   bg: '#fee2e2' };
  if (stock <= 5)  return { color: DANGER,  label: 'حرج',    bg: '#fee2e2' };
  if (stock <= 15) return { color: WARNING, label: 'منخفض', bg: '#fef3c7' };
  return               { color: SUCCESS, label: 'متوفر',  bg: '#d1fae5' };
};

// ── StatCard ─────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, onPress, active }: {
  label: string; value: any; icon: string; color: string;
  onPress?: () => void; active?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[st.card, active && { borderColor: color, borderWidth: 2 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}>
      <View style={[st.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[st.value, { color }]}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 5, flex: 1,
    borderWidth: 1.5, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  value:   { fontSize: 17, fontWeight: '900' },
  label:   { fontSize: 10, color: '#6b7280', textAlign: 'center' },
});

// ── StockBar — شريط المخزون المرئي ──────────────────────────────
function StockBar({ stock, max = 100 }: { stock: number; max?: number }) {
  const pct    = Math.min(1, stock / max);
  const color  = stock === 0 ? DANGER : stock <= 15 ? WARNING : SUCCESS;
  return (
    <View style={sb.track}>
      <View style={[sb.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const sb = StyleSheet.create({
  track: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  fill:  { height: 4, borderRadius: 2 },
});

// ── Main Component ────────────────────────────────────────────────
export default function InventoryTab() {
  const qc = useQueryClient();
  const [filter,      setFilter]      = useState<Filter>('all');
  const [search,      setSearch]      = useState('');
  const [adjustModal, setAdjustModal] = useState(false);
  const [logModal,    setLogModal]    = useState(false);
  const [selected,    setSelected]    = useState<Product | null>(null);
  const [changeVal,   setChangeVal]   = useState('');
  const [note,        setNote]        = useState('');
  const [reason,      setReason]      = useState<'manual' | 'cancel' | 'returned'>('manual');
  // تعديل سريع مباشر من الكارد
  const [quickId,     setQuickId]     = useState<number | null>(null);
  const [quickVal,    setQuickVal]    = useState('');

  // ── الإحصائيات ──────────────────────────────────────────────
  const { data: stats } = useQuery<InventoryStats>({
    queryKey: ['inventory-stats'],
    queryFn:  async () => { const { data } = await api.get('/api/inventory/stats'); return data; },
    refetchInterval: 60000,
  });

  // ── قائمة المنتجات ──────────────────────────────────────────
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['inventory', filter],
    queryFn:  async () => { const { data } = await api.get(`/api/inventory?filter=${filter}`); return data; },
    refetchInterval: 60000,
  });

  // ── سجل منتج ────────────────────────────────────────────────
  const { data: log = [], isLoading: logLoading } = useQuery<LogEntry[]>({
    queryKey: ['inventory-log', selected?.id],
    queryFn:  async () => {
      if (!selected) return [];
      const { data } = await api.get(`/api/inventory/${selected.id}/log`);
      return data;
    },
    enabled: !!selected && logModal,
  });

  // ── تعديل المخزون ───────────────────────────────────────────
  const adjustMutation = useMutation({
    mutationFn: async ({ id, change, n, r }: { id: number; change: number; n: string; r: string }) => {
      await api.patch(`/api/inventory/${id}`, { change, note: n || null, reason: r });
    },
    onSuccess: () => {
      toast.success('تم تعديل المخزون ✅');
      setAdjustModal(false);
      setQuickId(null);
      setChangeVal('');
      setNote('');
      setReason('manual');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      qc.invalidateQueries({ queryKey: ['inventory-log', selected?.id] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل التعديل'),
  });

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdjust = (p: Product) => {
    setSelected(p);
    setChangeVal('');
    setNote('');
    setReason('manual');
    setAdjustModal(true);
  };

  const openLog = (p: Product) => {
    setSelected(p);
    setLogModal(true);
  };

  // تعديل سريع +1 / -1
  const quickAdjust = (p: Product, delta: number) => {
    if (p.stock + delta < 0) return;
    adjustMutation.mutate({ id: p.id, change: delta, n: '', r: 'manual' });
  };

  // تعديل سريع بإدخال مباشر
  const submitQuick = (p: Product) => {
    const val = Number(quickVal);
    if (isNaN(val) || val === 0) { setQuickId(null); return; }
    adjustMutation.mutate({ id: p.id, change: val, n: '', r: 'manual' });
    setQuickId(null);
    setQuickVal('');
  };

  const newStock = selected && changeVal !== '' && !isNaN(Number(changeVal))
    ? Math.max(0, selected.stock + Number(changeVal))
    : null;

  const FILTER_TABS: { key: Filter; label: string; icon: string; color: string; count?: number }[] = [
    { key: 'all',   label: 'الكل',    icon: 'cube-outline',         color: PRIMARY,  count: stats?.total       },
    { key: 'low',   label: 'منخفض',  icon: 'warning-outline',       color: WARNING,  count: stats?.lowStock    },
    { key: 'out',   label: 'نافد',    icon: 'close-circle-outline',  color: DANGER,   count: stats?.outOfStock  },
    { key: 'stale', label: 'راكد',    icon: 'hourglass-outline',     color: PURPLE,   count: stats?.stale       },
  ];

  return (
    <View style={s.container}>

      {/* ── إحصائيات Grid ── */}
      {stats && (
        <View style={s.statsGrid}>
          <View style={s.statsRow}>
            <StatCard label="إجمالي" value={stats.total} icon="cube-outline" color={PRIMARY}
              onPress={() => setFilter('all')} active={filter === 'all'} />
            <StatCard label="نافد" value={stats.outOfStock} icon="close-circle-outline" color={DANGER}
              onPress={() => setFilter('out')} active={filter === 'out'} />
            <StatCard label="منخفض" value={stats.lowStock} icon="warning-outline" color={WARNING}
              onPress={() => setFilter('low')} active={filter === 'low'} />
            <StatCard label="راكد" value={stats.stale} icon="hourglass-outline" color={PURPLE}
              onPress={() => setFilter('stale')} active={filter === 'stale'} />
          </View>
          <View style={s.valueCard}>
            <Ionicons name="wallet-outline" size={16} color={SUCCESS} />
            <Text style={s.valueLabel}>قيمة المخزون الكلية</Text>
            <Text style={s.valueNum}>{stats.totalValue.toLocaleString('ar-IQ')} د.ع</Text>
          </View>
        </View>
      )}

      {/* ── بحث ── */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="ابحث عن منتج..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── قائمة المنتجات ── */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={s.center}>
              <Ionicons name="cube-outline" size={48} color="#d1d5db" />
              <Text style={s.emptyText}>لا توجد منتجات</Text>
            </View>
          ) : filtered.map(p => {
            const { color, label, bg } = getStockStatus(p.stock);
            const days = daysUntilEmpty(p.stock, p.totalSold);
            const isQuick = quickId === p.id;

            return (
              <View key={p.id} style={[s.card, p.stock === 0 && s.cardDanger, p.stock > 0 && p.stock <= 5 && s.cardWarning]}>

                {/* صورة */}
                {p.imageUrl ? (
                  <Image source={{ uri: p.imageUrl }} style={s.img} />
                ) : (
                  <View style={[s.img, s.imgPlaceholder]}>
                    <Ionicons name="image-outline" size={20} color="#d1d5db" />
                  </View>
                )}

                {/* معلومات */}
                <View style={s.cardInfo}>
                  <Text style={s.cardName} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.cardCat}>{p.category}</Text>

                  {/* شريط المخزون */}
                  <StockBar stock={p.stock} max={Math.max(50, p.totalSold)} />

                  <View style={s.cardRow}>
                    {/* بادج الحالة */}
                    <View style={[s.stockBadge, { backgroundColor: bg }]}>
                      <Text style={[s.stockNum, { color }]}>{p.stock}</Text>
                      <Text style={[s.stockBadgeText, { color }]}>{label}</Text>
                    </View>

                    {/* توقع النفاد */}
                    {days !== null && (
                      <Text style={[s.daysText, days <= 7 && { color: DANGER, fontWeight: '700' }]}>
                        {days <= 0 ? '⚠️ نافد قريباً' : `ينفد خلال ${days} يوم`}
                      </Text>
                    )}
                  </View>

                  {/* تعديل سريع مباشر */}
                  {isQuick ? (
                    <View style={s.quickRow}>
                      <TouchableOpacity style={s.quickConfirm} onPress={() => submitQuick(p)}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TextInput
                        style={s.quickInput}
                        value={quickVal}
                        onChangeText={setQuickVal}
                        keyboardType="numeric"
                        placeholder="+5 أو -3"
                        placeholderTextColor="#9ca3af"
                        textAlign="center"
                        autoFocus
                        onSubmitEditing={() => submitQuick(p)}
                      />
                      <TouchableOpacity style={s.quickCancel} onPress={() => setQuickId(null)}>
                        <Ionicons name="close" size={16} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.quickBtns}>
                      <TouchableOpacity style={s.qMinus}
                        onPress={() => quickAdjust(p, -1)}
                        disabled={p.stock === 0}>
                        <Text style={s.qMinusTxt}>−</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.qEdit}
                        onPress={() => { setQuickId(p.id); setQuickVal(''); }}>
                        <Text style={s.qEditTxt}>تعديل يدوي</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.qPlus} onPress={() => quickAdjust(p, 1)}>
                        <Text style={s.qPlusTxt}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* أزرار جانبية */}
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openLog(p)}>
                    <Ionicons name="time-outline" size={17} color={PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => openAdjust(p)}>
                    <Ionicons name="create-outline" size={17} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Modal تعديل المخزون المتقدم ── */}
      <Modal visible={adjustModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>تعديل المخزون</Text>
              {selected && (
                <View style={s.sheetProductRow}>
                  {selected.imageUrl
                    ? <Image source={{ uri: selected.imageUrl }} style={s.sheetImg} />
                    : <View style={[s.sheetImg, s.imgPlaceholder]}><Ionicons name="image-outline" size={18} color="#d1d5db" /></View>
                  }
                  <View>
                    <Text style={s.sheetProductName}>{selected.name}</Text>
                    <Text style={s.sheetSub}>المخزون الحالي: <Text style={{ color: PRIMARY, fontWeight: '900' }}>{selected.stock}</Text></Text>
                  </View>
                </View>
              )}

              {/* السبب */}
              <Text style={s.label}>السبب</Text>
              <View style={s.reasonRow}>
                {(['manual', 'cancel', 'returned'] as const).map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[s.reasonBtn, reason === r && { backgroundColor: (REASON_LABELS[r]?.color || PRIMARY) + '18', borderColor: REASON_LABELS[r]?.color || PRIMARY }]}
                    onPress={() => setReason(r)}>
                    <Text style={[s.reasonText, reason === r && { color: REASON_LABELS[r]?.color || PRIMARY, fontWeight: '700' }]}>
                      {REASON_LABELS[r]?.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* كمية التغيير */}
              <Text style={s.label}>كمية التغيير</Text>
              <Text style={s.hint}>موجب للإضافة، سالب للخصم (مثال: 10 أو -5)</Text>
              <TextInput
                style={s.input}
                placeholder="مثال: 10 أو -5"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={changeVal}
                onChangeText={setChangeVal}
                textAlign="right"
              />

              {/* ملاحظة */}
              <Text style={s.label}>ملاحظة (اختياري)</Text>
              <TextInput
                style={[s.input, { height: 65 }]}
                placeholder="سبب التعديل..."
                placeholderTextColor="#9ca3af"
                multiline
                value={note}
                onChangeText={setNote}
                textAlign="right"
              />

              {/* معاينة */}
              {newStock !== null && selected && (
                <View style={s.preview}>
                  <Text style={s.previewLabel}>المخزون بعد التعديل</Text>
                  <View style={s.previewRow}>
                    <Text style={[s.previewNum, { color: '#9ca3af' }]}>{selected.stock}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                    <Text style={[s.previewNum, { color: newStock === 0 ? DANGER : newStock <= 5 ? WARNING : SUCCESS }]}>
                      {newStock}
                    </Text>
                  </View>
                </View>
              )}

              <View style={s.sheetFooter}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setAdjustModal(false)}>
                  <Text style={s.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, adjustMutation.isPending && { opacity: 0.7 }]}
                  onPress={() => selected && adjustMutation.mutate({
                    id: selected.id, change: Number(changeVal), n: note, r: reason
                  })}
                  disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveText}>حفظ التعديل</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal سجل التغييرات ── */}
      <Modal visible={logModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: '88%' }]}>
            <View style={s.sheetHandle} />
            <View style={s.logHeader}>
              <Text style={s.sheetTitle}>سجل التغييرات</Text>
              {selected && <Text style={s.sheetSub}>{selected.name}</Text>}
            </View>

            {logLoading ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 20 }} />
            ) : log.length === 0 ? (
              <View style={s.center}>
                <Ionicons name="time-outline" size={40} color="#d1d5db" />
                <Text style={s.emptyText}>لا يوجد سجل بعد</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
                {log.map((entry, idx) => {
                  const isAdd  = entry.change > 0;
                  const rInfo  = REASON_LABELS[entry.reason] || { label: entry.reason, color: PRIMARY };
                  return (
                    <View key={entry.id} style={[s.logEntry, idx === log.length - 1 && { borderBottomWidth: 0 }]}>
                      {/* أيقونة الاتجاه */}
                      <View style={[s.logIcon, { backgroundColor: isAdd ? '#d1fae5' : '#fee2e2' }]}>
                        <Ionicons
                          name={isAdd ? 'arrow-up-outline' : 'arrow-down-outline'}
                          size={15}
                          color={isAdd ? SUCCESS : DANGER}
                        />
                      </View>

                      {/* التفاصيل */}
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={s.logRow}>
                          <Text style={s.logTime}>{timeAgo(entry.created_at)}</Text>
                          <Text style={[s.logChange, { color: isAdd ? SUCCESS : DANGER }]}>
                            {isAdd ? '+' : ''}{entry.change}
                          </Text>
                        </View>

                        <View style={s.logTagRow}>
                          <View style={[s.logTag, { backgroundColor: rInfo.color + '15' }]}>
                            <Text style={[s.logTagTxt, { color: rInfo.color }]}>{rInfo.label}</Text>
                          </View>
                          <Text style={s.logAfter}>بعد: {entry.stock_after}</Text>
                        </View>

                        {entry.note && <Text style={s.logNote}>{entry.note}</Text>}
                        {entry.admin_name && <Text style={s.logAdmin}>بواسطة: {entry.admin_name}</Text>}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={s.closeBtn} onPress={() => setLogModal(false)}>
              <Text style={s.closeBtnText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9ca3af' },

  // ── إحصائيات ──
  statsGrid: { padding: 14, gap: 10 },
  statsRow:  { flexDirection: 'row', gap: 8 },
  valueCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: SUCCESS + '40',
  },
  valueLabel: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600', textAlign: 'right' },
  valueNum:   { fontSize: 15, fontWeight: '900', color: SUCCESS },

  // ── بحث ──
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0d1b2a' },

  listContent: { padding: 14, gap: 10, paddingBottom: 30 },

  // ── كارد المنتج ──
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1.5, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardDanger:  { borderColor: DANGER   + '40', backgroundColor: '#fff8f8' },
  cardWarning: { borderColor: WARNING  + '40', backgroundColor: '#fffdf5' },

  img:            { width: 58, height: 58, borderRadius: 12 },
  imgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },

  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#0d1b2a', textAlign: 'right' },
  cardCat:  { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  cardRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },

  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  stockBadgeText: { fontSize: 10, fontWeight: '700' },
  stockNum:       { fontSize: 14, fontWeight: '900' },

  daysText: { fontSize: 10, color: '#9ca3af' },

  // ── تعديل سريع ──
  quickBtns: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  qMinus: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#fee2e2',
    justifyContent: 'center', alignItems: 'center',
  },
  qMinusTxt: { color: DANGER, fontSize: 18, fontWeight: '900', lineHeight: 22 },
  qPlus: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#d1fae5',
    justifyContent: 'center', alignItems: 'center',
  },
  qPlusTxt: { color: SUCCESS, fontSize: 18, fontWeight: '900', lineHeight: 22 },
  qEdit: {
    flex: 1, height: 28, borderRadius: 8,
    backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center',
  },
  qEditTxt: { color: PRIMARY, fontSize: 11, fontWeight: '700' },

  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  quickInput: {
    flex: 1, height: 32, borderRadius: 8,
    borderWidth: 1.5, borderColor: PRIMARY,
    backgroundColor: '#f0f9fa', fontSize: 13, color: '#0d1b2a',
    paddingHorizontal: 8,
  },
  quickConfirm: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: SUCCESS,
    justifyContent: 'center', alignItems: 'center',
  },
  quickCancel: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },

  cardActions: { gap: 6 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center',
  },
  actionBtnPrimary: { backgroundColor: PRIMARY },

  // ── Modal ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 14,
  },
  sheetHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '900', color: '#0d1b2a', textAlign: 'right' },
  sheetSub:   { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  sheetProductRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    marginBottom: 4, marginTop: 10,
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#e8edf2',
  },
  sheetImg: { width: 46, height: 46, borderRadius: 10 },
  sheetProductName: { fontSize: 14, fontWeight: '700', color: '#0d1b2a', textAlign: 'right' },

  label: { fontSize: 12, fontWeight: '700', color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 14 },
  hint:  { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e8edf2', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#0d1b2a', backgroundColor: '#f8fafc',
  },

  reasonRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reasonBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, backgroundColor: '#f3f4f6',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  reasonText:      { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  preview: {
    marginTop: 12, backgroundColor: '#f0f9fa',
    borderRadius: 12, padding: 12, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: PRIMARY + '20',
  },
  previewLabel: { fontSize: 11, color: '#6b7280' },
  previewRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewNum:   { fontSize: 22, fontWeight: '900' },

  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 13,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  saveBtn: {
    flex: 2, height: 48, borderRadius: 13,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
  },
  saveText: { fontSize: 14, color: '#fff', fontWeight: '800' },
  closeBtn: {
    marginTop: 12, height: 48, borderRadius: 13,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // ── سجل ──
  logHeader: { gap: 2, marginBottom: 4 },
  logEntry: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  logIcon:   { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logChange: { fontSize: 15, fontWeight: '900' },
  logTime:   { fontSize: 11, color: '#9ca3af' },
  logTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  logTag:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  logTagTxt: { fontSize: 11, fontWeight: '700' },
  logAfter:  { fontSize: 11, color: '#9ca3af' },
  logNote:   { fontSize: 11, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  logAdmin:  { fontSize: 10, color: '#9ca3af', textAlign: 'right' },
});
