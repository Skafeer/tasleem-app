import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY  = '#0c6679';
const DANGER   = '#ef4444';
const WARNING  = '#f59e0b';
const SUCCESS  = '#10b981';
const BG       = '#f2f6f9';

type Filter = 'all' | 'low' | 'out' | 'stale';

// ── مكوّن سجل تغييرات المخزون ──
function LogModal({ product, onClose }: { product: any; onClose: () => void }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['inventory-log', product.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/inventory/${product.id}/log`);
      return data;
    },
  });

  const reasonLabel = (r: string) => {
    const map: Record<string, string> = {
      manual: 'يدوي',
      order:  'طلب',
      return: 'إرجاع',
      damage: 'تالف',
    };
    return map[r] || r;
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={s.logCard}>
          <View style={s.logHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={s.logTitle} numberOfLines={1}>سجل: {product.name}</Text>
            <Ionicons name="time-outline" size={20} color={PRIMARY} />
          </View>

          {isLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginVertical: 30 }} />
          ) : (logs as any[]).length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-outline" size={36} color="#d1d5db" />
              <Text style={s.emptyText}>لا يوجد سجل</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {(logs as any[]).map((log: any) => (
                <View key={log.id} style={s.logRow}>
                  <View style={[
                    s.logChangeChip,
                    log.change > 0 ? s.logChipPos : s.logChipNeg,
                  ]}>
                    <Text style={s.logChangeText}>
                      {log.change > 0 ? '+' : ''}{log.change}
                    </Text>
                  </View>
                  <View style={s.logInfo}>
                    <Text style={s.logAfter}>بعد: {log.stock_after} وحدة</Text>
                    {log.note ? (
                      <Text style={s.logNote}>{log.note}</Text>
                    ) : null}
                    <Text style={s.logMeta}>
                      {reasonLabel(log.reason)} · {log.admin_name || 'نظام'} · {new Date(log.created_at).toLocaleDateString('ar-IQ')}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── مكوّن تعديل المخزون ──
function EditModal({
  product, onClose,
}: { product: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [change, setChange]   = useState('');
  const [note, setNote]       = useState('');
  const [reason, setReason]   = useState('manual');

  const REASONS = [
    { key: 'manual', label: 'يدوي' },
    { key: 'return', label: 'إرجاع' },
    { key: 'damage', label: 'تالف' },
  ];

  const mutation = useMutation({
    mutationFn: async () =>
      api.patch(`/api/inventory/${product.id}`, {
        change: Number(change),
        note: note.trim() || undefined,
        reason,
      }),
    onSuccess: () => {
      toast.success('تم تحديث المخزون ✅');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-log', product.id] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل التحديث'),
  });

  const preview = product.stock + (Number(change) || 0);

  return (
    <Modal visible transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={s.editCard}>
          <View style={s.logHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={s.logTitle} numberOfLines={1}>تعديل: {product.name}</Text>
            <Ionicons name="cube-outline" size={20} color={PRIMARY} />
          </View>

          {/* المخزون الحالي */}
          <View style={s.currentStock}>
            <Text style={s.currentStockLabel}>المخزون الحالي</Text>
            <Text style={s.currentStockVal}>{product.stock}</Text>
          </View>

          {/* إدخال التغيير */}
          <Text style={s.inputLabel}>التغيير (+ إضافة / - خصم)</Text>
          <TextInput
            style={s.input}
            value={change}
            onChangeText={setChange}
            keyboardType="numeric"
            placeholder="مثال: 10 أو -5"
            placeholderTextColor="#9ca3af"
            textAlign="right"
          />

          {/* معاينة */}
          {change !== '' && (
            <View style={[
              s.previewBox,
              preview < 0 ? s.previewDanger : preview <= 10 ? s.previewWarn : s.previewOk,
            ]}>
              <Text style={s.previewText}>
                النتيجة: {Math.max(0, preview)} وحدة
              </Text>
            </View>
          )}

          {/* السبب */}
          <Text style={s.inputLabel}>السبب</Text>
          <View style={s.reasonRow}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[s.reasonChip, reason === r.key && s.reasonChipOn]}
                onPress={() => setReason(r.key)}>
                <Text style={[s.reasonText, reason === r.key && s.reasonTextOn]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ملاحظة */}
          <Text style={s.inputLabel}>ملاحظة (اختياري)</Text>
          <TextInput
            style={[s.input, { height: 70, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder="أي تفاصيل إضافية..."
            placeholderTextColor="#9ca3af"
            multiline
            textAlign="right"
          />

          <TouchableOpacity
            style={[s.saveBtn, (!change || mutation.isPending) && { opacity: 0.6 }]}
            onPress={() => mutation.mutate()}
            disabled={!change || mutation.isPending}>
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveBtnText}>حفظ التغيير</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════
// الصفحة الرئيسية
// ══════════════════════════════════════
export default function InventoryTab() {
  const [filter, setFilter]       = useState<Filter>('all');
  const [search, setSearch]       = useState('');
  const [editProduct, setEditProduct] = useState<any>(null);
  const [logProduct, setLogProduct]   = useState<any>(null);

  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/inventory/stats');
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['inventory', filter],
    queryFn: async () => {
      const { data } = await api.get(`/api/inventory?filter=${filter}`);
      return data;
    },
  });

  const filtered = (products as any[]).filter((p: any) =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.id).includes(search)
  );

  const FILTERS: { key: Filter; label: string; icon: string; color: string }[] = [
    { key: 'all',   label: 'الكل',       icon: 'cube-outline',       color: PRIMARY  },
    { key: 'low',   label: 'منخفض',      icon: 'warning-outline',    color: WARNING  },
    { key: 'out',   label: 'نافد',        icon: 'close-circle-outline', color: DANGER },
    { key: 'stale', label: 'راكد',        icon: 'time-outline',       color: '#8b5cf6' },
  ];

  const stockColor = (stock: number) => {
    if (stock === 0) return DANGER;
    if (stock <= 10) return WARNING;
    return SUCCESS;
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.container}>

      {/* ── هيدر ── */}
      <View style={s.headerRow}>
        <View style={s.headerIcon}>
          <Ionicons name="layers-outline" size={22} color={PRIMARY} />
        </View>
        <View style={s.headerCenter}>
          <Text style={s.pageTitle}>إدارة المخزون</Text>
          <Text style={s.pageSub}>{(products as any[]).length} منتج</Text>
        </View>
      </View>

      {/* ── إحصائيات ── */}
      {stats && (
        <View style={s.statsRow}>
          <View style={[s.statBox, { borderColor: PRIMARY + '40' }]}>
            <Text style={[s.statVal, { color: PRIMARY }]}>{stats.total}</Text>
            <Text style={s.statLabel}>إجمالي</Text>
          </View>
          <View style={[s.statBox, { borderColor: DANGER + '40' }]}>
            <Text style={[s.statVal, { color: DANGER }]}>{stats.outOfStock}</Text>
            <Text style={s.statLabel}>نافد</Text>
          </View>
          <View style={[s.statBox, { borderColor: WARNING + '40' }]}>
            <Text style={[s.statVal, { color: WARNING }]}>{stats.lowStock}</Text>
            <Text style={s.statLabel}>منخفض</Text>
          </View>
          <View style={[s.statBox, { borderColor: '#8b5cf6' + '40' }]}>
            <Text style={[s.statVal, { color: '#8b5cf6' }]}>{stats.stale}</Text>
            <Text style={s.statLabel}>راكد</Text>
          </View>
        </View>
      )}

      {/* ── قيمة المخزون ── */}
      {stats && (
        <View style={s.valueBox}>
          <Ionicons name="wallet-outline" size={18} color={SUCCESS} />
          <Text style={s.valueText}>
            قيمة المخزون: <Text style={{ color: SUCCESS, fontWeight: 'bold' }}>
              {Math.round(stats.totalValue).toLocaleString()} د.ع
            </Text>
          </Text>
        </View>
      )}

      {/* ── فلاتر ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && { backgroundColor: f.color, borderColor: f.color }]}
            onPress={() => setFilter(f.key)}>
            <Ionicons
              name={f.icon as any}
              size={14}
              color={filter === f.key ? '#fff' : f.color}
            />
            <Text style={[s.filterText, filter === f.key && { color: '#fff' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── بحث ── */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث باسم المنتج أو ID..."
          placeholderTextColor="#9ca3af"
          textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── قائمة المنتجات ── */}
      {isLoading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="cube-outline" size={40} color="#d1d5db" />
          <Text style={s.emptyText}>لا توجد منتجات</Text>
        </View>
      ) : (
        filtered.map((p: any) => (
          <View key={p.id} style={[
            s.productCard,
            p.stock === 0 && s.cardDanger,
            p.stock > 0 && p.stock <= 10 && s.cardWarning,
          ]}>
            <View style={s.cardTop}>
              {/* صورة المنتج */}
              {(p.imageUrl || p.images) ? (
                <Image
                  source={{ uri: p.imageUrl || p.images?.split(',')[0] }}
                  style={s.productImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={[s.productImg, s.productImgFallback]}>
                  <Ionicons name="image-outline" size={20} color="#d1d5db" />
                </View>
              )}

              {/* معلومات */}
              <View style={s.productInfo}>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={s.productId}>ID: {p.id}</Text>
                {p.category ? (
                  <Text style={s.productCat} numberOfLines={1}>{p.category}</Text>
                ) : null}
              </View>

              {/* المخزون */}
              <View style={s.stockCol}>
                <Text style={[s.stockVal, { color: stockColor(p.stock) }]}>
                  {p.stock}
                </Text>
                <Text style={s.stockLabel}>وحدة</Text>
                {p.stock === 0 && (
                  <View style={s.outBadge}>
                    <Text style={s.outBadgeText}>نافد</Text>
                  </View>
                )}
                {p.stock > 0 && p.stock <= 10 && (
                  <View style={s.lowBadge}>
                    <Text style={s.lowBadgeText}>منخفض</Text>
                  </View>
                )}
              </View>
            </View>

            {/* إحصائيات إضافية */}
            <View style={s.cardStats}>
              <View style={s.cardStatItem}>
                <Ionicons name="trending-up-outline" size={13} color="#9ca3af" />
                <Text style={s.cardStatText}>مباع: {p.totalSold ?? 0}</Text>
              </View>
              <View style={s.cardStatItem}>
                <Ionicons name="pricetag-outline" size={13} color="#9ca3af" />
                <Text style={s.cardStatText}>
                  {Math.round(p.wholesalePrice).toLocaleString()} د.ع
                </Text>
              </View>
              <View style={s.cardStatItem}>
                <Ionicons name="wallet-outline" size={13} color="#9ca3af" />
                <Text style={s.cardStatText}>
                  قيمة: {Math.round(p.wholesalePrice * p.stock).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* أزرار */}
            <View style={s.cardActions}>
              <TouchableOpacity
                style={s.logBtn}
                onPress={() => setLogProduct(p)}>
                <Ionicons name="time-outline" size={15} color={PRIMARY} />
                <Text style={s.logBtnText}>السجل</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => setEditProduct(p)}>
                <Ionicons name="create-outline" size={15} color="#fff" />
                <Text style={s.editBtnText}>تعديل المخزون</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* ── Modal السجل ── */}
      {logProduct && (
        <LogModal
          product={logProduct}
          onClose={() => setLogProduct(null)}
        />
      )}

      {/* ── Modal التعديل ── */}
      {editProduct && (
        <EditModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
        />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: BG },

  // هيدر
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'flex-end' },
  pageTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  pageSub:   { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // إحصائيات
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statVal:   { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#9ca3af', marginTop: 3 },

  // قيمة المخزون
  valueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  valueText: { fontSize: 13, color: '#374151' },

  // فلاتر
  filtersRow: { gap: 8, paddingBottom: 4, marginBottom: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },

  // بحث
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  // بطاقة منتج
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  cardDanger:  { borderColor: DANGER + '50',  backgroundColor: '#fff5f5' },
  cardWarning: { borderColor: WARNING + '50', backgroundColor: '#fffbeb' },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  productImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  productImgFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
    lineHeight: 20,
  },
  productId: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 3,
  },
  productCat: {
    fontSize: 11,
    color: PRIMARY,
    textAlign: 'right',
    marginTop: 3,
  },

  // المخزون
  stockCol: { alignItems: 'center', minWidth: 52 },
  stockVal:  { fontSize: 24, fontWeight: 'bold' },
  stockLabel: { fontSize: 10, color: '#9ca3af' },
  outBadge: {
    backgroundColor: DANGER + '18',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  outBadgeText: { fontSize: 10, color: DANGER, fontWeight: 'bold' },
  lowBadge: {
    backgroundColor: WARNING + '18',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  lowBadgeText: { fontSize: 10, color: WARNING, fontWeight: 'bold' },

  // إحصائيات الكارد
  cardStats: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  cardStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStatText: { fontSize: 11, color: '#6b7280' },

  // أزرار الكارد
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: PRIMARY + '12',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  logBtnText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: PRIMARY,
  },
  editBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // فارغ
  empty: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyText: { fontSize: 14, color: '#9ca3af' },

  // modal مشترك
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  // modal السجل
  logCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logChangeChip: {
    minWidth: 48,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  logChipPos:    { backgroundColor: SUCCESS + '20' },
  logChipNeg:    { backgroundColor: DANGER  + '20' },
  logChangeText: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  logInfo:       { flex: 1, alignItems: 'flex-end' },
  logAfter:      { fontSize: 13, fontWeight: '600', color: '#111827' },
  logNote:       { fontSize: 12, color: '#6b7280', marginTop: 2 },
  logMeta:       { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  // modal التعديل
  editCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  currentStock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  currentStockLabel: { fontSize: 13, color: '#6b7280' },
  currentStockVal:   { fontSize: 28, fontWeight: 'bold', color: PRIMARY },

  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  previewBox: {
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  previewOk:     { backgroundColor: SUCCESS + '15' },
  previewWarn:   { backgroundColor: WARNING + '15' },
  previewDanger: { backgroundColor: DANGER  + '15' },
  previewText:   { fontSize: 14, fontWeight: 'bold', color: '#111827' },

  reasonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  reasonChipOn:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  reasonText:    { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  reasonTextOn:  { color: '#fff' },

  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
