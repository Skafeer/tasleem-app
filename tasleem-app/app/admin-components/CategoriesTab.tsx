import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator,
  PanResponder, Animated, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const ITEM_H  = 68;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Category = {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

// ─────────────────────────────────────────────────────────────────
//  DraggableList  —  السحب مع انميشن احترافي
// ─────────────────────────────────────────────────────────────────
function DraggableList({
  items,
  onReorder,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  items: Category[];
  onReorder: (from: number, to: number) => void;
  onEdit:    (cat: Category) => void;
  onDelete:  (cat: Category) => void;
  onToggleActive: (cat: Category) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [dragFrom, setDragFrom] = useState(0);
  const [dragTo,   setDragTo]   = useState(0);

  // انميشن الكارد المسحوب
  const dragY       = useRef(new Animated.Value(0)).current;
  const dragScale   = useRef(new Animated.Value(1)).current;    // تكبير عند التفعيل
  const dragOpacity = useRef(new Animated.Value(1)).current;    // شفافية أثناء السحب
  const shakeAnim   = useRef(new Animated.Value(0)).current;    // اهتزاز خفيف

  const fromRef    = useRef(0);
  const isDragging = useRef(false);

  // ── اهتزاز قصير لحظة التفعيل ──────────────────────────────────
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -3, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  3, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

  // ── تفعيل انميشن السحب ────────────────────────────────────────
  const animateActivate = () => {
    Animated.parallel([
      Animated.spring(dragScale, {
        toValue: 1.05,
        useNativeDriver: true,
        speed: 25,
        bounciness: 8,
      }),
      Animated.timing(dragOpacity, {
        toValue: 0.93,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── إلغاء تفعيل الانميشن عند الإفلات ─────────────────────────
  const animateRelease = (callback: () => void) => {
    Animated.parallel([
      Animated.spring(dragY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 28,
        bounciness: 0,
      }),
      Animated.spring(dragScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(dragOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  // ── PanResponder ──────────────────────────────────────────────
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => isDragging.current,
      onStartShouldSetPanResponderCapture: () => isDragging.current,
      onMoveShouldSetPanResponder:         () => isDragging.current,
      onMoveShouldSetPanResponderCapture:  () => isDragging.current,

      onPanResponderMove: (_, gs) => {
        if (!isDragging.current) return;
        dragY.setValue(gs.dy);

        const newIdx  = Math.round(fromRef.current + gs.dy / ITEM_H);
        const clamped = Math.max(0, Math.min(items.length - 1, newIdx));
        setDragTo(clamped);
      },

      onPanResponderRelease: (_, gs) => {
        if (!isDragging.current) return;
        const toIdx = Math.max(0, Math.min(items.length - 1,
          Math.round(fromRef.current + gs.dy / ITEM_H)));

        animateRelease(() => {
          isDragging.current = false;
          setDragging(false);
          if (toIdx !== fromRef.current) onReorder(fromRef.current, toIdx);
        });
      },

      onPanResponderTerminate: () => {
        animateRelease(() => {
          isDragging.current = false;
          setDragging(false);
        });
      },
    })
  ).current;

  // ── تفعيل السحب من onLongPress ────────────────────────────────
  const startDrag = (index: number) => {
    fromRef.current    = index;
    isDragging.current = true;
    dragY.setValue(0);
    dragScale.setValue(1);
    dragOpacity.setValue(1);
    setDragFrom(index);
    setDragTo(index);
    setDragging(true);

    // انميشن التفعيل + اهتزاز
    triggerShake();
    animateActivate();
  };

  return (
    <View style={{ flex: 1 }} {...pan.panHandlers}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragging}
        scrollEventThrottle={16}>

        {items.map((item, index) => {
          const isThisOne = dragging && dragFrom === index;
          const isTarget  = dragging && dragTo === index && dragFrom !== index;

          // الكارد المسحوب يأخذ كل الانميشنات
          const cardStyle = isThisOne
            ? {
                transform: [
                  { translateY: dragY },
                  { translateX: shakeAnim },
                  { scale: dragScale },
                ],
                opacity: dragOpacity,
                zIndex: 999,
                // ظل قوي مع لون البراند
                shadowColor: PRIMARY,
                shadowOpacity: 0.35,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 16,
              }
            : {};

          // انميشن الكاردات الأخرى: تنزاح بخفة لتحرر المكان
          const otherTranslate = (() => {
            if (!dragging || isThisOne) return 0;
            const from = dragFrom;
            const to   = dragTo;
            if (from < to) {
              // السحب لأسفل: الكاردات بين from+1 و to تطلع فوق
              if (index > from && index <= to) return -ITEM_H;
            } else {
              // السحب لأعلى: الكاردات بين to و from-1 تنزل
              if (index >= to && index < from) return ITEM_H;
            }
            return 0;
          })();

          return (
            <Animated.View
              key={String(item.id)}
              style={[
                cardStyle,
                !isThisOne && {
                  transform: [{
                    translateY: otherTranslate,
                  }],
                },
              ]}>

              <View style={[
                s.card,
                !item.isActive && s.cardInactive,
                isThisOne && s.cardDragging,
                isTarget   && s.cardTarget,
              ]}>

                {/* ☰  مقبض السحب */}
                <TouchableOpacity
                  delayLongPress={180}
                  onLongPress={() => startDrag(index)}
                  activeOpacity={0.6}
                  style={[s.dragHandle, isThisOne && s.dragHandleActive]}>
                  <Ionicons
                    name="reorder-three-outline"
                    size={26}
                    color={isThisOne ? '#fff' : '#b0bec5'}
                  />
                </TouchableOpacity>

                {/* اسم الفئة */}
                <View style={s.cardMid}>
                  <Text style={[s.catName, !item.isActive && s.inactiveText]}>{item.name}</Text>
                  <Text style={s.catOrder}>الترتيب: {index + 1}</Text>
                </View>

                {/* أزرار */}
                <View style={s.cardLeft}>
                  <TouchableOpacity
                    onPress={() => onToggleActive(item)}
                    style={[s.toggleBtn, item.isActive && s.toggleOn]}>
                    <Text style={[s.toggleText, item.isActive && s.toggleTextOn]}>
                      {item.isActive ? 'نشط' : 'مخفي'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => onEdit(item)} style={s.editBtn}>
                    <Ionicons name="pencil-outline" size={16} color={PRIMARY} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => onDelete(item)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────
export default function CategoriesTab() {
  const qc = useQueryClient();
  const [showModal,     setShowModal]     = useState(false);
  const [editItem,      setEditItem]      = useState<Category | null>(null);
  const [form,          setForm]          = useState({ name: '' });
  const [localList,     setLocalList]     = useState<Category[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/categories');
      const sorted   = (data as Category[]).sort((a, b) => a.sortOrder - b.sortOrder);
      setLocalList(sorted);
      return sorted;
    },
  });

  const createCat = useMutation({
    mutationFn: async (body: any) => { const { data } = await api.post('/api/categories', body); return data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
    onError: (e: any) => Alert.alert('خطأ', e?.response?.data?.message || 'فشل الإضافة'),
  });

  const updateCat = useMutation({
    mutationFn: async ({ id, ...body }: any) => { const { data } = await api.patch(`/api/categories/${id}`, body); return data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (e: any) => Alert.alert('خطأ', e?.response?.data?.message || 'فشل التعديل'),
  });

  const deleteCat = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const openAdd    = () => { setEditItem(null); setForm({ name: '' }); setShowModal(true); };
  const openEdit   = (cat: Category) => { setEditItem(cat); setForm({ name: cat.name }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); };

  const handleSave = () => {
    if (!form.name.trim()) return Alert.alert('', 'اسم الفئة مطلوب');
    if (editItem) {
      updateCat.mutate({
        id: editItem.id, name: form.name.trim(),
        icon: editItem.icon || 'grid-outline',
        sortOrder: editItem.sortOrder, isActive: editItem.isActive,
      });
    } else {
      const maxOrder = localList.length > 0 ? Math.max(...localList.map(c => c.sortOrder)) : -1;
      createCat.mutate({ name: form.name.trim(), icon: 'grid-outline', sortOrder: maxOrder + 1 });
    }
  };

  const confirmDelete = (cat: Category) => {
    Alert.alert('حذف الفئة', `هل تريد حذف "${cat.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteCat.mutate(cat.id) },
    ]);
  };

  const toggleActive = (cat: Category) => {
    updateCat.mutate({
      id: cat.id, isActive: !cat.isActive,
      icon: cat.icon || 'grid-outline',
      name: cat.name, sortOrder: cat.sortOrder,
    });
  };

  const handleReorder = async (from: number, to: number) => {
    const updated   = [...localList];
    const [moved]   = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    const reindexed = updated.map((cat, i) => ({ ...cat, sortOrder: i }));
    setLocalList(reindexed);

    setIsSavingOrder(true);
    try {
      await Promise.all(
        reindexed.map(cat =>
          api.patch(`/api/categories/${cat.id}`, {
            name: cat.name, icon: cat.icon || 'grid-outline',
            sortOrder: cat.sortOrder, isActive: cat.isActive,
          })
        )
      );
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    } catch {
      Alert.alert('خطأ', 'فشل حفظ الترتيب');
      setLocalList([...categories]);
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (isLoading) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />;

  const displayList = localList.length > 0 ? localList : categories;

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.topRow}>
        <View style={s.topLeft}>
          <Text style={s.count}>{displayList.length} فئة</Text>
          {isSavingOrder && (
            <View style={s.savingRow}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={s.savingText}>جاري الحفظ...</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>إضافة فئة</Text>
        </TouchableOpacity>
      </View>

      {/* تعليمة */}
      <View style={s.hint}>
        <Ionicons name="information-circle-outline" size={14} color="#64748b" />
        <Text style={s.hintText}>اضغط مطولاً على ☰ واسحب لتغيير الترتيب</Text>
      </View>

      <DraggableList
        items={displayList}
        onReorder={handleReorder}
        onEdit={openEdit}
        onDelete={confirmDelete}
        onToggleActive={toggleActive}
      />

      {/* Modal إضافة/تعديل */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{editItem ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</Text>

            <Text style={s.label}>اسم الفئة</Text>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="مثال: إلكترونيات"
              textAlign="right"
              placeholderTextColor="#9ca3af"
              autoFocus
            />

            {!editItem && (
              <View style={s.autoOrderNote}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#16a34a" />
                <Text style={s.autoOrderText}>ستُضاف الفئة في آخر القائمة تلقائياً</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.saveBtn, (createCat.isPending || updateCat.isPending) && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={createCat.isPending || updateCat.isPending}>
              {(createCat.isPending || updateCat.isPending)
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveBtnText}>{editItem ? 'حفظ التعديل' : 'إضافة'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
              <Text style={s.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f2f6f9' },

  topRow:     { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  topLeft:    { alignItems: 'flex-end', gap: 4 },
  count:      { fontSize: 13, color: '#64748b', fontWeight: '600' },
  savingRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savingText: { fontSize: 11, color: PRIMARY },
  addBtn:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  hint:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  hintText: { fontSize: 11, color: '#64748b', textAlign: 'right' },

  card:         { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e8edf2', height: ITEM_H - 10 },
  cardInactive: { opacity: 0.55 },
  cardDragging: { borderColor: PRIMARY, borderWidth: 2, backgroundColor: PRIMARY + '0d' },
  cardTarget:   { borderColor: '#f59e0b', borderWidth: 2, borderStyle: 'dashed', backgroundColor: '#fffbeb' },

  // الزر العادي
  dragHandle:       { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e8edf2' },
  // الزر عند التفعيل → خلفية لون البراند
  dragHandleActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },

  cardMid:     { flex: 1, alignItems: 'flex-end' },
  catName:     { fontSize: 15, fontWeight: '700', color: '#0d1b2a' },
  inactiveText:{ color: '#9ca3af' },
  catOrder:    { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 6 },

  toggleBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  toggleOn:     { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  toggleText:   { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  toggleTextOn: { color: '#16a34a' },

  editBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY + '10', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 18, fontWeight: '900', color: '#0d1b2a', textAlign: 'right', marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'right', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#e8edf2', borderRadius: 12, padding: 12, fontSize: 15, color: '#0d1b2a', backgroundColor: '#f8fafc' },

  autoOrderNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 10 },
  autoOrderText: { fontSize: 12, color: '#16a34a', textAlign: 'right' },

  saveBtn:     { backgroundColor: PRIMARY, borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn:   { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelText:  { color: '#9ca3af', fontSize: 14 },
});

