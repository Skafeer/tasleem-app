import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  Clipboard, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';

const formatTime = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
};

export default function SupportScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['support-messages'],
    queryFn: async () => { const { data } = await api.get('/api/support/messages'); return data; },
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ msg, imageUrl }: { msg: string; imageUrl?: string }) => {
      await api.post('/api/support/messages', { message: msg, imageUrl });
    },
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['support-messages'] });
    },
    onError: (e: any) => {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل إرسال الرسالة');
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ msg: message.trim() });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('تنبيه', 'يرجى السماح بالوصول إلى الصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    setUploadingImage(true);
    try {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const { data } = await api.post('/api/support/upload-image', { imageBase64: base64 });
      sendMutation.mutate({ msg: '', imageUrl: data.url });
    } catch { Alert.alert('خطأ', 'فشل رفع الصورة'); }
    finally { setUploadingImage(false); }
  };

  const handleLongPress = (msg: string) => {
    Clipboard.setString(msg);
    Alert.alert('', 'تم نسخ الرسالة');
  };

  useEffect(() => {
    if ((messages as any[]).length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages]);

  const msgList = messages as any[];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <LinearGradient colors={['#0c6679', '#0a8a9f']} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>الدعم الفني</Text>
          <Text style={s.headerSub}>نرد خلال ساعات العمل</Text>
        </View>
        <View style={s.onlineIndicator}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>متاح</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={msgList}
            keyExtractor={(item: any) => String(item.id)}
            contentContainerStyle={s.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#9ca3af" />
                </View>
                <Text style={s.emptyTitle}>ابدأ المحادثة</Text>
                <Text style={s.emptyText}>أرسل رسالتك وسيرد عليك فريق الدعم</Text>
              </View>
            }
            renderItem={({ item, index }: any) => {
              const isAdmin = item.from_admin;
              const prevItem = msgList[index - 1];
              const showDate = !prevItem || formatDate(item.created_at) !== formatDate(prevItem.created_at);
              return (
                <>
                  {showDate && (
                    <View style={s.dateDivider}>
                      <Text style={s.dateDividerText}>{formatDate(item.created_at)}</Text>
                    </View>
                  )}
                  <View style={[s.msgRow, isAdmin ? s.msgRowAdmin : s.msgRowUser]}>
                    {isAdmin && (
                      <View style={s.adminAvatar}>
                        <Ionicons name="shield-checkmark" size={14} color="#fff" />
                      </View>
                    )}
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
        )}

        <View style={s.inputRow}>
          <TouchableOpacity
            style={[s.sendBtn, (!message.trim() || sendMutation.isPending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!message.trim() || sendMutation.isPending}>
            {sendMutation.isPending
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
            value={message}
            onChangeText={setMessage}
            placeholder="اكتب رسالتك..."
            placeholderTextColor="#9ca3af"
            textAlign="right"
            multiline
            maxLength={500}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc' },
  header:          { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, paddingTop: 14, gap: 10 },
  backBtn:         { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center' },
  headerInfo:      { flex: 1 },
  headerTitle:     { fontSize: 16, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  headerSub:       { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginTop: 2 },
  onlineIndicator: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  onlineDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  onlineText:      { fontSize: 11, color: '#4ade80', fontWeight: '600' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList:    { padding: 14, paddingBottom: 8, flexGrow: 1 },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyIconBox:    { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center' },
  emptyTitle:      { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  emptyText:       { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  dateDivider:     { alignItems: 'center', marginVertical: 12 },
  dateDividerText: { fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  msgRow:          { marginBottom: 8, alignItems: 'flex-end' },
  msgRowAdmin:     { alignItems: 'flex-end' },
  msgRowUser:      { alignItems: 'flex-start' },
  adminAvatar:     { width: 28, height: 28, borderRadius: 9, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  bubble:          { maxWidth: 280, borderRadius: 18, padding: 12, gap: 4 },
  bubbleAdmin:     { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
  bubbleUser:      { backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  msgImage:        { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  bubbleText:      { fontSize: 14, lineHeight: 20, flexWrap: 'wrap' },
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
    justifyContent: 'center', alignItems: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  sendBtnOff:      { backgroundColor: '#d1d5db', shadowOpacity: 0 },
});
