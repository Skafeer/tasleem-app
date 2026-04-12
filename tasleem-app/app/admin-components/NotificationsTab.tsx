import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const WARNING = '#f59e0b';
const INFO = '#3b82f6';
const SUCCESS = '#10b981';
const BG = '#f2f6f9';

// قوالب الإشعارات الموسعة
const TEMPLATES = [
  { id: 1, label: '🎉 عرض خاص', title: 'عرض خاص! 🎉', body: 'لا تفوت عروضنا المميزة، تحقق من المنتجات الجديدة الآن!', icon: 'gift-outline' },
  { id: 2, label: '📦 منتج جديد', title: 'منتج جديد', body: 'تم إضافة منتجات جديدة، اطلع عليها الآن!', icon: 'cube-outline' },
  { id: 3, label: '⚠️ تنبيه مهم', title: 'تنبيه مهم', body: 'يرجى الاطلاع على آخر التحديثات في التطبيق.', icon: 'alert-circle-outline' },
  { id: 4, label: '💰 عروض الخصم', title: 'خصم يصل إلى 50%!', body: 'استمتع بخصومات كبيرة على جميع المنتجات لفترة محدودة.', icon: 'pricetag-outline' },
  { id: 5, label: '🚀 تحديث جديد', title: 'تحديث التطبيق', body: 'تم إصدار تحديث جديد للتطبيق، قم بالتحديث للحصول على الميزات الجديدة.', icon: 'rocket-outline' },
  { id: 6, label: '🎯 حملة تسويقية', title: 'حملة تسويقية', body: 'شارك في حملتنا التسويقية واحصل على مكافآت خاصة.', icon: 'megaphone-outline' },
  { id: 7, label: '⭐ تقييم المنتج', title: 'قيّم تجربتك', body: 'شاركنا رأيك في المنتجات التي اشتريتها.', icon: 'star-outline' },
  { id: 8, label: '🎂 مناسبة خاصة', title: 'عيد مبارك!', body: 'بمناسبة العيد، خصم 20% على جميع الطلبات. استخدم كود: EID20', icon: 'cake-outline' },
];

