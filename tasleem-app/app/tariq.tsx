import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  Clipboard, Alert, RefreshControl, Linking, Keyboard,
  KeyboardEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import api from '../src/lib/api';

const PRIMARY     = '#0c6679';
const PRIMARY2    = '#0e7d96';
const BG          = '#f0f4f8';
const STORAGE_KEY = 'tariq_messages_v2';
const HISTORY_KEY = 'tariq_chat_history_v2';

const formatTime = (date?: Date | string) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

type Message = {
  id: string;
  role: 'user' | 'tariq';
  text: string;
  timestamp: string;
};

type GeminiMessage = {
  role: 'user' | 'model';
  parts: [{ text: string }];
};

const extractProductId = (text: string): number | null => {
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/(?:id|ايدي|آيدي|منتج|product)\s*#?\s*(\d+)/i);
  if (match) return Number(match[1]);
  return null;
};

const extractAd = (text: string): string | null => {
  const markers = ['البوست الإعلاني 📱', 'البوست الإعلاني', '📱 البوست الإعلاني'];
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) return text.substring(idx + marker.length).trim();
  }
  return null;
};

const WELCOME: Message = {
  id: 'welcome',
  role: 'tariq',
  text: 'هلا وغلا! 🤝 أنا طارق، مساعدك الشخصي في تسليم.\n\nأقدر أساعدك بـ:\n- تحليل مبيعاتك وأرباحك\n- اقتراح منتجات تناسبك\n- تحليل منتج بالاسم أو الـ ID\n- كتابة بوستات إعلانية\n- نصايح البيع والتسويق\n\nگول شنو تريد 😄',
  timestamp: new Date().toISOString(),
};

const QUICK_REPLIES = ['شلون مبيعاتي؟', 'اقترح علي منتج', 'شنو رصيدي؟', 'اكتب بوست إعلاني'];

