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
  // إضافة Z لضمان تفسير التاريخ كـ UTC وليس توقيت محلي
  const utcDate = (date.endsWith('Z') || date.includes('+')) ? date : date + 'Z';
  const diff = Date.now() - new Date(utcDate).getTime();
  if (diff < 0) return 'الآن';
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${d} يوم`;
};

const getIcon = (data: any) => {
  try {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    if (d?.type === 'order_status')      return { icon: 'bag-check-outline',  color: INFO    };
    if (d?.type === 'withdrawal_status') return { icon: 'wallet-outline',      color: SUCCESS };
    if (d?.type === 'broadcast')         return { icon: 'megaphone-outline',   color: WARNING };
  } catch {}
  return { icon: 'notifications-outline', color: PRIMARY };
};

const TEMPLATES = [
  { label: '🎉 عرض خاص',   title: 'عرض خاص!',      body: 'لا تفوت عروضنا المميزة، تحقق من المنتجات الجديدة الآن!' },
  { label: '📦 منتج جديد', title: 'منتج جديد',      body: 'تم إضافة منتجات جديدة، اطلع عليها الآن!'              },
  { label: '⚠️ تنبيه',     title: 'تنبيه مهم',      body: 'يرجى الاطلاع على آخر التحديثات في التطبيق.'           },
];

export default function NotificationsTab() {
  const qc = useQueryClient();
  const [title, setTitle]          = useState('');
  const [body,  setBody]           = useState('');
  const [focusedField, setFocused] = useState<string | null>(null);

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

  const all = notifs as any[];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

        {/* ── بطاقة الإرسال ── */}
        <View style={s.sendCard}>
          <View style={s.sendHeader}>
            <View style={s.sendIconBox}>
              <Ionicons name="megaphone-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sendTitle}>إشعار جماعي</Text>
              <Text style={s.sendSub}>يصل لجميع المستخدمين فوراً</Text>
            </View>
          </View>

          {/* قوالب سريعة */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
            {TEMPLATES.map(t => (
              <TouchableOpacity key={t.label} style={s.chip} onPress={() => { setTitle(t.title); setBody(t.body); }}>
                <Text style={s.chipText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* العنوان */}
          <Text style={s.fieldLabel}>العنوان</Text>
          <View style={[s.inputBox, focusedField === 'title' && s.inputBoxFocused]}>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="مثال: عرض خاص 🎉"
              placeholderTextColor="#9ca3af"
              textAlign="right"
              onFocus={() => setFocused('title')}
              onBlur={() => setFocused(null)}
            />
            <Ionicons name="text-outline" size={18} color={focusedField === 'title' ? PRIMARY : '#9ca3af'} />
          </View>

          {/* الرسالة */}
          <Text style={s.fieldLabel}>الرسالة</Text>
          <View style={[s.inputBox, s.textareaBox, focusedField === 'body' && s.inputBoxFocused]}>
            <TextInput
              style={[s.input, { height: 70, textAlignVertical: 'top' }]}
              value={body}
              onChangeText={setBody}
              placeholder="اكتب رسالتك هنا..."
              placeholderTextColor="#9ca3af"
              textAlign="right"
              multiline
              numberOfLines={3}
              onFocus={() => setFocused('body')}
              onBlur={() => setFocused(null)}
            />
          </View>

          {/* معاينة */}
          {(title || body) ? (
            <View style={s.preview}>
              <View style={s.previewIconBox}>
                <Ionicons name="notifications" size={16} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.previewTitle} numberOfLines={1}>{title || 'العنوان'}</Text>
                <Text style={s.previewBody} numberOfLines={2}>{body || 'الرسالة'}</Text>
              </View>
              <View style={s.previewTag}><Text style={s.previewTagText}>معاينة</Text></View>
            </View>
          ) : null}

          {/* زر الإرسال */}
          <TouchableOpacity
            style={[s.sendBtn, (!title || !body || broadcast.isPending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={broadcast.isPending || !title || !body}>
            {broadcast.isPending
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={s.sendBtnText}>إرسال للجميع</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* ── هيدر السجل ── */}
        <View style={s.logHeader}>
          <View style={s.logTitleRow}>
            <Text style={s.logTitle}>سجل الإشعارات</Text>
          </View>
        </View>

        {/* ── القائمة ── */}
        {isLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 30 }} />
        ) : all.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIconBox}>
              <Ionicons name="notifications-off-outline" size={36} color="#9ca3af" />
            </View>
            <Text style={s.emptyTitle}>لا توجد إشعارات</Text>
            <Text style={s.emptyText}>ستظهر الإشعارات هنا عند وصولها</Text>
          </View>
        ) : (
          all.map((n: any) => {
            const { icon, color } = getIcon(n.data);
            return (
              <View key={n.id} style={[s.notifCard]}>
                <View style={[s.notifIconBox, { backgroundColor: color + '18' }]}>
                  <Ionicons name={icon as any} size={20} color={color} />
                </View>
                <View style={s.notifContent}>
                  <View style={s.notifTopRow}>
                    <Text style={s.notifTime}>{timeAgo(n.created_at)}</Text>
                    <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                  </View>
                  <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 14, paddingBottom: 60 },

  // إرسال
  sendCard:     { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 },
  sendHeader:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  sendIconBox:  { width: 44, height: 44, borderRadius: 14, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center' },
  sendTitle:    { fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  sendSub:      { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 2 },

  chip:         { backgroundColor: PRIMARY + '12', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: PRIMARY + '30' },
  chipText:     { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  fieldLabel:   { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 8, fontWeight: '600' },
  inputBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 14 },
  inputBoxFocused: { borderColor: PRIMARY, backgroundColor: '#fff' },
  textareaBox:  { height: 'auto' as any, minHeight: 90, paddingVertical: 12, alignItems: 'flex-start' },
  input:        { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' } as any,

  preview:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: '#f0f9fb', borderRadius: 14, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: PRIMARY + '30' },
  previewIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center' },
  previewTitle: { fontSize: 13, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  previewBody:  { fontSize: 11, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  previewTag:   { backgroundColor: PRIMARY + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  previewTagText: { fontSize: 10, color: PRIMARY, fontWeight: '700' },

  sendBtn:      { backgroundColor: PRIMARY, borderRadius: 14, height: 52,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  sendBtnOff:   { backgroundColor: '#9ca3af', shadowOpacity: 0 },
  sendBtnText:  { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // سجل
  logHeader:    { marginBottom: 14 },
  logTitleRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
  logTitle:     { fontSize: 16, fontWeight: 'bold', color: '#111827' },


  // بطاقة الإشعار
  notifCard:     { flexDirection: 'row-reverse', gap: 12, backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notifIconBox:  { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  notifContent:  { flex: 1 },
  notifTopRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 },
  notifTitle:    { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  notifTime:     { fontSize: 10, color: '#9ca3af' },
  notifBody:     { fontSize: 12, color: '#6b7280', textAlign: 'right', lineHeight: 18 },

  empty:         { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIconBox:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  emptyTitle:    { fontSize: 15, fontWeight: 'bold', color: '#374151' },
  emptyText:     { fontSize: 13, color: '#9ca3af' },
});