const timeAgo = (date: string) => {
  const utcDate = (date.endsWith('Z') || date.includes('+')) ? date : date + 'Z';
  const diff = Date.now() - new Date(utcDate).getTime();
  if (diff < 0) return 'الآن';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${d} يوم`;
};

const getIcon = (data: any) => {
  try {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    if (d?.type === 'order_status') return { icon: 'bag-check-outline', color: INFO };
    if (d?.type === 'withdrawal_status') return { icon: 'wallet-outline', color: SUCCESS };
    if (d?.type === 'broadcast') return { icon: 'megaphone-outline', color: WARNING };
  } catch { }
  return { icon: 'notifications-outline', color: PRIMARY };
};

const isAdminBroadcast = (notification: any) => {
  if (!notification.data) return true;
  try {
    const data = typeof notification.data === 'string'
      ? JSON.parse(notification.data)
      : notification.data;
    if (data?.type === 'order_status') return false;
    if (data?.type === 'withdrawal_status') return false;
    if (data?.type === 'system') return false;
    return data?.type === 'broadcast' || !data?.type;
  } catch {
    return true;
  }
};

export default function NotificationsTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [focusedField, setFocused] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications');
      return data;
    },
    refetchInterval: 30000,
  });

  const broadcast = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/broadcast', { title, body });
    },
    onSuccess: () => {
      toast.success('تم الإرسال لجميع المستخدمين ✅');
      setTitle('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (err: any) => toast.error(err?.message || 'فشل الإرسال'),
  });

  const handleSend = () => {
    if (!title.trim()) {
      toast.warning('أدخل العنوان');
      return;
    }
    if (!body.trim()) {
      toast.warning('أدخل النص');
      return;
    }
    Alert.alert(
      'تأكيد الإرسال',
      `هل أنت متأكد من إرسال هذا الإشعار لجميع المستخدمين؟\n\nالعنوان: ${title}\nالرسالة: ${body}`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'إرسال', style: 'default', onPress: () => broadcast.mutate() },
      ]
    );
  };

  const applyTemplate = (template: any) => {
    setTitle(template.title);
    setBody(template.body);
    setShowTemplates(false);
    toast.success(`تم تطبيق قالب "${template.label}"`);
  };

  const adminNotifications = notifs.filter(isAdminBroadcast);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

        {/* بطاقة الإرسال */}
        <View style={s.sendCard}>
          <View style={s.sendHeader}>
            <View style={s.sendIconBox}>
              <Ionicons name="megaphone-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sendTitle}>إشعار جماعي</Text>
              <Text style={s.sendSub}>يصل لجميع المستخدمين فوراً</Text>
            </View>
          </View>

          {/* زر القوالب الجاهزة */}
          <TouchableOpacity style={s.templateBtn} onPress={() => setShowTemplates(true)}>
            <Ionicons name="albums-outline" size={18} color={PRIMARY} />
            <Text style={s.templateBtnText}>القوالب الجاهزة</Text>
          </TouchableOpacity>

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

          <Text style={s.fieldLabel}>الرسالة</Text>
          <View style={[s.inputBox, s.textareaBox, focusedField === 'body' && s.inputBoxFocused]}>
            <TextInput
              style={[s.input, s.textareaInput]}
              value={body}
              onChangeText={setBody}
              placeholder="اكتب رسالتك هنا..."
              placeholderTextColor="#9ca3af"
              textAlign="right"
              multiline
              numberOfLines={4}
              onFocus={() => setFocused('body')}
              onBlur={() => setFocused(null)}
            />
          </View>

          {/* معاينة الإشعار */}
          {(title || body) && (
            <View style={s.preview}>
              <View style={s.previewHeader}>
                <View style={s.previewIconBox}>
                  <Ionicons name="notifications" size={16} color={PRIMARY} />
                </View>
                <Text style={s.previewTitle}>معاينة الإشعار</Text>
              </View>
              <View style={s.previewContent}>
                <Text style={s.previewMsgTitle}>{title || 'العنوان'}</Text>
                <Text style={s.previewMsgBody}>{body || 'الرسالة'}</Text>
              </View>
            </View>
          )}

          {/* زر الإرسال */}
          <TouchableOpacity
            style={[s.sendBtn, (!title || !body || broadcast.isPending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={broadcast.isPending || !title || !body}>
            {broadcast.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.sendBtnText}>إرسال للجميع</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* سجل الإشعارات */}
        <View style={s.logHeader}>
          <View style={s.logTitleRow}>
            <Text style={s.logTitle}>سجل الإشعارات</Text>
            <View style={s.logCountBadge}>
              <Text style={s.logCountText}>{adminNotifications.length}</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={s.loadingText}>جاري تحميل الإشعارات...</Text>
          </View>
        ) : adminNotifications.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIconBox}>
              <Ionicons name="notifications-off-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={s.emptyTitle}>لا توجد إشعارات</Text>
            <Text style={s.emptyText}>الإشعارات التي ترسلها ستظهر هنا</Text>
          </View>
        ) : (
          adminNotifications.map((n: any) => {
            const { icon, color } = getIcon(n.data);
            return (
              <View key={n.id} style={s.notifCard}>
                <View style={[s.notifIconBox, { backgroundColor: color + '12' }]}>
                  <Ionicons name={icon as any} size={20} color={color} />
                </View>
                <View style={s.notifContent}>
                  <View style={s.notifTopRow}>
                    <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                    <Text style={s.notifTime}>{timeAgo(n.created_at)}</Text>
                  </View>
                  <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal القوالب الجاهزة */}
      <Modal visible={showTemplates} transparent animationType="slide" onRequestClose={() => setShowTemplates(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>📋 القوالب الجاهزة</Text>
              <TouchableOpacity onPress={() => setShowTemplates(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={s.templateItem}
                  onPress={() => applyTemplate(template)}>
                  <View style={s.templateIcon}>
                    <Ionicons name={template.icon as any} size={22} color={PRIMARY} />
                  </View>
                  <View style={s.templateInfo}>
                    <Text style={s.templateLabel}>{template.label}</Text>
                    <Text style={s.templatePreview} numberOfLines={1}>{template.body}</Text>
                  </View>
                  <Ionicons name="chevron-back" size={18} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 14, paddingBottom: 60 },

  // بطاقة الإرسال
  sendCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  sendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sendIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  sendSub: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 2,
  },

  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PRIMARY + '12',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  templateBtnText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
  },

  fieldLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginBottom: 14,
  },
  inputBoxFocused: {
    borderColor: PRIMARY,
    backgroundColor: '#fff',
  },
  textareaBox: {
    minHeight: 90,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  textareaInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
  },

  preview: {
    backgroundColor: '#f0f9fb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  previewIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  previewContent: {
    paddingRight: 8,
  },
  previewMsgTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
    marginBottom: 4,
  },
  previewMsgBody: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },

  sendBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  sendBtnOff: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // سجل الإشعارات
  logHeader: {
    marginBottom: 14,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  logCountBadge: {
    backgroundColor: PRIMARY + '12',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  logCountText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  notifCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  notifIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  notifTime: {
    fontSize: 10,
    color: '#9ca3af',
  },
  notifBody: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    lineHeight: 18,
  },

  // Empty State
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },

  // Modal القوالب
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  templateIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  templateLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  templatePreview: {
    fontSize: 11,
    color: '#9ca3af',
  },
});