export default function TariqScreen() {
  const router      = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const inputRef    = useRef<TextInput>(null);

  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [messages, setMessages]           = useState<Message[]>([WELCOME]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiMessage[]>([]);
  const [keyboardH, setKeyboardH]         = useState(0);

  // مستمع الكيبورد للأندرويد
  useEffect(() => {
    if (Platform.OS === 'android') {
      const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
        setKeyboardH(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      });
      const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardH(0));
      return () => { show.remove(); hide.remove(); };
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [savedMsgs, savedHistory] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
        ]);
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
        }
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed)) setGeminiHistory(parsed);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  useEffect(() => {
    if (geminiHistory.length > 0) {
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(geminiHistory)).catch(() => {});
    }
  }, [geminiHistory]);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = { ...msg, id: Date.now().toString() + Math.random(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  const sendToTariq = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    addMessage({ role: 'user', text });
    setInput('');
    setLoading(true);

    const productId = extractProductId(text);
    const msgToSend = productId ? `حلل لي المنتج رقم ${productId} من قاعدة البيانات` : text;

    const newGeminiHistory: GeminiMessage[] = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: msgToSend }] },
    ];

    try {
      const { data } = await api.post('/api/tariq/chat', { messages: newGeminiHistory });
      const reply = data?.reply || 'تم الاستلام.';
      addMessage({ role: 'tariq', text: reply });
      setGeminiHistory([...newGeminiHistory, { role: 'model', parts: [{ text: reply }] }]);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429)      addMessage({ role: 'tariq', text: 'طارق مشغول هسه، انتظر دقيقة وحاول مرة ثانية 😄' });
      else if (status === 400) addMessage({ role: 'tariq', text: 'ما فهمت الطلب، ممكن تعيد بشكل ثاني؟ 🙂' });
      else                     addMessage({ role: 'tariq', text: 'السيرفر مشغول هسه، حاول بعد ثواني 🙏' });
    } finally {
      setLoading(false);
    }
  };

  const copyAll = (text: string) => { Clipboard.setString(text); Alert.alert('', '✅ تم نسخ الرد بالكامل'); };
  const copyAd  = (text: string) => {
    const ad = extractAd(text);
    if (ad) { Clipboard.setString(ad); Alert.alert('', '✅ تم نسخ البوست الإعلاني'); } else copyAll(text);
  };

  const clearChat = () => {
    Alert.alert('مسح المحادثة', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'مسح', style: 'destructive', onPress: async () => {
        const fresh = [{ ...WELCOME, id: Date.now().toString(), timestamp: new Date().toISOString() }];
        setMessages(fresh);
        setGeminiHistory([]);
        await Promise.all([AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)), AsyncStorage.removeItem(HISTORY_KEY)]);
      }},
    ]);
  };

  const UserBubble = ({ item }: { item: Message }) => (
    <View style={s.rowUser}>
      <View style={s.bubbleUser}>
        <Text style={s.textUser}>{item.text}</Text>
        <Text style={s.timeUser}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );

  const TariqBubble = ({ item }: { item: Message }) => {
    const hasAd     = item.text.includes('البوست الإعلاني') || item.text.includes('📱');
    const isWelcome = item.id === 'welcome';
    return (
      <View style={s.rowTariq}>
        <View style={s.avatarWrap}><Text style={s.avatarEmoji}>🤝</Text></View>
        <View style={s.tariqBubbleWrap}>
          <View style={s.bubbleTariq}>
            <Markdown style={md} onLinkPress={(url: string) => { Linking.openURL(url); return false; }}>
              {item.text}
            </Markdown>
            <View style={s.bubbleFooter}>
              <View style={s.actionsRow}>
                {hasAd && (
                  <TouchableOpacity style={s.btnAd} onPress={() => copyAd(item.text)}>
                    <Ionicons name="megaphone-outline" size={11} color="#fff" />
                    <Text style={s.btnAdText}>نسخ الإعلان</Text>
                  </TouchableOpacity>
                )}
                {!isWelcome && (
                  <TouchableOpacity style={s.btnCopy} onPress={() => copyAll(item.text)}>
                    <Ionicons name="copy-outline" size={11} color={PRIMARY} />
                    <Text style={s.btnCopyText}>نسخ</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.timeTariq}>{formatTime(item.timestamp)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerTitleRow}>
            <Text style={s.headerTitle}>طارق AI</Text>
            <Text style={s.headerEmoji}>🤝</Text>
          </View>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineTxt}>متصل الحين</Text>
          </View>
        </View>
        <TouchableOpacity style={s.trashBtn} onPress={clearChat} disabled={loading}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Chat */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={PRIMARY} />}
          renderItem={({ item }) => item.role === 'tariq' ? <TariqBubble item={item} /> : <UserBubble item={item} />}
          ListFooterComponent={
            <View>
              {loading && (
                <View style={s.rowTariq}>
                  <View style={s.avatarWrap}><Text style={s.avatarEmoji}>🤝</Text></View>
                  <View style={s.typingBubble}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                    <Text style={s.typingText}>طارق يفكر...</Text>
                  </View>
                </View>
              )}
              {!loading && messages[messages.length - 1]?.role === 'tariq' && (
                <FlatList
                  horizontal data={QUICK_REPLIES} keyExtractor={(_, i) => String(i)}
                  showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={s.quickBtn} onPress={() => sendToTariq(item)}>
                      <Text style={s.quickText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          }
        />

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="گول شنو تريد..."
            placeholderTextColor="#9ca3af"
            textAlign="right"
            multiline
            maxLength={500}
            onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 350)}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendOff]}
            onPress={() => sendToTariq()}
            disabled={!input.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const md = StyleSheet.create({
  body:        { fontSize: 14, lineHeight: 22, color: '#1e293b', textAlign: 'right' },
  heading1:    { fontSize: 16, fontWeight: 'bold', color: PRIMARY, marginTop: 8, marginBottom: 4, textAlign: 'right' },
  heading2:    { fontSize: 15, fontWeight: '700', color: PRIMARY2, marginTop: 6, marginBottom: 3, textAlign: 'right' },
  strong:      { fontWeight: 'bold', color: '#111827' },
  bullet_list: { textAlign: 'right' },
  list_item:   { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  link:        { color: '#2563eb', textDecorationLine: 'underline' },
  code_inline: { backgroundColor: '#f1f5f9', paddingHorizontal: 4, borderRadius: 4, fontSize: 12 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f9fa',
    borderWidth: 1.5, borderColor: '#d4eef3', justifyContent: 'center', alignItems: 'center',
  },
  headerCenter:   { alignItems: 'center', flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle:    { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerEmoji:    { fontSize: 18 },
  onlineRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  onlineTxt:      { fontSize: 11, color: '#64748b' },
  trashBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef2f2',
    borderWidth: 1.5, borderColor: '#fecaca', justifyContent: 'center', alignItems: 'center',
  },

  list: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12, flexGrow: 1 },

  rowUser:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  bubbleUser: {
    backgroundColor: '#0c6679', borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '80%',
    shadowColor: '#0c6679', shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
  },
  textUser: { fontSize: 14, color: '#fff', textAlign: 'right', lineHeight: 21 },
  timeUser: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'left', marginTop: 5 },

  rowTariq: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 8 },
  avatarWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#0c667918', borderWidth: 1.5, borderColor: '#0c667935',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarEmoji:     { fontSize: 17 },
  tariqBubbleWrap: { flex: 1, maxWidth: '88%' },
  bubbleTariq: {
    backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  actionsRow:   { flexDirection: 'row', gap: 6 },
  timeTariq:    { fontSize: 10, color: '#94a3b8' },

  btnCopy: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#0c667912', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10,
  },
  btnCopyText: { fontSize: 10, color: '#0c6679', fontWeight: '600' },
  btnAd: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f59e0b', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10,
  },
  btnAdText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  typingText: { fontSize: 12, color: '#64748b' },

  quickList: { paddingHorizontal: 2, paddingBottom: 14, paddingTop: 4, gap: 8 },
  quickBtn: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#0c667950',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  quickText: { color: '#0c6679', fontSize: 12, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
  },
  input: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: '#1e293b', maxHeight: 110, borderWidth: 1.5, borderColor: '#e2e8f0',
    textAlign: 'right', lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#0c6679',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0c6679', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  sendOff: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
});
