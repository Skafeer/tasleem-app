import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

interface Notification {
  id: number;
  title: string;
  body: string;
  data: string | null;
  is_read: boolean;
  created_at: string;
  user_id: number;
}

// ── حالات الطلبات ──────────────────────────────────────────────
const ORDER_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  pending:    { label: 'قيد الانتظار',  color: '#f59e0b', icon: 'time-outline' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', icon: 'sync-outline' },
  preparing:  { label: 'قيد التجهيز',  color: '#8b5cf6', icon: 'cube-outline' },
  shipping:   { label: 'قيد التوصيل',  color: '#06b6d4', icon: 'bicycle-outline' },
  delivered:  { label: 'تم التوصيل',   color: '#10b981', icon: 'checkmark-circle-outline' },
  cancelled:  { label: 'ملغي',          color: '#ef4444', icon: 'close-circle-outline' },
  returned:   { label: 'راجع',          color: '#f97316', icon: 'arrow-undo-outline' },
  postponed:  { label: 'مؤجل',          color: '#6b7280', icon: 'pause-circle-outline' },
};

const timeAgo = (date: string) => {
  if (!date) return 'الآن';
  const utcDate = (date.endsWith('Z') || date.includes('+')) ? date : date + 'Z';
  const diff = Date.now() - new Date(utcDate).getTime();
  if (diff < 0) return 'الآن';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  if (d < 7) return `منذ ${d} يوم`;
  return new Date(utcDate).toLocaleDateString('ar-IQ');
};

const parseData = (data: any) => {
  if (!data) return null;
  try { return typeof data === 'string' ? JSON.parse(data) : data; }
  catch { return null; }
};

