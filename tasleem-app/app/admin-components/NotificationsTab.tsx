import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const WARNING = '#f59e0b';
const INFO    = '#3b82f6';
const SUCCESS = '#10b981';

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${d} يوم`;
};

const getIcon = (data: any) => {
  try {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    if (d?.type === 'order_status')      return { icon: 'bag-outline',   color: INFO    };
    if (d?.type === 'withdrawal_status') return { icon: 'wallet-outline', color: SUCCESS };
  } catch {}
  return { icon: 'notifications-outline', color: PRIMARY };
};

export default function NotificationsTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body,  setBody]  = useState('');

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => { const { data } = await api.get('/api/notifications'); return data; },
    refetchInterval: 30000,
  });

  const broadcast = useMutation({
    mutationFn: async () => { await api.post('/api/notifications/broadcast', { title, body }); },
    onSuccess: () => {
      toast.success('تم الإرسال لجميع المستخدمين ✅');
      setTitle(''); setBody('');
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => toast.error('فشل الإرسال'),
  });

  const handleSend = () => {
    if (!title.trim()) { toast.warning('أدخل العنوان'); return; }
    if (!body.trim())  { toast.warning('أدخل النص');   return; }
    broadcast.mutate();
  };

  const all    = notifs as any[];
  const unread = all.filter(n => !n.is_read).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

        {/* إرسال إشعار جماعي */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="megaphone-outline" size={18} color={PRIMARY} />
            <Text style={s.cardTitle}>إرسال إشعار لجميع المستخدمين</Text>
          </View>
          <Text style={s.label}>العنوان</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle}
            placeholder="مثال: عرض خاص 🎉" placeholderTextColor="#9ca3af" textAlign="right" />
          <Text style={s.label}>النص</Text>
          <TextInput style={[s.input, s.textarea]} value={body} onChangeText={setBody}
            placeholder="اكتب رسالتك هنا..." placeholderTextColor="#9ca3af"
            textAlign="right" multiline numberOfLines={3} />
          {(title || body) ? (
            <View style={s.preview}>
              <View style={s.previewIcon}><Ionicons name="notifications" size={18} color={PRIMARY} /></View>
              <View style={s.previewBody}>
                <Text style={s.previewTitle}>{title || 'العنوان'}</Text>
                <Text style={s.previewText} numberOfLines={2}>{body || 'النص'}</Text>
              </View>
            </View>
          ) : null}
          <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={broadcast.isPending}>
            {broadcast.isPending
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="send-outline" size={16} color="#fff" /><Text style={s.sendTxt}>إرسال للجميع</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* سجل الإشعارات */}
        <View style={s.sectionHeader}>
          <Ionicons name="notifications-outline" size={16} color={PRIMARY} />
          <Text style={s.sectionTitle}>سجل الإشعارات</Text>
          {unread > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{unread} غير مقروء</Text></View>}
        </View>

        {isLoading ? <ActivityIndicator color={PRIMARY} style={{ marginTop: 30 }} /> :
         all.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد إشعارات</Text>
          </View>
        ) : all.map((n: any) => {
          const { icon, color } = getIcon(n.data);
          return (
            <View key={n.id} style={[s.notif, !n.is_read && s.notifUnread]}>
              <View style={[s.notifIcon, { backgroundColor: color+'15' }]}>
                <Ionicons name={icon as any} size={18} color={color} />
              </View>
              <View style={s.notifContent}>
                <Text style={s.notifTitle}>{n.title}</Text>
                <Text style={s.notifText} numberOfLines={2}>{n.body}</Text>
                <Text style={s.notifTime}>{timeAgo(n.created_at)}</Text>
              </View>
              {!n.is_read && <View style={s.dot} />}
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { padding: 12, paddingBottom: 50 },
  card:         { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardHeader:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle:    { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  label:        { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 6, fontWeight: '600' },
  input:        { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 12 },
  textarea:     { height: 80, textAlignVertical: 'top' },
  preview:      { flexDirection: 'row-reverse', gap: 10, backgroundColor: '#f8fafc',
    borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  previewIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: PRIMARY+'15',
    justifyContent: 'center', alignItems: 'center' },
  previewBody:  { flex: 1 },
  previewTitle: { fontSize: 13, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  previewText:  { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  sendBtn:      { backgroundColor: PRIMARY, borderRadius: 14, height: 48,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  sendTxt:      { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  sectionHeader:{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    marginBottom: 12, borderRightWidth: 3, borderRightColor: PRIMARY, paddingRight: 8 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#111827' },
  badge:        { backgroundColor: WARNING, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:     { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  notif:        { flexDirection: 'row-reverse', gap: 12, backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  notifUnread:  { borderRightWidth: 3, borderRightColor: PRIMARY },
  notifIcon:    { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle:   { fontSize: 13, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  notifText:    { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 3 },
  notifTime:    { fontSize: 10, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY, alignSelf: 'center' },
  empty:        { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTxt:     { fontSize: 14, color: '#9ca3af' },
});
