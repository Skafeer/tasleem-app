import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  Clipboard, Alert, RefreshControl, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import api from '../src/lib/api';

const PRIMARY    = '#0c6679';
const BG         = '#f2f6f9';
const STORAGE_KEY = 'saqr_messages';

const formatTime = (date?: Date | string) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

type Message = {
  id: string;
  role: 'user' | 'saqr';
  text: string;
  timestamp: string;
};

// ── استخراج البوست الإعلاني من الرد ──
const extractAd = (text: string): string | null => {
  const markers = ['البوست الإعلاني 📱', 'البوست الإعلاني', '📱 البوست الإعلاني'];
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      return text.substring(idx + marker.length).trim();
    }
  }
  return null;
};

const WELCOME: Message = {
  id: '1',
  role: 'saqr',
  text: 'أهلاً وسهلاً! أنا صقر 🦅\nمساعدك الذكي في منصة تسليم.\n\nأرسل لي كود منتج أو اسمه وأحلله لك:\n- تحليل الربح والجدوى\n- اقتراح السعر الأمثل\n- تحليل المنتج والوصف\n- بوست إعلاني جاهز للنسخ\n- أفضل محافظات للاستهداف',
  timestamp: new Date().toISOString(),
};

const QUICK_REPLIES = [
  'أعطني بوست أقصر',
  'كيف أستهدف بغداد؟',
  'شنو أفضل وقت للنشر؟',
];

