import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert, Clipboard, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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

type SortType = 'recent' | 'unread' | 'most';

export default function SupportTab() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('recent');
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => { const { data } = await api.get('/api/admin/support'); return data; },
    refetchInterval: 10000,
  });

  const sendReply = useMutation({
    mutationFn: async ({ userId, message, imageUrl }: { userId: number; message: string; imageUrl?: string }) => {
      await api.post(`/api/admin/support/${userId}`, { message, imageUrl });
    },
    onSuccess: () => { setReply(''); qc.invalidateQueries({ queryKey: ['admin-support'] }); },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, block }: { userId: number; block: boolean }) => {
      await api.post(`/api/admin/support/${userId}/block`, { block });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-support'] }),
  });

  // تصفير العداد لما يدخل للمحادثة
  const markAsRead = async (userId: number) => {
    // حدث الـ cache فوراً بدون انتظار
    qc.setQueryData(['admin-support'], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((c: any) => c.userId === userId ? { ...c, unread: 0 } : c);
    });
    try {
      await api.post(`/api/admin/support/${userId}/read`);
    } catch {}
  };

  const handleSend = () => {
    if (!reply.trim() || !selectedUser) return;
    sendReply.mutate({ userId: selectedUser.userId, message: reply.trim() });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('تنبيه', 'يرجى السماح بالوصول إلى الصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setUploadingImage(true);
    try {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const { data } = await api.post('/api/support/upload-image', { imageBase64: base64 });
      sendReply.mutate({ userId: selectedUser.userId, message: '', imageUrl: data.url });
    } catch { Alert.alert('خطأ', 'فشل رفع الصورة'); }
    finally { setUploadingImage(false); }
  };

  const handleLongPress = (msg: string) => {
    Clipboard.setString(msg);
    Alert.alert('', 'تم نسخ الرسالة');
  };

  const confirmBlock = (user: any) => {
    const isBlocked = user.isBlocked;
    Alert.alert(
      isBlocked ? 'فك الحظر' : 'حظر المستخدم',
      isBlocked ? `هل تريد فك حظر ${user.storeName}؟` : `هل تريد حظر ${user.storeName} من إرسال الرسائل؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: isBlocked ? 'فك الحظر' : 'حظر', style: 'destructive',
          onPress: () => blockMutation.mutate({ userId: user.userId, block: !isBlocked }) },
      ]
    );
  };

  useEffect(() => {
    if (selectedUser && (conversations as any[]).length > 0) {
      const updated = (conversations as any[]).find(c => c.userId === selectedUser.userId);
      if (updated) setSelectedUser(updated);
    }
  }, [conversations]);



  const convList = conversations as any[];

  // فلترة وفرز المحادثات
  const filtered = useMemo(() => {
    return [...convList]
      .filter(c => !search || c.storeName?.includes(search) || c.phone?.includes(search))
      .sort((a, b) => {
        if (sort === 'unread') return b.unread - a.unread;
        if (sort === 'most') return (b.messages?.length || 0) - (a.messages?.length || 0);
        // fallback لآخر رسالة من messages array إذا lastMessage مو موجود
        const getTime = (conv: any) => {
          if (conv.lastMessage?.created_at) return new Date(conv.lastMessage.created_at).getTime();
          const msgs = conv.messages || [];
          if (msgs.length > 0) return new Date(msgs[msgs.length - 1].created_at).getTime();
          return 0;
        };
        return getTime(b) - getTime(a);
      });
  }, [convList, search, sort]);

  // ── قائمة المحادثات ──
  if (!selectedUser) {
    return (
      <View style={s.container}>
        {/* بحث */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="بحث عن تاجر..."
            placeholderTextColor="#9ca3af"
            textAlign="right"
          />
        </View>

        {/* فرز */}
        <View style={s.sortRow}>
          {([['recent', 'الأحدث'], ['unread', 'غير مقروء'], ['most', 'الأكثر']] as [SortType, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[s.sortBtn, sort === key && s.sortBtnActive]}
              onPress={() => setSort(key)}>
              <Text style={[s.sortText, sort === key && s.sortTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>لا توجد محادثات</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item: any) => String(item.userId)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }: any) => {
              const last = item.lastMessage;
              return (
                <TouchableOpacity style={s.convCard} onPress={() => { setSelectedUser(item); if (item.unread > 0) markAsRead(item.userId); }}>
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
                          {last.from_admin ? 'أنت: ' : ''}{last.image_url ? 'صورة' : last.message}
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
  const msgs = [...(selectedUser.messages || [])];

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0c6679', '#0a8a9f']} style={s.chatHeader}>
        <TouchableOpacity style={s.backBtn} onPress={() => setSelectedUser(null)}>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.chatHeaderInfo}>
          <Text style={s.chatHeaderName}>{selectedUser.storeName}</Text>
          <Text style={s.chatHeaderPhone}>{selectedUser.phone}</Text>
        </View>
        <TouchableOpacity
          style={[s.blockBtn, selectedUser.isBlocked && s.unblockBtn]}
          onPress={() => confirmBlock(selectedUser)}>
          <Ionicons name={selectedUser.isBlocked ? 'lock-open-outline' : 'ban-outline'} size={16}
            color={selectedUser.isBlocked ? '#4ade80' : '#fca5a5'} />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={msgs}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={s.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<View style={s.center}><Text style={s.emptyText}>لا توجد رسائل</Text></View>}
          renderItem={({ item, index }: any) => {
            const isAdmin = item.from_admin;
            const prevItem = msgs[index - 1];
            const showDate = !prevItem || formatDate(item.created_at) !== formatDate(prevItem.created_at);
            return (
              <>
                {showDate && (
                  <View style={s.dateDivider}>
                    <Text style={s.dateDividerText}>{formatDate(item.created_at)}</Text>
                  </View>
                )}
                <View style={[s.msgRow, isAdmin ? s.msgRowAdmin : s.msgRowUser]}>
                  <TouchableOpacity style={{ maxWidth: '75%' }} onLongPress={() => item.message && handleLongPress(item.message)} activeOpacity={0.8}>
                    <View style={[s.bubble, isAdmin ? s.bubbleAdmin : s.bubbleUser]}>
                      {item.image_url && (
                        <Image source={{ uri: item.image_url }} style={s.msgImage} resizeMode="cover" />
                      )}
                      {!!item.message && (
                        <Text style={[s.bubbleText, isAdmin ? s.bubbleTextAdmin : s.bubbleTextUser]}>
                          {item.message}
                        </Text>
                      )}
                      <Text style={[s.bubbleTime, isAdmin ? s.bubbleTimeAdmin : s.bubbleTimeUser]}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            );
          }}
        />

        <View style={s.inputRow}>
          <TouchableOpacity
            style={[s.sendBtn, (!reply.trim() || sendReply.isPending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!reply.trim() || sendReply.isPending}>
            {sendReply.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={s.imageBtn} onPress={handlePickImage} disabled={uploadingImage}>
            {uploadingImage
              ? <ActivityIndicator color={PRIMARY} size="small" />
              : <Ionicons name="image-outline" size={22} color={PRIMARY} />}
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

  searchBox:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 12, marginBottom: 8, backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 14, height: 44,
    borderWidth: 1.5, borderColor: '#e5e7eb' },
  searchInput:     { flex: 1, fontSize: 14, color: '#111827' },

  sortRow:         { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  sortBtn:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb' },
  sortBtnActive:   { backgroundColor: PRIMARY, borderColor: PRIMARY },
  sortText:        { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  sortTextActive:  { color: '#fff' },

  convCard:        { flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  convAvatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', position: 'relative' },
  unreadBadge:     { position: 'absolute', top: -2, right: -2, width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  unreadText:      { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  convInfo:        { flex: 1, gap: 4 },
  convTop:         { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  convName:        { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  convTime:        { fontSize: 11, color: '#9ca3af' },
  convBottom:      { gap: 2 },
  convPhone:       { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  convLastMsg:     { fontSize: 12, color: '#6b7280', textAlign: 'right' },

  chatHeader:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14 },
  backBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center' },
  chatHeaderInfo:  { flex: 1 },
  chatHeaderName:  { fontSize: 15, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  chatHeaderPhone: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  chatHeaderBtns:  { flexDirection: 'row', gap: 8 },
  blockBtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center' },
  unblockBtn:      { backgroundColor: 'rgba(74,222,128,0.2)' },

  messagesList:    { padding: 14, paddingBottom: 8, flexGrow: 1 },
  dateDivider:     { alignItems: 'center', marginVertical: 12 },
  dateDividerText: { fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  msgRow:          { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  msgRowAdmin:     { justifyContent: 'flex-end' },
  msgRowUser:      { justifyContent: 'flex-start' },
  adminAvatar:     { width: 28, height: 28, borderRadius: 9, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  bubble:          { maxWidth: 280, borderRadius: 18, padding: 12, gap: 4 },
  bubbleAdmin:     { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
  bubbleUser:      { backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  msgImage:        { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
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
  imageBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center' },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center' },
  sendBtnOff:      { backgroundColor: '#d1d5db' },
});