const getNotifStyle = (notification: Notification) => {
  const d = parseData(notification.data);
  if (d?.type === 'order_status') {
    const st = ORDER_STATUS[d.status] || { color: '#3b82f6', icon: 'bag-check-outline' };
    return { icon: st.icon, color: st.color, bg: st.color + '15' };
  }
  if (d?.type === 'withdrawal_status')
    return { icon: 'wallet-outline', color: '#10b981', bg: '#10b98115' };
  if (d?.type === 'broadcast')
    return { icon: 'megaphone-outline', color: '#f59e0b', bg: '#f59e0b15' };
  return { icon: 'notifications-outline', color: PRIMARY, bg: PRIMARY + '15' };
};

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── جلب الإشعارات ─────────────────────────────────────────────
  // ✅ نوقف كل auto-refetch لمنع مسح التحديثات المحلية (قراءة/حذف)
  const { data: notifications = [], isLoading, refetch, error } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      const [{ data }, { data: user }] = await Promise.all([
        api.get('/api/notifications'),
        api.get('/api/auth/me'),
      ]);
      if (!Array.isArray(data)) return [];
      return data
        .filter((n: any) => !n.user_id || n.user_id === user.id)
        .sort((a: Notification, b: Notification) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  // ✅ جلب فقط إذا الكاش فارغ — يمنع مسح التحديثات عند إعادة فتح الصفحة
  React.useEffect(() => {
    const cached = qc.getQueryData(['user-notifications']);
    if (!cached || (Array.isArray(cached) && cached.length === 0)) {
      refetch();
    }
  }, []);

  // ✅ لا useFocusEffect — يمنع مسح التحديثات (قراءة/حذف) عند العودة للصفحة

  // ── قراءة إشعار واحد ──────────────────────────────────────────
  const markAsRead = useMutation({
    mutationFn: (id: number) => api.patch(`/api/notifications/${id}/read`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['user-notifications'] });
      const prev = qc.getQueryData(['user-notifications']);
      qc.setQueryData(['user-notifications'], (old: Notification[] = []) =>
        old.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['user-notifications'], ctx.prev);
    },
    // ✅ بدون invalidate — العداد يُحسب من الكاش مباشرة
  });

  // ── قراءة الكل — نستخدم endpoint الفردي لكل إشعار ────────────
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const notifs = qc.getQueryData<Notification[]>(['user-notifications']) ?? [];
      const unread = notifs.filter(n => !n.is_read);
      // نرسل الطلبات بالتوازي
      await Promise.all(
        unread.map(n => api.patch(`/api/notifications/${n.id}/read`).catch(() => {}))
      );
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['user-notifications'] });
      const prevNotifs = qc.getQueryData(['user-notifications']);
      // تحديث فوري في الكاش
      qc.setQueryData(['user-notifications'], (old: Notification[] = []) =>
        old.map(n => ({ ...n, is_read: true }))
      );
      return { prevNotifs };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prevNotifs) qc.setQueryData(['user-notifications'], ctx.prevNotifs);
      toast.error('فشل تحديث الإشعارات');
    },
    onSuccess: () => {
      toast.success('تم تحديد الكل كمقروء ✅');
    },
  });

  // ── حذف إشعار ─────────────────────────────────────────────────
  const deleteNotif = useMutation({
    mutationFn: (id: number) => api.delete(`/api/notifications/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['user-notifications'] });
      const prev = qc.getQueryData<Notification[]>(['user-notifications']) ?? [];
      // ✅ حذف فوري من الكاش
      qc.setQueryData(['user-notifications'], prev.filter(n => n.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['user-notifications'], ctx.prev);
    },
    onSuccess: () => {
      setModalVisible(false);
      toast.success('تم حذف الإشعار');
    },
    // ✅ بدون onSettled/invalidate — يمنع إعادة ظهور الإشعار المحذوف
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePress = (notif: Notification) => {
    if (!notif.is_read) markAsRead.mutate(notif.id);
    setSelected(notif.is_read ? notif : { ...notif, is_read: true });
    setModalVisible(true);
  };

  // ✅ العداد محسوب مباشرة من الكاش — يتحدث فوراً مع كل تغيير
  const unreadCount = (notifications as Notification[]).filter(n => !n.is_read).length;

  // ── كارد الإشعار ──────────────────────────────────────────────
  const renderItem = ({ item }: { item: Notification }) => {
    const { icon, color, bg } = getNotifStyle(item);
    const d = parseData(item.data);
    const isOrder  = d?.type === 'order_status';
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[s.card, isUnread && s.cardUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.75}>

        {/* خط جانبي ملون للغير مقروء */}
        {isUnread && <View style={[s.unreadBar, { backgroundColor: color }]} />}

        {/* أيقونة */}
        <View style={[s.iconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>

        {/* المحتوى */}
        <View style={s.content}>
          <View style={s.topRow}>
            <Text style={s.time}>{timeAgo(item.created_at)}</Text>
            {isUnread && <View style={[s.dot, { backgroundColor: color }]} />}
          </View>
          <Text style={[s.title, isUnread && s.titleBold]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.body} numberOfLines={2}>{item.body}</Text>

          {/* بادج حالة الطلب */}
          {isOrder && d?.status && ORDER_STATUS[d.status] && (
            <View style={[s.badge, { backgroundColor: ORDER_STATUS[d.status].color + '15' }]}>
              <Ionicons name={ORDER_STATUS[d.status].icon as any} size={11} color={ORDER_STATUS[d.status].color} />
              <Text style={[s.badgeText, { color: ORDER_STATUS[d.status].color }]}>
                {ORDER_STATUS[d.status].label}
              </Text>
              {d?.orderId && (
                <Text style={[s.badgeText, { color: '#94a3b8' }]}>  •  #{d.orderId}</Text>
              )}
            </View>
          )}
        </View>

        {/* زر حذف */}
        <TouchableOpacity
          style={s.delBtn}
          onPress={() => deleteNotif.mutate(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle-outline" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── Bottom Sheet التفاصيل ──────────────────────────────────────
  const renderModal = () => {
    if (!selected) return null;
    const { icon, color, bg } = getNotifStyle(selected);
    const d = parseData(selected.data);
    const isOrder = d?.type === 'order_status';

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />

            <View style={s.sheetTop}>
              <View style={[s.sheetIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={28} color={color} />
              </View>
              <Text style={s.sheetTitle}>{selected.title}</Text>
              <Text style={s.sheetTime}>{timeAgo(selected.created_at)}</Text>
            </View>

            {isOrder && d?.status && ORDER_STATUS[d.status] && (
              <View style={[s.sheetBadge, {
                backgroundColor: ORDER_STATUS[d.status].color + '12',
                borderColor: ORDER_STATUS[d.status].color + '35',
              }]}>
                <Ionicons name={ORDER_STATUS[d.status].icon as any} size={16} color={ORDER_STATUS[d.status].color} />
                <Text style={[s.sheetBadgeText, { color: ORDER_STATUS[d.status].color }]}>
                  {ORDER_STATUS[d.status].label}
                </Text>
                {d?.orderId && (
                  <Text style={[s.sheetBadgeText, { color: '#64748b' }]}>  —  طلب #{d.orderId}</Text>
                )}
              </View>
            )}

            <Text style={s.sheetBody}>{selected.body}</Text>

            <View style={s.sheetFooter}>
              <TouchableOpacity
                style={s.sheetDel}
                onPress={() => deleteNotif.mutate(selected.id)}>
                <Ionicons name="trash-outline" size={17} color="#ef4444" />
                <Text style={s.sheetDelText}>حذف</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.sheetClose}
                onPress={() => setModalVisible(false)}>
                <Text style={s.sheetCloseText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <Text style={s.headerTitle}>الإشعارات</Text>
          {unreadCount > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={s.markAllBtn}
            onPress={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}>
            <Text style={s.markAllText}>
              {markAllAsRead.isPending ? '...' : 'قراءة الكل'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {/* المحتوى */}
      {error ? (
        <View style={s.center}>
          <View style={s.emptyIconBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          </View>
          <Text style={s.emptyTitle}>حدث خطأ</Text>
          <Text style={s.emptyText}>لم نتمكن من تحميل الإشعارات</Text>
          <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
            <Text style={s.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>جاري التحميل...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications as Notification[]}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.center}>
              <View style={s.emptyIconBox}>
                <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>لا توجد إشعارات</Text>
              <Text style={s.emptyText}>سيتم إعلامك عند وصول إشعار جديد</Text>
            </View>
          }
        />
      )}

      {renderModal()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 60 },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf2',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f0f9fa', borderWidth: 1.5, borderColor: '#d4eef3',
    justifyContent: 'center', alignItems: 'center',
  },
  headerMid:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:     { fontSize: 18, fontWeight: '800', color: '#0d1b2a' },
  headerBadge: {
    backgroundColor: '#ef4444', borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  markAllBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: PRIMARY + '12', borderRadius: 10,
  },
  markAllText: { fontSize: 12, color: PRIMARY, fontWeight: '700' },

  // ── List ──
  list: { padding: 14, paddingBottom: 30 },

  // ── Card ──
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 13, gap: 11,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: '#e8edf2', overflow: 'hidden',
  },
  cardUnread:  { borderColor: PRIMARY + '30', shadowOpacity: 0.08, elevation: 2 },
  unreadBar:   { position: 'absolute', right: 0, top: 0, bottom: 0, width: 3 },
  iconBox:     { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  content:     { flex: 1, gap: 3 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time:        { fontSize: 10, color: '#94a3b8' },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  title:       { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'right' },
  titleBold:   { fontWeight: '800', color: '#0d1b2a' },
  body:        { fontSize: 12, color: '#64748b', lineHeight: 17, textAlign: 'right' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    marginTop: 4, alignSelf: 'flex-end',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  delBtn:    { padding: 4 },

  // ── Empty / Error ──
  emptyIconBox: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: '#374151' },
  emptyText:   { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  retryBtn:    { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  retryText:   { color: '#fff', fontWeight: '700' },
  loadingText: { fontSize: 13, color: '#9ca3af' },

  // ── Bottom Sheet ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 14,
  },
  sheetHandle:    { width: 38, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  sheetTop:       { alignItems: 'center', gap: 10, marginBottom: 16 },
  sheetIcon:      { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sheetTitle:     { fontSize: 17, fontWeight: '800', color: '#0d1b2a', textAlign: 'center' },
  sheetTime:      { fontSize: 11, color: '#94a3b8' },
  sheetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, alignSelf: 'center', marginBottom: 14,
  },
  sheetBadgeText: { fontSize: 13, fontWeight: '700' },
  sheetBody:      { fontSize: 15, color: '#374151', lineHeight: 24, textAlign: 'right', marginBottom: 24 },
  sheetFooter:    { flexDirection: 'row', gap: 10 },
  sheetDel: {
    flex: 1, height: 46, borderRadius: 13, backgroundColor: '#fee2e2',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  sheetDelText:   { fontSize: 14, color: '#ef4444', fontWeight: '700' },
  sheetClose:     { flex: 2, height: 46, borderRadius: 13, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  sheetCloseText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
