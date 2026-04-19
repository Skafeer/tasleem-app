import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Clipboard, Alert, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

export default function SaqrScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState(["أعطني بوست أقصر", "كيف أستهدف بغداد؟", "منتجات ترند"]);
  const [messages, setMessages] = useState([{ id: '1', role: 'saqr', text: 'أهلاً بك! أنا صقر 🦅\nأرسل لي كود منتج أو اسمه وأحلله لك بعمق بناءً على مواصفاته.', timestamp: new Date() }]);

  const sendToSaqr = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/saqr/analyze', { identifier: text });
      let reply = data?.analysis || data || '';
      
      // استخراج الأزرار الديناميكية من الرد
      const suggestionsIndex = reply.indexOf('اقتراحات:');
      if (suggestionsIndex !== -1) {
        const suggestionsText = reply.substring(suggestionsIndex).replace('اقتراحات:', '').trim();
        setQuickReplies(suggestionsText.split(',').map((s: string) => s.trim()).slice(0, 3));
        reply = reply.substring(0, suggestionsIndex).trim();
      }
      
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'saqr', text: reply, timestamp: new Date() }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'saqr', text: 'عذراً، حاول مرة ثانية عيوني.', timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.onlineIndicator}><View style={styles.onlineDot} /><Text style={styles.onlineText}>متصل</Text></View>
          <Text style={styles.headerTitle}>صقر AI</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#111827" /></TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>محلل المنتجات الذكي | الزبدة وبس</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.role === 'saqr' ? styles.messageRowSaqr : styles.messageRowUser]}>
              {item.role === 'saqr' && <View style={styles.saqrAvatar}><Text style={styles.saqrEmoji}>🦅</Text></View>}
              <View style={[styles.bubble, item.role === 'saqr' ? styles.bubbleSaqr : styles.bubbleUser]}>
                {item.role === 'saqr' ? (
                  <Markdown style={markdownStyles} onLinkPress={(url: string) => { Linking.openURL(url); return false; }}>{item.text}</Markdown>
                ) : (
                  <Text style={{ color: '#fff', textAlign: 'right' }}>{item.text}</Text>
                )}
              </View>
            </View>
          )}
          ListFooterComponent={
            <View>
              {loading && <ActivityIndicator color={PRIMARY} style={{ margin: 10 }} />}
              {!loading && (
                <View style={styles.quickRepliesContainer}>
                  {quickReplies.map((reply, i) => (
                    <TouchableOpacity key={i} style={styles.quickReplyBtn} onPress={() => sendToSaqr(reply)}>
                      <Text style={styles.quickReplyText}>{reply}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          }
        />
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendToSaqr()} disabled={loading}><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
          <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="أرسل كود منتج أو اسمه..." textAlign="right" multiline />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const markdownStyles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 22, color: '#111827', textAlign: 'right' },
  strong: { fontWeight: 'bold', color: PRIMARY },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSub: { fontSize: 11, color: '#999', textAlign: 'right' },
  backBtn: { padding: 5 },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  onlineText: { fontSize: 12, color: PRIMARY },
  messagesList: { padding: 15 },
  messageRow: { marginBottom: 15, flexDirection: 'row', alignItems: 'flex-end' },
  messageRowSaqr: { justifyContent: 'flex-start' },
  messageRowUser: { justifyContent: 'flex-end' },
  saqrAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  saqrEmoji: { fontSize: 16 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 15 },
  bubbleSaqr: { backgroundColor: '#fff', borderBottomLeftRadius: 2 },
  bubbleUser: { backgroundColor: PRIMARY, borderBottomRightRadius: 2 },
  quickRepliesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', padding: 10 },
  quickReplyBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: PRIMARY, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, margin: 4 },
  quickReplyText: { color: PRIMARY, fontSize: 12 },
  inputRow: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100 },
  sendBtn: { backgroundColor: PRIMARY, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
});
