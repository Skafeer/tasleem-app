import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

type Category = {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

// ── DraggableItem ──────────────────────────────────────────────
function DraggableItem({
  item,
  index,
  total,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  isDragging,
  onLongPress,
}: {
  item: Category;
  index: number;
  total: number;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onToggleActive: (cat: Category) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isDragging: boolean;
  onLongPress: () => void;
}) {
  return (
    <View style={[s.card, !item.isActive && s.cardInactive, isDragging && s.cardDragging]}>
      {/* مقبض السحب */}
      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={300}
        style={s.dragHandle}
        activeOpacity={0.6}>
        <Ionicons name="reorder-three-outline" size={22} color={isDragging ? PRIMARY : '#9ca3af'} />
      </TouchableOpacity>

      {/* اسم الفئة والترتيب */}
      <View style={s.cardMid}>
        <Text style={[s.catName, !item.isActive && s.inactiveText]}>{item.name}</Text>
        <Text style={s.catOrder}>الترتيب: {index + 1}</Text>
      </View>

      {/* أزرار التحكم */}
      <View style={s.cardLeft}>
        {/* أسهم الأعلى والأسفل */}
        <View style={s.arrowCol}>
          <TouchableOpacity
            style={[s.arrowBtn, index === 0 && s.arrowBtnDisabled]}
            onPress={() => onMoveUp(index)}
            disabled={index === 0}>
            <Ionicons name="chevron-up-outline" size={14} color={index === 0 ? '#d1d5db' : PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.arrowBtn, index === total - 1 && s.arrowBtnDisabled]}
            onPress={() => onMoveDown(index)}
            disabled={index === total - 1}>
            <Ionicons name="chevron-down-outline" size={14} color={index === total - 1 ? '#d1d5db' : PRIMARY} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => onToggleActive(item)} style={[s.toggleBtn, item.isActive && s.toggleOn]}>
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
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function CategoriesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal]         = useState(false);
  const [editItem, setEditItem]           = useState<Category | null>(null);
  const [form, setForm]                   = useState({ name: '' });
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/categories');
      const sorted = (data as Category[]).sort((a, b) => a.sortOrder - b.sortOrder);
      setLocalCategories(sorted);
      return sorted;
    },
  });

  const createCat = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/categories', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
    onError: (e: any) => Alert.alert('خطأ', e?.response?.data?.message || 'فشل الإضافة'),
  });

  const updateCat = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const { data } = await api.patch(`/api/categories/${id}`, body);
      return data;
    },
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

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '' });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditItem(cat);
    setForm({ name: cat.name });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditItem(null); };

  const handleSave = () => {
    if (!form.name.trim()) return Alert.alert('', 'اسم الفئة مطلوب');

    if (editItem) {
      updateCat.mutate({
        id: editItem.id,
        name: form.name.trim(),
        icon: editItem.icon || 'grid-outline',
        sortOrder: editItem.sortOrder,
        isActive: editItem.isActive,
      });
    } else {
      // الفئة الجديدة دائماً آخر واحدة
      const maxOrder = localCategories.length > 0
        ? Math.max(...localCategories.map(c => c.sortOrder))
        : -1;
      createCat.mutate({
        name: form.name.trim(),
        icon: 'grid-outline',
        sortOrder: maxOrder + 1,
      });
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
      id: cat.id,
      isActive: !cat.isActive,
      icon: cat.icon || 'grid-outline',
      name: cat.name,
      sortOrder: cat.sortOrder,
    });
  };

  // ── منطق إعادة الترتيب ──────────────────────────────────────
  const reorder = async (from: number, to: number) => {
    if (from === to) return;
    const updated = [...localCategories];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);

    // تحديث sortOrder لكل عنصر
    const reindexed = updated.map((cat, i) => ({ ...cat, sortOrder: i }));
    setLocalCategories(reindexed);

    // حفظ في الباك اند
    setIsSavingOrder(true);
    try {
      await Promise.all(
        reindexed.map(cat =>
          api.patch(`/api/categories/${cat.id}`, {
            name: cat.name,
            icon: cat.icon || 'grid-outline',
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          })
        )
      );
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    } catch {
      Alert.alert('خطأ', 'فشل حفظ الترتيب');
      setLocalCategories([...categories]);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const moveUp   = (index: number) => reorder(index, index - 1);
  const moveDown = (index: number) => reorder(index, index + 1);

  // الضغط المطوّل يفتح قائمة لاختيار الموضع الجديد
  const handleLongPress = (index: number) => {
    setDraggingIndex(index);
    const current = localCategories[index];
    Alert.alert(
      `نقل: ${current.name}`,
      'اختر الموضع الجديد للفئة:',
      [
        { text: 'إلغاء', style: 'cancel', onPress: () => setDraggingIndex(null) },
        ...localCategories.map((cat, i) => ({
          text: i === index
            ? `← ${cat.name} (الحالي)`
            : `${i + 1}. ${cat.name}`,
          onPress: () => {
            reorder(index, i);
            setDraggingIndex(null);
          },
        })),
      ],
      { cancelable: true, onDismiss: () => setDraggingIndex(null) }
    );
  };

  if (isLoading) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />;

  const displayList = localCategories.length > 0 ? localCategories : categories;

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

      {/* تعليمات */}
      <View style={s.hint}>
        <Ionicons name="information-circle-outline" size={14} color="#64748b" />
        <Text style={s.hintText}>اضغط مطولاً على ☰ لنقل الفئة، أو استخدم أسهم ↑↓</Text>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <DraggableItem
            item={item}
            index={index}
            total={displayList.length}
            onEdit={openEdit}
            onDelete={confirmDelete}
            onToggleActive={toggleActive}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            isDragging={draggingIndex === index}
            onLongPress={() => handleLongPress(index)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="list-outline" size={40} color="#9ca3af" />
            <Text style={s.emptyText}>لا توجد فئات</Text>
          </View>
        }
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
  container: { flex: 1, backgroundColor: '#f2f6f9' },

  topRow:    { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  topLeft:   { alignItems: 'flex-end', gap: 4 },
  count:     { fontSize: 13, color: '#64748b', fontWeight: '600' },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savingText:{ fontSize: 11, color: PRIMARY },
  addBtn:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:{ color: '#fff', fontWeight: '700', fontSize: 13 },

  hint:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  hintText: { fontSize: 11, color: '#64748b', textAlign: 'right' },

  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e8edf2' },
  cardInactive: { opacity: 0.55 },
  cardDragging: { borderColor: PRIMARY, borderWidth: 2, backgroundColor: PRIMARY + '08', shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },

  dragHandle:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e8edf2' },

  cardMid:     { flex: 1, alignItems: 'flex-end' },
  catName:     { fontSize: 15, fontWeight: '700', color: '#0d1b2a' },
  inactiveText:{ color: '#9ca3af' },
  catOrder:    { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 6 },

  arrowCol:         { flexDirection: 'column', gap: 2 },
  arrowBtn:         { width: 26, height: 26, borderRadius: 8, backgroundColor: PRIMARY + '10', justifyContent: 'center', alignItems: 'center' },
  arrowBtnDisabled: { backgroundColor: '#f3f4f6' },

  toggleBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  toggleOn:     { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  toggleText:   { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  toggleTextOn: { color: '#16a34a' },

  editBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY + '10', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },

  empty:     { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#9ca3af' },

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
