import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, Image,
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

const FILTERS: { key: Filter; label: string; icon: string; color: string }[] = [
  { key: 'all',   label: 'الكل',         icon: 'cube-outline',         color: PRIMARY   },
  { key: 'low',   label: 'منخفض',        icon: 'warning-outline',       color: WARNING   },
  { key: 'out',   label: 'نافد',          icon: 'close-circle-outline',  color: DANGER    },
  { key: 'stale', label: 'راكد 30 يوم',  icon: 'hourglass-outline',     color: '#8b5cf6' },
];

const REASON_LABELS: Record<string, string> = {
  manual:   'تعديل يدوي',
  order:    'طلب جديد',
  cancel:   'إلغاء طلب',
  returned: 'مرتجع',
};

const timeAgo = (date: string) => {
  const d = new Date(date.endsWith('Z') ? date : date + 'Z');
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${day} يوم`;
};

// ── StatCard ─────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, wide }: {
  label: string; value: any; icon: string; color: string; wide?: boolean;
}) {
  return (
    <View style={[st.card, wide && { minWidth: 160 }]}>
      <View style={[st.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[st.value, { color }]}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, minWidth: 110,
    borderWidth: 1, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  value:   { fontSize: 18, fontWeight: '900' },
  label:   { fontSize: 11, color: '#6b7280', textAlign: 'center' },
});

// ── Main Component ────────────────────────────────────────────────
export default function InventoryTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [changeVal, setChangeVal] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<'manual' | 'cancel' | 'returned'>('manual');

  // ── الإحصائيات ──────────────────────────────────────────────
  const { data: stats } = useQuery<InventoryStats>({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/inventory/stats');
      return data;
    },
    refetchInterval: 60000,
  });

  // ── قائمة المنتجات ──────────────────────────────────────────
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['inventory', filter],
    queryFn: async () => {
      const { data } = await api.get(`/api/inventory?filter=${filter}`);
      return data;
    },
    refetchInterval: 60000,
  });

  // ── سجل منتج ────────────────────────────────────────────────
  const { data: log = [], isLoading: logLoading } = useQuery<LogEntry[]>({
    queryKey: ['inventory-log', selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await api.get(`/api/inventory/${selected.id}/log`);
      return data;
    },
    enabled: !!selected && logModal,
  });

  // ── تعديل المخزون ───────────────────────────────────────────
  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const change = Number(changeVal);
      if (isNaN(change) || change === 0) throw new Error('أدخل قيمة صحيحة');
      await api.patch(`/api/inventory/${selected.id}`, {
        change, note: note || null, reason,
      });
    },
    onSuccess: () => {
      toast.success('تم تعديل المخزون ✅');
      setAdjustModal(false);
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

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: DANGER,  label: 'نافد',   bg: '#fee2e2' };
    if (stock <= 10) return { color: WARNING, label: 'منخفض', bg: '#fef3c7' };
    return               { color: SUCCESS, label: 'متوفر',  bg: '#d1fae5' };
  };

  const newStock = selected && changeVal !== '' && !isNaN(Number(changeVal))
    ? Math.max(0, selected.stock + Number(changeVal))
    : null;

  return (
    <View style={s.container}>

      {/* ── إحصائيات ── */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.statsRow}>
          <StatCard label="إجمالي المنتجات" value={stats.total}      icon="cube-outline"         color={PRIMARY}   />
          <StatCard label="نافد المخزون"     value={stats.outOfStock} icon="close-circle-outline" color={DANGER}    />
          <StatCard label="مخزون منخفض"     value={stats.lowStock}   icon="warning-outline"       color={WARNING}   />
          <StatCard label="راكد 30 يوم"      value={stats.stale}      icon="hourglass-outline"     color="#8b5cf6"   />
          <StatCard
            label="قيمة المخزون"
            value={`${stats.totalValue.toLocaleString('ar-IQ')} د.ع`}
            icon="wallet-outline" color={SUCCESS} wide
          />
        </ScrollView>
      )}

      {/* ── فلاتر ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterBtn, filter === f.key && { backgroundColor: f.color + '18', borderColor: f.color }]}
            onPress={() => setFilter(f.key)}>
            <Ionicons name={f.icon as any} size={14} color={filter === f.key ? f.color : '#6b7280'} />
            <Text style={[s.filterText, filter === f.key && { color: f.color, fontWeight: '700' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={48} color="#d1d5db" />
              <Text style={s.emptyText}>لا توجد منتجات</Text>
            </View>
          ) : filtered.map(p => {
            const { color, label, bg } = getStockStatus(p.stock);
            return (
              <View key={p.id} style={s.card}>
                {/* صورة */}
                {p.imageUrl ? (
                  <Image source={{ uri: p.imageUrl }} style={s.img} />
                ) : (
                  <View style={[s.img, s.imgPlaceholder]}>
                    <Ionicons name="image-outline" size={22} color="#d1d5db" />
                  </View>
                )}

                {/* معلومات */}
                <View style={s.cardInfo}>
                  <Text style={s.cardName} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.cardCat}>{p.category}</Text>
                  <View style={s.cardRow}>
                    <Text style={s.soldText}>مبيع: {p.totalSold}</Text>
                    <View style={[s.stockBadge, { backgroundColor: bg }]}>
                      <Text style={[s.stockBadgeText, { color }]}>{label}</Text>
                      <Text style={[s.stockNum, { color }]}>{p.stock}</Text>
                    </View>
                  </View>
                </View>

                {/* أزرار */}
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

      {/* ── Modal تعديل المخزون ── */}
      <Modal visible={adjustModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>تعديل المخزون</Text>
            {selected && (
              <Text style={s.sheetSub}>{selected.name} — المخزون الحالي: {selected.stock}</Text>
            )}

            <Text style={s.label}>السبب</Text>
            <View style={s.reasonRow}>
              {(['manual', 'cancel', 'returned'] as const).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.reasonBtn, reason === r && s.reasonBtnActive]}
                  onPress={() => setReason(r)}>
                  <Text style={[s.reasonText, reason === r && s.reasonTextActive]}>
                    {REASON_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>كمية التغيير</Text>
            <Text style={s.hint}>موجب للإضافة، سالب للخصم (مثال: 5 أو -3)</Text>
            <TextInput
              style={s.input}
              placeholder="مثال: 5 أو -3"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={changeVal}
              onChangeText={setChangeVal}
              textAlign="right"
            />

            <Text style={s.label}>ملاحظة (اختياري)</Text>
            <TextInput
              style={[s.input, { height: 70 }]}
              placeholder="سبب التعديل..."
              placeholderTextColor="#9ca3af"
              multiline
              value={note}
              onChangeText={setNote}
              textAlign="right"
            />

            {/* معاينة النتيجة */}
            {newStock !== null && selected && (
              <View style={s.preview}>
                <Text style={s.previewLabel}>المخزون بعد التعديل</Text>
                <Text style={s.previewVal}>
                  {selected.stock}  →  {newStock}
                </Text>
              </View>
            )}

            <View style={s.sheetFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAdjustModal(false)}>
                <Text style={s.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, adjustMutation.isPending && { opacity: 0.7 }]}
                onPress={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending}>
                {adjustMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveText}>حفظ التعديل</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal سجل التغييرات ── */}
      <Modal visible={logModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: '85%' }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>سجل التغييرات</Text>
            {selected && <Text style={s.sheetSub}>{selected.name}</Text>}

            {logLoading ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 20 }} />
            ) : log.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="time-outline" size={36} color="#d1d5db" />
                <Text style={s.emptyText}>لا يوجد سجل بعد</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
                {log.map(entry => (
                  <View key={entry.id} style={s.logEntry}>
                    <View style={[s.logIcon,
                      { backgroundColor: entry.change > 0 ? '#d1fae5' : '#fee2e2' }]}>
                      <Ionicons
                        name={entry.change > 0 ? 'arrow-up-outline' : 'arrow-down-outline'}
                        size={16}
                        color={entry.change > 0 ? SUCCESS : DANGER}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.logRow}>
                        <Text style={s.logTime}>{timeAgo(entry.created_at)}</Text>
                        <Text style={[s.logChange, { color: entry.change > 0 ? SUCCESS : DANGER }]}>
                          {entry.change > 0 ? '+' : ''}{entry.change}
                        </Text>
                      </View>
                      <Text style={s.logReason}>{REASON_LABELS[entry.reason] || entry.reason}</Text>
                      {entry.note && <Text style={s.logNote}>{entry.note}</Text>}
                      <Text style={s.logAfter}>المخزون بعد: {entry.stock_after}</Text>
                    </View>
                  </View>
                ))}
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
  container:  { flex: 1, backgroundColor: BG },
  statsRow:   { padding: 14, gap: 10 },
  filtersRow: { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },

  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#f3f4f6',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0d1b2a' },

  listContent: { padding: 14, gap: 10, paddingBottom: 30 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  img:            { width: 56, height: 56, borderRadius: 12 },
  imgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  cardInfo:       { flex: 1, gap: 3 },
  cardName:       { fontSize: 13, fontWeight: '700', color: '#0d1b2a', textAlign: 'right' },
  cardCat:        { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  cardRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  soldText:       { fontSize: 11, color: '#6b7280' },
  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  stockBadgeText: { fontSize: 11, fontWeight: '700' },
  stockNum:       { fontSize: 13, fontWeight: '900' },
  cardActions:    { gap: 6 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnPrimary: { backgroundColor: PRIMARY },

  empty:     { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9ca3af' },

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
  sheetTitle: { fontSize: 17, fontWeight: '900', color: '#0d1b2a', textAlign: 'right', marginBottom: 4 },
  sheetSub:   { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '700', color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12 },
  hint:  { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e8edf2', borderRadius: 12,
    padding: 12, fontSize: 15, color: '#0d1b2a', backgroundColor: '#f8fafc',
  },

  reasonRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reasonBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, backgroundColor: '#f3f4f6',
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  reasonBtnActive:  { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  reasonText:       { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  reasonTextActive: { color: PRIMARY, fontWeight: '700' },

  preview: {
    marginTop: 12, backgroundColor: '#f0f9fa',
    borderRadius: 12, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: PRIMARY + '20',
  },
  previewLabel: { fontSize: 11, color: '#6b7280' },
  previewVal:   { fontSize: 18, fontWeight: '900', color: PRIMARY },

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
    marginTop: 16, height: 48, borderRadius: 13,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  logEntry: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  logIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logChange:  { fontSize: 15, fontWeight: '900' },
  logTime:    { fontSize: 11, color: '#9ca3af' },
  logReason:  { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'right', marginTop: 2 },
  logNote:    { fontSize: 11, color: '#6b7280', textAlign: 'right' },
  logAfter:   { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
});
