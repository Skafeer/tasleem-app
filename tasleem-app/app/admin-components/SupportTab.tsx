import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

const formatTime = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
};

export default function SupportTab() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reply, setReply] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => { const { data } = await api.get('/api/admin/support'); return data; },
    refetchInterval: 10000,
  });

  const sendReply = useMutation({
    mutationFn: async ({ userId, message }: { userId: number; message: string }) => {
      await api.post(`/api/admin/support/${userId}`, { message });
    },
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['admin-support'] });
    },
  });

  const handleSend = () => {
    if (!reply.trim() || !selectedUser) return;
    sendReply.mutate({ userId: selectedUser.userId, message: reply.trim() });
  };

  // تحديث الـ selectedUser بعد كل refetch
  useEffect(() => {
    if (selectedUser && (conversations as any[]).length > 0) {
      const updated = (conversations as any[]).find(c => c.userId === selectedUser.userId);
      if (updated) setSelectedUser(updated);
    }
  }, [conversations]);

  useEffect(() => {
    if (selectedUser?.messages?.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [selectedUser]);

  const convList = conversations as any[];

  // ── قائمة المحادثات ──
  if (!selectedUser) {
    return (
      <View style={s.container}>
        <View style={s.listHeader}>
          <Text style={s.listHeaderTitle}>محادثات الدعم</Text>
          <View style={s.countBadge}>
            <Text style={s.countText}>{convList.length}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>
        ) : convList.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>لا توجد محادثات</Text>
          </View>
        ) : (
          <FlatList
            data={convList}
            keyExtractor={(item: any) => String(item.userId)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }: any) => {
              const last = item.lastMessage;
              return (
                <TouchableOpacity style={s.convCard} onPress={() => setSelectedUser(item)}>
                  <View style={s.convAvatar}>
                    <Ionicons name="person" size={20} color="#fff" />
                    {item.unread > 0 && (
                      <View style={s.unreadBadge}>
                        <Text style={s.unreadText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.convInfo}>
                    <View style={s.convTop}>
                      <Text style={s.convTime}>{last ? formatTime(last.created_at) : ''}</Text>
                      <Text style={s.convName}>{item.storeName}</Text>
                    </View>
                    <View style={s.convBottom}>
                      <Text style={s.convPhone}>{item.phone}</Text>
                      {last && (
                        <Text style={s.convLastMsg} numberOfLines={1}>
                          {last.from_admin ? 'أنت: ' : ''}{last.message}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-back" size={16} color="#d1d5db" />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ── نافذة المحادثة ──
  const msgs = selectedUser.messages || [];

  return (
    <View style={s.container}>
      {/* هيدر المحادثة */}
      <View style={s.chatHeader}>
        <View style={s.chatHeaderInfo}>
          <Text style={s.chatHeaderName}>{selectedUser.storeName}</Text>
          <Text style={s.chatHeaderPhone}>{selectedUser.phone}</Text>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={() => setSelectedUser(null)}>
          <Ionicons name="arrow-forward" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={msgs}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={s.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>لا توجد رسائل</Text>
            </View>
          }
          renderItem={({ item, index }: any) => {
            const isAdmin = item.from_admin;
            const prevItem = msgs[index - 1];
            const showDate = !prevItem ||
              formatDate(item.created_at) !== formatDate(prevItem.created_at);

            return (
              <>
                {showDate && (
                  <View style={s.dateDivider}>
                    <Text style={s.dateDividerText}>{formatDate(item.created_at)}</Text>
                  </View>
                )}
                <View style={[s.msgRow, isAdmin ? s.msgRowAdmin : s.msgRowUser]}>
                  <View style={[s.bubble, isAdmin ? s.bubbleAdmin : s.bubbleUser]}>
                    <Text style={[s.bubbleText, isAdmin ? s.bubbleTextAdmin : s.bubbleTextUser]}>
                      {item.message}
                    </Text>
                    <Text style={[s.bubbleTime, isAdmin ? s.bubbleTimeAdmin : s.bubbleTimeUser]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              </>
            );
          }}
        />

        {/* حقل الرد */}
        <View style={s.inputRow}>
          <TouchableOpacity
            style={[s.sendBtn, (!reply.trim() || sendReply.isPending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!reply.trim() || sendReply.isPending}>
            {sendReply.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
          <TextInput
            style={s.input}
            value={reply}
            onChangeText={setReply}
            placeholder="اكتب ردك..."
            placeholderTextColor="#9ca3af"
            textAlign="right"
            multiline
            maxLength={500}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:       { fontSize: 15, color: '#9ca3af' },

  listHeader:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  listHeaderTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  countBadge:      { backgroundColor: PRIMARY + '15', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4 },
  countText:       { fontSize: 13, fontWeight: 'bold', color: PRIMARY },

  convCard:        { flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  convAvatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', position: 'relative' },
  unreadBadge:     { position: 'absolute', top: -2, right: -2, width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  unreadText:      { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  convInfo:        { flex: 1, gap: 4 },
  convTop:         { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  convName:        { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  convTime:        { fontSize: 11, color: '#9ca3af' },
  convBottom:      { gap: 2 },
  convPhone:       { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  convLastMsg:     { fontSize: 12, color: '#6b7280', textAlign: 'right' },

  chatHeader:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  chatHeaderInfo:  { flex: 1 },
  chatHeaderName:  { fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  chatHeaderPhone: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },

  messagesList:    { padding: 14, paddingBottom: 8, flexGrow: 1 },
  dateDivider:     { alignItems: 'center', marginVertical: 12 },
  dateDividerText: { fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },

  msgRow:          { flexDirection: 'row-reverse', marginBottom: 8, alignItems: 'flex-end' },
  msgRowAdmin:     { justifyContent: 'flex-end' },
  msgRowUser:      { justifyContent: 'flex-start' },

  bubble:          { maxWidth: '75%', borderRadius: 18, padding: 12, gap: 4 },
  bubbleAdmin:     { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
  bubbleUser:      { backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  bubbleText:      { fontSize: 14, lineHeight: 20 },
  bubbleTextAdmin: { color: '#fff', textAlign: 'right' },
  bubbleTextUser:  { color: '#111827', textAlign: 'right' },
  bubbleTime:      { fontSize: 10, textAlign: 'left' },
  bubbleTimeAdmin: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeUser:  { color: '#9ca3af' },

  inputRow:        { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  input:           { flex: 1, backgroundColor: '#f8fafc', borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100,
    borderWidth: 1.5, borderColor: '#e5e7eb' } as any,
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center' },
  sendBtnOff:      { backgroundColor: '#d1d5db' },
});
