import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, Image,
  KeyboardAvoidingView, Platform, UIManager,
  PanResponder, Animated, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const DANGER  = '#ef4444';
const SUCCESS = '#10b981';
const BG      = '#f2f6f9';
const ITEM_H  = 110; // ارتفاع كارد البنر في القائمة

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Banner = {
  id: number;
  title?: string;
  imageUrl: string;
  link?: string;
  isActive: boolean;
  sortOrder: number;
};

type BannerForm = {
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
};

const EMPTY_FORM: BannerForm = { title: '', imageUrl: '', link: '', isActive: true };

// ─────────────────────────────────────────────────────────────────
//  DragHandle — نفس النمط المستخدم في CategoriesTab
// ─────────────────────────────────────────────────────────────────
function DragHandle({ index, isActive, onDragStart, onDragMove, onDragEnd }: {
  index: number; isActive: boolean;
  onDragStart: (i: number) => void;
  onDragMove:  (dy: number) => void;
  onDragEnd:   (dy: number) => void;
}) {
  const timer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activated = useRef(false);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder:         () => activated.current,
    onMoveShouldSetPanResponderCapture:  () => activated.current,

    onPanResponderGrant: () => {
      activated.current = false;
      timer.current = setTimeout(() => {
        activated.current = true;
        onDragStart(index);
      }, 200);
    },
    onPanResponderMove: (_, gs) => {
      if (activated.current) onDragMove(gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      if (timer.current) clearTimeout(timer.current);
      if (activated.current) { activated.current = false; onDragEnd(gs.dy); }
    },
    onPanResponderTerminate: (_, gs) => {
      if (timer.current) clearTimeout(timer.current);
      if (activated.current) { activated.current = false; onDragEnd(gs.dy ?? 0); }
    },
  })).current;

  return (
    <Animated.View {...pan.panHandlers} style={[s.dragHandle, isActive && s.dragHandleActive]}>
      <Ionicons name="reorder-three-outline" size={26} color={isActive ? '#fff' : '#b0bec5'} />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DraggableList للبنرات
// ─────────────────────────────────────────────────────────────────
function DraggableList({ items, onReorder, onEdit, onDelete, onToggle }: {
  items: Banner[];
  onReorder: (from: number, to: number) => void;
  onEdit:    (b: Banner) => void;
  onDelete:  (b: Banner) => void;
  onToggle:  (b: Banner) => void;
}) {
  const [activeDrag, setActiveDrag] = useState<number | null>(null);
  const dragFromRef   = useRef(0);
  const dragToRef     = useRef(0);
  const itemsRef      = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const dragY       = useRef(new Animated.Value(0)).current;
  const dragScale   = useRef(new Animated.Value(1)).current;
  const dragOpacity = useRef(new Animated.Value(1)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;

  const neighborAnims = useRef(
    Array.from({ length: 30 }, () => new Animated.Value(0))
  ).current;

  const updateNeighbors = (from: number, to: number) => {
    const len = itemsRef.current.length;
    for (let i = 0; i < len; i++) {
      if (i === from) continue;
      let target = 0;
      if (from < to && i > from && i <= to) target = -ITEM_H;
      if (from > to && i >= to && i < from) target =  ITEM_H;
      Animated.spring(neighborAnims[i], { toValue: target, useNativeDriver: true, speed: 24, bounciness: 0 }).start();
    }
  };

  const resetNeighbors = (len: number) => {
    for (let i = 0; i < len; i++) {
      Animated.spring(neighborAnims[i], { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 0 }).start();
    }
  };

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

  const handleDragStart = (index: number) => {
    dragFromRef.current = index;
    dragToRef.current   = index;
    dragY.setValue(0); dragScale.setValue(1); dragOpacity.setValue(1); shakeAnim.setValue(0);
    setActiveDrag(index);
    triggerShake();
    Animated.parallel([
      Animated.spring(dragScale, { toValue: 1.04, useNativeDriver: true, speed: 20, bounciness: 5 }),
      Animated.timing(dragOpacity, { toValue: 0.93, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleDragMove = (dy: number) => {
    dragY.setValue(dy);
    const len   = itemsRef.current.length;
    const newTo = Math.max(0, Math.min(len - 1, Math.round(dragFromRef.current + dy / ITEM_H)));
    if (newTo !== dragToRef.current) {
      dragToRef.current = newTo;
      updateNeighbors(dragFromRef.current, newTo);
    }
  };

  const handleDragEnd = (dy: number) => {
    const len   = itemsRef.current.length;
    const from  = dragFromRef.current;
    const toIdx = Math.max(0, Math.min(len - 1, Math.round(from + dy / ITEM_H)));
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
      contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={activeDrag === null}>

      {items.map((item, index) => {
        const isDraggingThis = activeDrag === index;
        const isTarget = activeDrag !== null && dragToRef.current === index && dragFromRef.current !== index;

        return (
          <Animated.View
            key={String(item.id)}
            style={isDraggingThis ? {
              transform: [
                { translateY: dragY },
                { translateX: shakeAnim },
                { scale: dragScale },
              ],
              opacity: dragOpacity,
              zIndex: 999,
              shadowColor: PRIMARY,
              shadowOpacity: 0.35,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 14,
            } : {
              transform: [{ translateY: neighborAnims[index] }],
              zIndex: 1,
            }}>

            <View style={[
              s.card,
              !item.isActive && s.cardOff,
              isDraggingThis && s.cardDragging,
              isTarget && s.cardTarget,
            ]}>
              {/* صورة البنر بنسبة 16:9 */}
              <View style={s.imgWrap}>
                <Image source={{ uri: item.imageUrl }} style={s.img} resizeMode="cover" />
                {!item.isActive && (
                  <View style={s.offOverlay}>
                    <Text style={s.offTxt}>معطل</Text>
                  </View>
                )}
              </View>

              {/* صف المعلومات والأزرار */}
              <View style={s.cardBottom}>
                {/* مقبض السحب */}
                <DragHandle
                  index={index}
                  isActive={isDraggingThis}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />

                {/* معلومات */}
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {item.title || 'بدون عنوان'}
                  </Text>
                  {item.link ? (
                    <Text style={s.cardLink} numberOfLines={1}>{item.link}</Text>
                  ) : null}
                </View>

                {/* أزرار */}
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={[s.toggleBtn, item.isActive && s.toggleOn]}
                    onPress={() => onToggle(item)}>
                    <Text style={[s.toggleTxt, item.isActive && s.toggleTxtOn]}>
                      {item.isActive ? 'نشط' : 'مخفي'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.editBtn} onPress={() => onEdit(item)}>
                    <Ionicons name="pencil-outline" size={15} color={PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item)}>
                    <Ionicons name="trash-outline" size={15} color={DANGER} />
                  </TouchableOpacity>
                </View>
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
export default function BannersTab() {
  const qc = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const [showModal,  setShowModal]  = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [localList, setLocalList] = useState<Banner[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data } = await api.get('/api/banners');
      const sorted = (data as Banner[]).sort((a, b) => a.sortOrder - b.sortOrder);
      setLocalList(sorted);
      return sorted;
    },
  });

  const saveBanner = useMutation({
    mutationFn: async (d: any) => {
      if (editBanner) {
        const { data } = await api.patch(`/api/banners/${editBanner.id}`, d);
        return data;
      }
      const { data } = await api.post('/api/banners', d);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success(editBanner ? 'تم تعديل البنر ✅' : 'تم إضافة البنر ✅');
      closeModal();
    },
    onError: () => toast.error('فشل الحفظ'),
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { data } = await api.patch(`/api/banners/${id}`, { isActive });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: () => toast.error('فشل التحديث'),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/banners/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success('تم حذف البنر');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ── رفع الصورة بجودة عالية ──────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('يرجى السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,       // ✅ أعلى جودة
      base64: true,
      allowsEditing: false,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const base64 = `data:${mimeType};base64,${asset.base64}`;
      const { data } = await api.post('/api/upload', { image: base64 });
      setForm(p => ({ ...p, imageUrl: data.url }));
      toast.success('تم رفع الصورة ✅');
    } catch {
      toast.error('فشل رفع الصورة');
    }
    setUploading(false);
  };

  // ── إعادة الترتيب ───────────────────────────────────────────
  const handleReorder = async (from: number, to: number) => {
    const updated    = [...localList];
    const [moved]    = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    const reindexed  = updated.map((b, i) => ({ ...b, sortOrder: i }));
    setLocalList(reindexed);

    setIsSavingOrder(true);
    try {
      await Promise.all(
        reindexed.map(b => api.patch(`/api/banners/${b.id}`, {
          title: b.title, imageUrl: b.imageUrl, link: b.link,
          isActive: b.isActive, sortOrder: b.sortOrder,
        }))
      );
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
    } catch {
      toast.error('فشل حفظ الترتيب');
      setLocalList([...(banners as Banner[])]);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const openAdd = () => {
    setEditBanner(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (b: Banner) => {
    setEditBanner(b);
    setForm({ title: b.title || '', imageUrl: b.imageUrl, link: b.link || '', isActive: Boolean(b.isActive) });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditBanner(null); setForm(EMPTY_FORM); };

  const handleSave = () => {
    if (!form.imageUrl) { toast.warning('يرجى رفع صورة البنر'); return; }
    saveBanner.mutate({
      title: form.title.trim(),
      imageUrl: form.imageUrl,
      link: form.link.trim(),
      isActive: form.isActive,
    });
  };

  const confirmDelete = (b: Banner) => {
    Alert.alert('حذف البنر', 'هل تريد حذف هذا البنر نهائياً؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteBanner.mutate(b.id) },
    ]);
  };

  if (isLoading) return (
    <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
  );

  const displayList = localList.length > 0 ? localList : (banners as Banner[]);

  // نسبة 16:9 لمعاينة الصورة في الـ modal
  const previewH = Math.round((screenWidth - 80) * 9 / 16);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* Header */}
      <View style={s.topRow}>
        <View style={s.topLeft}>
          <Text style={s.count}>{displayList.length} بنر</Text>
          {isSavingOrder && (
            <View style={s.savingRow}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={s.savingText}>جاري الحفظ...</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnTxt}>إضافة بنر</Text>
        </TouchableOpacity>
      </View>

      {/* تعليمة السحب */}
      <View style={s.hint}>
        <Ionicons name="information-circle-outline" size={14} color="#64748b" />
        <Text style={s.hintText}>اضغط مطولاً على ☰ واسحب لتغيير الترتيب</Text>
      </View>

      {displayList.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="image-outline" size={52} color="#d1d5db" />
          <Text style={s.emptyTxt}>لا توجد بنرات</Text>
        </View>
      ) : (
        <DraggableList
          items={displayList}
          onReorder={handleReorder}
          onEdit={openEdit}
          onDelete={confirmDelete}
          onToggle={(b) => toggleBanner.mutate({ id: b.id, isActive: !b.isActive })}
        />
      )}

      {/* Modal الإضافة/التعديل */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.overlay}>
            <View style={s.sheet}>

              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>{editBanner ? 'تعديل البنر' : 'إضافة بنر جديد'}</Text>

              <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>

                {/* معاينة / رفع الصورة بنسبة 16:9 */}
                <Text style={s.label}>صورة البنر * <Text style={s.labelSub}>(1920 × 1080 — نسبة 16:9)</Text></Text>
                <TouchableOpacity
                  style={[s.uploadBox, { height: previewH }]}
                  onPress={pickImage}
                  disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={PRIMARY} size="large" />
                  ) : form.imageUrl ? (
                    <Image source={{ uri: form.imageUrl }} style={s.uploadPreview} resizeMode="cover" />
                  ) : (
                    <View style={s.uploadPlaceholder}>
                      <Ionicons name="image-outline" size={40} color={PRIMARY + '60'} />
                      <Text style={s.uploadTxt}>اضغط لرفع صورة البنر</Text>
                      <Text style={s.uploadSub}>1920 × 1080 — 16:9</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {form.imageUrl && (
                  <TouchableOpacity style={s.changeBtn} onPress={pickImage}>
                    <Text style={s.changeTxt}>تغيير الصورة</Text>
                  </TouchableOpacity>
                )}

                <Text style={s.label}>العنوان (اختياري)</Text>
                <TextInput
                  style={s.input}
                  value={form.title}
                  onChangeText={v => setForm(p => ({ ...p, title: v }))}
                  placeholder="عنوان البنر..."
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                />

                <Text style={s.label}>الرابط (اختياري)</Text>
                <TextInput
                  style={s.input}
                  value={form.link}
                  onChangeText={v => setForm(p => ({ ...p, link: v }))}
                  placeholder="https://..."
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                  keyboardType="url"
                  autoCapitalize="none"
                />

                {/* مفتاح التفعيل */}
                <TouchableOpacity
                  style={[s.activeToggle, { borderColor: form.isActive ? SUCCESS : '#e5e7eb' }]}
                  onPress={() => setForm(p => ({ ...p, isActive: !p.isActive }))}>
                  <View style={[s.activeTrack, form.isActive && s.activeTrackOn]}>
                    <View style={[s.activeThumb, form.isActive && s.activeThumbOn]} />
                  </View>
                  <Text style={[s.activeTxt, { color: form.isActive ? SUCCESS : '#9ca3af' }]}>
                    {form.isActive ? '✅ البنر فعال — سيظهر في الصفحة الرئيسية' : '❌ البنر معطل'}
                  </Text>
                </TouchableOpacity>

              </ScrollView>

              <View style={s.sheetFooter}>
                <TouchableOpacity style={s.cancelModalBtn} onPress={closeModal}>
                  <Text style={s.cancelModalTxt}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saveBanner.isPending && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saveBanner.isPending}>
                  {saveBanner.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.saveBtnTxt}>{editBanner ? 'حفظ التعديلات' : 'إضافة البنر'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt:{ fontSize: 15, color: '#9ca3af' },

  topRow:  { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  topLeft: { alignItems: 'flex-end', gap: 4 },
  count:   { fontSize: 13, color: '#64748b', fontWeight: '600' },
  savingRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savingText: { fontSize: 11, color: PRIMARY },
  addBtn:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  hint:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  hintText: { fontSize: 11, color: '#64748b', textAlign: 'right' },

  // ── كارد البنر ──
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e8edf2',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardOff:      { opacity: 0.55 },
  cardDragging: { borderColor: PRIMARY, borderWidth: 2 },
  cardTarget:   { borderColor: '#f59e0b', borderWidth: 2, borderStyle: 'dashed' },

  // صورة 16:9
  imgWrap: { width: '100%', aspectRatio: 16 / 9, position: 'relative' },
  img:     { width: '100%', height: '100%' },
  offOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  offTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  cardBottom: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, gap: 8,
  },
  dragHandle: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
    borderRadius: 10, backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e8edf2',
  },
  dragHandleActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },

  cardInfo:  { flex: 1, alignItems: 'flex-end' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#0d1b2a' },
  cardLink:  { fontSize: 11, color: '#9ca3af' },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: '#f3f4f6',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  toggleOn:     { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  toggleTxt:    { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  toggleTxtOn:  { color: '#16a34a' },
  editBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PRIMARY + '10', justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center',
  },

  // ── Modal ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '94%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginTop: 14, marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0d1b2a', textAlign: 'right', paddingHorizontal: 20, marginBottom: 4 },
  sheetBody:  { padding: 20, paddingBottom: 8 },
  sheetFooter:{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  label:    { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 6, marginTop: 14, fontWeight: '600' },
  labelSub: { fontSize: 10, color: '#9ca3af', fontWeight: '400' },
  input:    { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },

  uploadBox: {
    borderWidth: 2, borderColor: PRIMARY + '40', borderStyle: 'dashed',
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: PRIMARY + '06', overflow: 'hidden',
  },
  uploadPreview:   { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center', gap: 8 },
  uploadTxt:       { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  uploadSub:       { fontSize: 11, color: '#9ca3af' },
  changeBtn:       { alignSelf: 'center', marginTop: 8 },
  changeTxt:       { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  activeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 16, backgroundColor: '#f9fafb',
    borderRadius: 14, padding: 14, borderWidth: 1.5,
  },
  activeTrack:   { width: 44, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb', justifyContent: 'center', padding: 2 },
  activeTrackOn: { backgroundColor: SUCCESS },
  activeThumb:   { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  activeThumbOn: { alignSelf: 'flex-end' },
  activeTxt:     { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },

  cancelModalBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  cancelModalTxt: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  saveBtn:    { flex: 2, height: 50, borderRadius: 14, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
