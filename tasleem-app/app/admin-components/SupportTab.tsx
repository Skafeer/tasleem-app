import { useState, useMemo, useEffect, useRef } from 'react';
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

// مكوّن رسالة واحدة
const ChatBubble = ({ item, nextItem, onLongPress }: any) => {
  const isAdmin = item.from_admin;
  // في inverted، nextItem هو الرسالة الأقدم
  const showDate = !nextItem || formatDate(item.created_at) !== formatDate(nextItem.created_at);

  return (
    <>
      <View style={[s.msgRow, isAdmin ? s.msgRowAdmin : s.msgRowUser]}>
        {!isAdmin && (
          <View style={s.userAvatar}>
            <Ionicons name="person" size={14} color="#fff" />
          </View>
        )}
        <TouchableOpacity
          style={s.bubbleWrap}
          onLongPress={() => item.message && onLongPress(item.message)}
          activeOpacity={0.85}
        >
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
      {showDate && (
        <View style={s.dateDivider}>
          <Text style={s.dateDividerText}>{formatDate(item.created_at)}</Text>
        </View>
      )}
    </>
  );
};

export default function SupportTab() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('recent');
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => { const { data } = await api.get('/api/admin/support'); return data; },
    refetchInterval: 10000,
  });

  const convList = conversations as any[];



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
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-support'] });
      // حدث selectedUser فوراً
      if (selectedUser && selectedUser.userId === vars.userId) {
        setSelectedUser((prev: any) => ({ ...prev, isBlocked: vars.block }));
      }
    },
  });

  // تحديث المحادثة المفتوحة تلقائياً عند وصول رسائل جديدة
  useEffect(() => {
    if (!selectedUser) return;
    const updated = convList.find((c: any) => c.userId === selectedUser.userId);
    if (updated && updated.messages?.length !== selectedUser.messages?.length) {
      setSelectedUser(updated);
    }
  }, [convList]);

  const markAsRead = async (userId: number) => {
    qc.setQueryData(['admin-support'], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((c: any) => c.userId === userId ? { ...c, unread: 0 } : c);
    });
    try { await api.post(`/api/admin/support/${userId}/read`); } catch {}
  };

  const handleSend = () => {
    if (!reply.trim() || !selectedUser) return;
    sendReply.mutate({ userId: selectedUser.userId, message: reply.trim() });
  };

  const selectedUserRef = useRef<any>(null);
  selectedUserRef.current = selectedUser;

  const handlePickImage = async () => {
    const currentUser = selectedUserRef.current;
    if (!currentUser) return;
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
      const base64Data = result.assets[0].base64!;
      const imageBase64 = `data:image/jpeg;base64,${base64Data}`;
      const { data } = await api.post('/api/support/upload-image', { imageBase64 });
      if (data?.url) {
        sendReply.mutate({ userId: currentUser.userId, message: '', imageUrl: data.url });
      } else {
        Alert.alert('خطأ', 'لم يتم الحصول على رابط الصورة');
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLongPress = (msg: string) => {
    Clipboard.setString(msg);
    Alert.alert('', 'تم نسخ الرسالة');
  };

  const confirmBlock = (user: any) => {
    const isBlocked = user.isBlocked;
    Alert.alert(
      isBlocked ? 'فك الحظر' : 'حظر المستخدم',
      isBlocked ? `هل تريد فك حظر ${user.storeName}؟` : `هل تريد حظر ${user.storeName}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: isBlocked ? 'فك الحظر' : 'حظر', style: 'destructive',
          onPress: () => blockMutation.mutate({ userId: user.userId, block: !isBlocked }) },
      ]
    );
  };

  const filtered = useMemo(() => {
    return [...convList]
      .filter(c => !search || c.storeName?.includes(search) || c.phone?.includes(search))
      .sort((a, b) => {
        if (sort === 'unread') return b.unread - a.unread;
        if (sort === 'most') return (b.messages?.length || 0) - (a.messages?.length || 0);
        const getTime = (conv: any) => {
          const msgs = conv.messages || [];
          if (msgs.length > 0) {
            // آخر رسالة في الـ array هي الأحدث
            return new Date(msgs[msgs.length - 1].created_at).getTime();
          }
          return 0;
        };
        return getTime(b) - getTime(a); // الأحدث أولاً
      });
  }, [convList, search, sort]);

  // ── قائمة المحادثات ──
  if (!selectedUser) {
    return (
      <View style={s.container}>
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
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.sortRow}>
          {([['recent', 'الأحدث'], ['unread', 'غير مقروء'], ['most', 'الأكثر']] as [SortType, string][]).map(([key, label]) => (
            <TouchableOpacity key={key} style={[s.sortBtn, sort === key && s.sortBtnActive]} onPress={() => setSort(key as SortType)}>
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
              const msgs = item.messages || [];
              const last = msgs[msgs.length - 1];
              return (
                <TouchableOpacity
                  style={s.convCard}
                  onPress={() => { setSelectedUser(item); if (item.unread > 0) markAsRead(item.userId); }}>
                  <View style={s.convAvatar}>
                    <Text style={s.convAvatarText}>{item.storeName?.charAt(0) || 'ت'}</Text>
                    {item.unread > 0 && (
                      <View style={s.unreadBadge}>
                        <Text style={s.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.convInfo}>
                    <View style={s.convTop}>
                      <Text style={s.convTime}>{last ? formatTime(last.created_at) : ''}</Text>
                      <Text style={s.convName}>{item.storeName}</Text>
                    </View>
                    {last ? (
                      <Text style={[s.convLastMsg, item.unread > 0 && s.convLastMsgBold]} numberOfLines={1}>
                        {last.from_admin ? '↩ ' : ''}{last.image_url ? '📷 صورة' : last.message}
                      </Text>
                    ) : (
                      <Text style={s.convPhone}>{item.phone}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ── نافذة المحادثة — inverted مثل واتساب ──
  // inverted يعكس العرض، فنحتاج الـ data من الأحدث للأقدم
  // الـ messages من الـ API مرتبة من الأقدم للأحدث
  // بعد reverse: الأحدث أول → inverted يعرضها في الأسفل ✓
  const msgs = [...(selectedUser.messages || [])].reverse();

  return (
    <View style={s.container}>
      <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.chatHeader}>
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
          <Ionicons
            name={selectedUser.isBlocked ? 'lock-open-outline' : 'ban-outline'}
            size={16}
            color={selectedUser.isBlocked ? '#4ade80' : '#fca5a5'}
          />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={msgs}
          keyExtractor={(item: any) => String(item.id)}
          inverted
          contentContainerStyle={s.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
              <Text style={s.emptyText}>لا توجد رسائل</Text>
            </View>
          }
          renderItem={({ item, index }: any) => (
            <ChatBubble
              item={item}
              nextItem={msgs[index + 1]}
              onLongPress={handleLongPress}
            />
          )}
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
  container:    { flex: 1, backgroundColor: '#f0f2f5' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:    { fontSize: 15, color: '#9ca3af' },

  searchBox:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 12, marginBottom: 8, backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 14, height: 44,
    borderWidth: 1.5, borderColor: '#e5e7eb' },
  searchInput:  { flex: 1, fontSize: 14, color: '#111827' },

  sortRow:      { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  sortBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb' },
  sortBtnActive:{ backgroundColor: PRIMARY, borderColor: PRIMARY },
  sortText:     { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  sortTextActive:{ color: '#fff' },

  convCard:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  convAvatar:     { width: 50, height: 50, borderRadius: 25, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', position: 'relative' },
  convAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  unreadBadge:    { position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20,
    borderRadius: 10, backgroundColor: '#ef4444', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  unreadText:     { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  convInfo:       { flex: 1, gap: 3 },
  convTop:        { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  convName:       { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  convTime:       { fontSize: 11, color: '#9ca3af' },
  convPhone:      { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  convLastMsg:    { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  convLastMsgBold:{ color: '#111827', fontWeight: '600' },

  chatHeader:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12 },
  backBtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center' },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 15, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  chatHeaderPhone:{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  blockBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center' },
  unblockBtn:     { backgroundColor: 'rgba(74,222,128,0.2)' },

  messagesList:   { paddingHorizontal: 12, paddingVertical: 8 },
  emptyChat:      { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12,
    transform: [{ scaleY: -1 }] },

  msgRow:         { flexDirection: 'row', marginBottom: 3, alignItems: 'flex-end', gap: 6 },
  msgRowAdmin:    { justifyContent: 'flex-start' },
  msgRowUser:     { justifyContent: 'flex-end' },

  userAvatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#9ca3af',
    justifyContent: 'center', alignItems: 'center', marginBottom: 2 },

  bubbleWrap:     { maxWidth: '78%' },
  bubble:         { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  bubbleAdmin:    { backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleUser:     { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },

  msgImage:       { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  bubbleText:     { fontSize: 15, lineHeight: 22 },
  bubbleTextAdmin:{ color: '#111827', textAlign: 'left' },
  bubbleTextUser: { color: '#fff', textAlign: 'right' },
  bubbleTime:     { fontSize: 10 },
  bubbleTimeAdmin:{ color: '#9ca3af', textAlign: 'left' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

  dateDivider:    { alignItems: 'center', marginVertical: 10 },
  dateDividerText:{ fontSize: 11, color: '#6b7280', backgroundColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },

  inputRow:       { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  input:          { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: '#111827', maxHeight: 100 } as any,
  imageBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center' },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  sendBtnOff:     { backgroundColor: '#d1d5db', shadowOpacity: 0 },
});
