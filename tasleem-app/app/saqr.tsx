// /workspaces/tasleem-app/tasleem-app/app/saqr.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

type Message = { role: 'user' | 'saqr'; text: string };

export default function SaqrScreen() {
  const router = useRouter();
  const chatScrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'saqr', text: 'أهلاً وسهلاً! أنا صقر 🦅\nمساعدك الذكي في منصة تسليم.\nأرسل لي كود منتج أو اسمه وأحلله لك فوراً.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages, loading]);

  const sendToSaqr = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const { data } = await api.post('/api/saqr/analyze', { identifier: text });
      const reply = data?.analysis || data?.message || data?.text || JSON.stringify(data);
      if (reply) {
        setMessages(prev => [...prev, { role: 'saqr', text: reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'saqr', text: 'عذراً، لم أتمكن من تحليل المنتج. حاول مرة أخرى.' }]);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'صار عندي خلل فني بسيط، حاول مرة ثانية عيوني.';
      setMessages(prev => [...prev, { role: 'saqr', text: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'مسح المحادثة',
      'هل أنت متأكد من مسح جميع الرسائل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'مسح', 
          style: 'destructive',
          onPress: () => {
            setMessages([
              { role: 'saqr', text: 'مرحباً بك مجدداً! 🦅\nأنا صقر جاهز لمساعدتك. أرسل لي أي منتج لتحليله.' }
            ]);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', PRIMARY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerIconBox}>
            <Text style={styles.headerEmoji}>🦅</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>صقر AI</Text>
            <Text style={styles.headerSubtitle}>محلل المنتجات الذكي</Text>
          </View>
        </View>

        <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Chat Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={chatScrollRef}
          style={styles.msgList}
          contentContainerStyle={styles.msgListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            chatScrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((item, index) => (
            <View
              key={index}
              style={[
                styles.msgRow,
                item.role === 'user' ? styles.msgRowUser : styles.msgRowSaqr,
              ]}
            >
              {item.role === 'saqr' && (
                <View style={styles.saqrAvatar}>
                  <Text style={{ fontSize: 18 }}>🦅</Text>
                </View>
              )}
              <View style={[
                styles.msgBubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleSaqr,
              ]}>
                <Text style={[
                  styles.msgText,
                  item.role === 'user' ? styles.msgTextUser : styles.msgTextSaqr,
                ]}>{item.text}</Text>
              </View>
            </View>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <View style={styles.typingRow}>
              <View style={styles.saqrAvatar}>
                <Text style={{ fontSize: 18 }}>🦅</Text>
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.typingText}>صقر يحلل...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={sendToSaqr}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
          <TextInput
            style={styles.inputBox}
            placeholder="أرسل كود منتج أو اسمه..."
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendToSaqr}
            returnKeyType="send"
            textAlign="right"
            multiline={false}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chatContainer: { flex: 1 },
  msgList: { flex: 1 },
  msgListContent: { padding: 16, gap: 12, flexGrow: 1 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgRowSaqr: { flexDirection: 'row' },

  saqrAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8edf2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: PRIMARY + '40',
  },

  msgBubble: { maxWidth: '78%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: PRIMARY, borderBottomRightRadius: 6 },
  bubbleSaqr: { backgroundColor: '#fff', borderBottomLeftRadius: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextUser: { color: '#fff', textAlign: 'right' },
  msgTextSaqr: { color: '#1f2937', textAlign: 'right' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 0, paddingBottom: 6 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  typingText: { fontSize: 13, color: '#64748b' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
    backgroundColor: '#fff',
  },
  inputBox: {
    flex: 1,
    height: 44,
    backgroundColor: '#f2f6f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtnDisabled: { backgroundColor: '#9ca3af', shadowOpacity: 0 },
});