export default function SaqrScreen() {
  const router      = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages]   = useState<Message[]>([WELCOME]);

  // ── تحميل المحادثة المحفوظة ──
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {}
    })();
  }, []);

  // ── حفظ المحادثة عند كل تغيير ──
  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = {
      ...msg,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  const sendToSaqr = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    addMessage({ role: 'user', text });
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/saqr/analyze', { identifier: text });
      const reply = data?.analysis || data?.message || data || 'تم الاستلام.';
      addMessage({ role: 'saqr', text: reply });
    } catch {
      addMessage({ role: 'saqr', text: '🦅 عذراً، صار عندي خلل فني. حاول مرة ثانية عيوني.' });
    } finally {
      setLoading(false);
    }
  };

  const copyAll = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('', '✅ تم نسخ التحليل بالكامل');
  };

  const copyAd = (text: string) => {
    const ad = extractAd(text);
    if (ad) {
      Clipboard.setString(ad);
      Alert.alert('', '✅ تم نسخ البوست الإعلاني');
    } else {
      copyAll(text);
    }
  };

  const clearChat = () => {
    Alert.alert('مسح المحادثة', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'مسح', style: 'destructive',
        onPress: async () => {
          const fresh = [{ ...WELCOME, id: Date.now().toString(), timestamp: new Date().toISOString() }];
          setMessages(fresh);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); setRefreshing(false); }, 800);
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.onlineChip}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>متصل</Text>
          </View>
          <Text style={s.headerTitle}>صقر AI 🦅</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
        <Text style={s.headerSub}>محلل المنتجات الذكي — الزبدة وبس</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          renderItem={({ item }) => {
            const isSaqr  = item.role === 'saqr';
            const hasAd   = isSaqr && (item.text.includes('البوست الإعلاني') || item.text.includes('📱'));
            return (
              <View style={[s.msgRow, isSaqr ? s.rowSaqr : s.rowUser]}>
                {isSaqr && (
                  <View style={s.avatar}>
                    <Text style={s.avatarEmoji}>🦅</Text>
                  </View>
                )}
                <View style={[s.bubbleWrap, isSaqr ? s.wrapSaqr : s.wrapUser]}>
                  <View style={[s.bubble, isSaqr ? s.bubbleSaqr : s.bubbleUser]}>
                    {isSaqr ? (
                      <Markdown
                        style={md}
                        onLinkPress={(url: string) => { Linking.openURL(url); return false; }}>
                        {item.text}
                      </Markdown>
                    ) : (
                      <Text style={s.textUser}>{item.text}</Text>
                    )}

                    {/* Footer */}
                    <View style={s.footer}>
                      <Text style={[s.time, isSaqr ? s.timeSaqr : s.timeUser]}>
                        {formatTime(item.timestamp)}
                      </Text>
                      {isSaqr && item.id !== '1' && (
                        <View style={s.actions}>
                          {hasAd && (
                            <TouchableOpacity style={s.btnAd} onPress={() => copyAd(item.text)}>
                              <Ionicons name="megaphone-outline" size={11} color="#fff" />
                              <Text style={s.btnAdText}>نسخ الإعلان</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={s.btnCopy} onPress={() => copyAll(item.text)}>
                            <Ionicons name="copy-outline" size={11} color={PRIMARY} />
                            <Text style={s.btnCopyText}>نسخ الكل</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View>
              {loading && (
                <View style={s.typingRow}>
                  <View style={s.avatar}><Text style={s.avatarEmoji}>🦅</Text></View>
                  <View style={s.typingBubble}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                    <Text style={s.typingText}>صقر يحلل...</Text>
                  </View>
                </View>
              )}
              {/* Quick replies — تظهر بعد آخر رد من صقر */}
              {!loading && messages.length > 1 && messages[messages.length - 1].role === 'saqr' && (
                <FlatList
                  horizontal
                  data={QUICK_REPLIES}
                  keyExtractor={(_, i) => String(i)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.quickList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={s.quickBtn} onPress={() => sendToSaqr(item)}>
                      <Text style={s.quickText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          }
        />

        {/* ── Input ── */}
        <View style={s.inputRow}>
          <TouchableOpacity style={s.trashBtn} onPress={clearChat} disabled={loading}>
            <Ionicons name="trash-outline" size={18} color={PRIMARY} />
          </TouchableOpacity>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="أرسل كود منتج أو اسمه..."
            placeholderTextColor="#9ca3af"
            textAlign="right"
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendOff]}
            onPress={() => sendToSaqr()}
            disabled={!input.trim() || loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const md = StyleSheet.create({
  body:     { fontSize: 14, lineHeight: 22, color: '#111827', textAlign: 'right' },
  heading1: { fontSize: 16, fontWeight: 'bold', color: PRIMARY, marginTop: 8, marginBottom: 4, textAlign: 'right' },
  heading2: { fontSize: 15, fontWeight: 'bold', color: PRIMARY, marginTop: 6, marginBottom: 3, textAlign: 'right' },
  strong:   { fontWeight: 'bold', color: '#111827' },
  bullet_list: { textAlign: 'right' },
  list_item:   { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  link:     { color: '#2563eb', textDecorationLine: 'underline' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf2', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  backBtn:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f9fa', borderWidth: 1.5, borderColor: '#d4eef3', justifyContent: 'center', alignItems: 'center' },
  onlineChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PRIMARY + '12', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  onlineDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  onlineText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  msgRow:  { marginBottom: 14, flexDirection: 'row', alignItems: 'flex-end' },
  rowSaqr: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },

  avatar:      { width: 32, height: 32, borderRadius: 16, backgroundColor: PRIMARY + '15', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: PRIMARY + '30', flexShrink: 0 },
  avatarEmoji: { fontSize: 17 },

  bubbleWrap: { maxWidth: '85%' },
  wrapSaqr:   { alignItems: 'flex-start' },
  wrapUser:   { alignItems: 'flex-end' },

  bubble:     { borderRadius: 18, padding: 12 },
  bubbleSaqr: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8edf2', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },

  textUser: { fontSize: 14, color: '#fff', textAlign: 'right', lineHeight: 20 },

  footer:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 6 },
  time:     { fontSize: 10 },
  timeSaqr: { color: '#9ca3af' },
  timeUser: { color: 'rgba(255,255,255,0.65)' },

  actions:  { flexDirection: 'row', gap: 6 },
  btnCopy:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: PRIMARY + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  btnCopyText: { fontSize: 10, color: PRIMARY, fontWeight: '600' },
  btnAd:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f5a006', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  btnAdText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  typingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e8edf2' },
  typingText:   { fontSize: 12, color: '#64748b' },

  quickList: { paddingHorizontal: 2, paddingBottom: 12, gap: 8 },
  quickBtn:  { backgroundColor: '#fff', borderWidth: 1, borderColor: PRIMARY + '40', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  quickText: { color: PRIMARY, fontSize: 12, fontWeight: '500' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8edf2' },
  input:    { flex: 1, backgroundColor: '#f8fafc', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100, borderWidth: 1.5, borderColor: '#e8edf2', textAlign: 'right' },
  trashBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: PRIMARY + '10', justifyContent: 'center', alignItems: 'center' },
  sendBtn:  { width: 42, height: 42, borderRadius: 21, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  sendOff:  { backgroundColor: '#d1d5db', shadowOpacity: 0 },
});
