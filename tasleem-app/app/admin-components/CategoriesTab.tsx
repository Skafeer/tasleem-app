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
//  DragHandle  —  كومبوننت مستقل، PanResponder مباشرة عليه
// ─────────────────────────────────────────────────────────────────
function DragHandle({
  index,
  isActive,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  index:       number;
  isActive:    boolean;
  onDragStart: (index: number) => void;
  onDragMove:  (dy: number) => void;
  onDragEnd:   (dy: number) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activated      = useRef(false);
  const startY         = useRef(0);

  const pan = useRef(
    PanResponder.create({
      // نأخذ الـ responder فوراً عند البدء
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => activated.current,
      onMoveShouldSetPanResponderCapture: () => activated.current,

      onPanResponderGrant: (e) => {
        activated.current = false;
        startY.current = e.nativeEvent.pageY;
        // ضغطة مطولة 200ms
        longPressTimer.current = setTimeout(() => {
          activated.current = true;
          onDragStart(index);
        }, 200);
      },

      onPanResponderMove: (_, gs) => {
        if (!activated.current) return;
        onDragMove(gs.dy);
      },

      onPanResponderRelease: (_, gs) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (activated.current) {
          activated.current = false;
          onDragEnd(gs.dy);
        }
      },

      onPanResponderTerminate: (_, gs) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (activated.current) {
          activated.current = false;
          onDragEnd(gs.dy ?? 0);
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[s.dragHandle, isActive && s.dragHandleActive]}>
      <Ionicons
        name="reorder-three-outline"
        size={26}
        color={isActive ? '#fff' : '#b0bec5'}
      />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DraggableList
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
  const [activeDrag, setActiveDrag] = useState<number | null>(null);

  const dragFromRef = useRef(0);
  const dragToRef   = useRef(0);
  const itemsRef    = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Animated values للكارد المسحوب
  const dragY       = useRef(new Animated.Value(0)).current;
  const dragScale   = useRef(new Animated.Value(1)).current;
  const dragOpacity = useRef(new Animated.Value(1)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;

  // Animated value لكل جار (ثابتة، مو تُعاد)
  const neighborAnims = useRef(
    Array.from({ length: 30 }, () => new Animated.Value(0))
  ).current;

  // ── تحريك الجيران ─────────────────────────────────────────────
  const updateNeighbors = (from: number, to: number) => {
    const len = itemsRef.current.length;
    for (let i = 0; i < len; i++) {
      if (i === from) continue;
      let target = 0;
      if (from < to && i > from && i <= to) target = -ITEM_H;
      if (from > to && i >= to && i < from) target =  ITEM_H;
      Animated.spring(neighborAnims[i], {
        toValue: target, useNativeDriver: true, speed: 24, bounciness: 0,
      }).start();
    }
  };

  const resetNeighbors = (len: number) => {
    for (let i = 0; i < len; i++) {
      Animated.spring(neighborAnims[i], {
        toValue: 0, useNativeDriver: true, speed: 24, bounciness: 0,
      }).start();
    }
  };

  // ── اهتزاز ────────────────────────────────────────────────────
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -3, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  3, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

  // ── بدء السحب ─────────────────────────────────────────────────
  const handleDragStart = (index: number) => {
    dragFromRef.current = index;
    dragToRef.current   = index;
    dragY.setValue(0);
    dragScale.setValue(1);
    dragOpacity.setValue(1);
    shakeAnim.setValue(0);
    setActiveDrag(index);
    triggerShake();
    Animated.parallel([
      Animated.spring(dragScale, { toValue: 1.06, useNativeDriver: true, speed: 20, bounciness: 5 }),
      Animated.timing(dragOpacity, { toValue: 0.93, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  // ── أثناء السحب ───────────────────────────────────────────────
  const handleDragMove = (dy: number) => {
    dragY.setValue(dy);
    const len   = itemsRef.current.length;
    const newTo = Math.max(0, Math.min(len - 1,
      Math.round(dragFromRef.current + dy / ITEM_H)));
    if (newTo !== dragToRef.current) {
      dragToRef.current = newTo;
      updateNeighbors(dragFromRef.current, newTo);
    }
  };

  // ── إفلات ─────────────────────────────────────────────────────
  const handleDragEnd = (dy: number) => {
    const len   = itemsRef.current.length;
    const from  = dragFromRef.current;
    const toIdx = Math.max(0, Math.min(len - 1,
      Math.round(from + dy / ITEM_H)));

    resetNeighbors(len);

    Animated.parallel([
      Animated.spring(dragY,     { toValue: 0, useNativeDriver: true, speed: 28, bounciness: 0 }),
      Animated.spring(dragScale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 3 }),
      Animated.timing(dragOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setActiveDrag(null);
      if (toIdx !== from) onReorder(from, toIdx);
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={activeDrag === null}
      scrollEventThrottle={16}>

      {items.map((item, index) => {
        const isDraggingThis = activeDrag === index;
        const isTarget = activeDrag !== null &&
          dragToRef.current === index && dragFromRef.current !== index;

        return (
          <Animated.View
            key={String(item.id)}
            style={
              isDraggingThis
                ? {
                    transform: [
                      { translateY: dragY },
                      { translateX: shakeAnim },
                      { scale: dragScale },
                    ],
                    opacity: dragOpacity,
                    zIndex: 999,
                    shadowColor: PRIMARY,
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 18,
                  }
                : {
                    transform: [{ translateY: neighborAnims[index] }],
                    zIndex: 1,
                  }
            }>

            <View style={[
              s.card,
              !item.isActive && s.cardInactive,
              isDraggingThis && s.cardDragging,
              isTarget && s.cardTarget,
            ]}>

              {/* ☰  مقبض السحب — PanResponder مباشرة عليه */}
              <DragHandle
                index={index}
                isActive={isDraggingThis}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />

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
