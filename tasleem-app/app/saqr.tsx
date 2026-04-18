// /workspaces/tasleem-app/tasleem-app/app/saqr.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  Clipboard, Alert, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const formatTime = (date?: string) => {
  if (!date) return '';
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

// Skeleton Component
function SkeletonMessage() {
  const animatedValue = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity: animatedValue }}>
      <View style={s.skeletonRow}>
        <View style={s.skeletonAvatar} />
        <View style={s.skeletonBubble}>
          <View style={s.skeletonLine} />
          <View style={[s.skeletonLine, { width: '60%' }]} />
        </View>
      </View>
    </Animated.View>
  );
}

type Message = { 
  id?: string;
  role: 'user' | 'saqr'; 
  text: string;
  timestamp?: Date;
};

export default function SaqrScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1',
      role: 'saqr', 
      text: 'أهلاً وسهلاً! أنا صقر 🦅\nمساعدك الذكي في منصة تسليم.\nأرسل لي كود منتج أو اسمه وأحلله لك فوراً.',
      timestamp: new Date()
    },
  ]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  const sendToSaqr = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/saqr/analyze', { identifier: text });
      
      let reply = '';
      if (typeof data === 'string') {
        reply = data;
      } else if (data?.analysis) {
        reply = data.analysis;
      } else if (data?.message) {
        reply = data.message;
      } else if (data?.text) {
        reply = data.text;
      } else if (data?.reply) {
        reply = data.reply;
      } else {
        reply = JSON.stringify(data, null, 2);
      }
      
      const saqrMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'saqr',
        text: reply || 'عذراً، لم أتمكن من تحليل المنتج. حاول مرة أخرى.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, saqrMessage]);
    } catch (err: any) {
      let errMsg = 'صار عندي خلل فني بسيط، حاول مرة ثانية عيوني.';
      
      if (err?.response?.status === 401) {
        errMsg = 'يبدو أن جلسة الدخول انتهت. الرجاء تسجيل الدخول مرة أخرى.';
      } else if (err?.response?.status === 404) {
        errMsg = 'عفواً، خدمة صقر غير متاحة حالياً. الرجاء المحاولة لاحقاً.';
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'saqr',
        text: errMsg,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('', '✅ تم نسخ الرد بنجاح');
  };

  const handleClearChat = () => {
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
              { 
                id: Date.now().toString(),
                role: 'saqr', 
                text: 'مرحباً بك مجدداً! 🦅\nأنا صقر جاهز لمساعدتك. أرسل لي أي منتج لتحليله.',
                timestamp: new Date()
              }
            ]);
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - just scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header موحد مع صفحة الدعم ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <View style={s.onlineIndicator}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>متصل</Text>
          </View>
          <Text style={s.headerTitle}>صقر AI</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
        <Text style={s.headerSub}>محلل المنتجات الذكي | رد خلال ثوان</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id || String(Date.now())}
          contentContainerStyle={s.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Text style={s.emptyEmoji}>🦅</Text>
              </View>
              <Text style={s.emptyTitle}>مرحباً بك في صقر</Text>
              <Text style={s.emptyText}>أرسل كود منتج أو اسمه وسأقوم بتحليله لك</Text>
            </View>
          }
          renderItem={({ item, index }: { item: Message; index: number }) => {
            const isSaqr = item.role === 'saqr';
            const prevItem = messages[index - 1];
            
            // Check if we should show time divider (different hour)
            const showTime = prevItem && prevItem.timestamp && item.timestamp && 
              Math.abs(item.timestamp.getTime() - prevItem.timestamp.getTime()) > 3600000;
            
            return (
              <>
                {/* Time divider */}
                {showTime && item.timestamp && (
                  <View style={s.timeDivider}>
                    <Text style={s.timeDividerText}>
                      {item.timestamp.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                )}
                
                {/* Message Row - RTL: user right, saqr left */}
                <View style={[s.messageRow, isSaqr ? s.messageRowSaqr : s.messageRowUser]}>
                  {isSaqr && (
                    <View style={s.saqrAvatar}>
                      <Text style={s.saqrEmoji}>🦅</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={[s.bubbleContainer, isSaqr ? s.bubbleContainerSaqr : s.bubbleContainerUser]}
                    onLongPress={() => isSaqr && handleCopyMessage(item.text)}
                    activeOpacity={0.8}
                    disabled={!isSaqr}
                  >
                    <View style={[s.bubble, isSaqr ? s.bubbleSaqr : s.bubbleUser]}>
                      <Text style={[s.bubbleText, isSaqr ? s.bubbleTextSaqr : s.bubbleTextUser]}>
                        {item.text}
                      </Text>
                      {item.timestamp && (
                        <View style={s.bubbleFooter}>
                          <Text style={[s.bubbleTime, isSaqr ? s.bubbleTimeSaqr : s.bubbleTimeUser]}>
                            {formatTime(item.timestamp.toISOString())}
                          </Text>
                          {isSaqr && (
                            <View style={s.copyIndicator}>
                              <Ionicons name="copy-outline" size={10} color="#9ca3af" />
                              <Text style={s.copyText}>اضغط مطولاً للنسخ</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={s.typingRow}>
                <View style={s.saqrAvatar}>
                  <Text style={s.saqrEmoji}>🦅</Text>
                </View>
                <View style={s.typingBubble}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={s.typingText}>صقر يحلل...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Row - مثل صفحة الدعم */}
        <View style={s.inputRow}>
          <TouchableOpacity 
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
            onPress={sendToSaqr}
            disabled={!input.trim() || loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
          
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="أرسل كود منتج أو اسمه..."
            placeholderTextColor="#9ca3af"
            textAlign="right"
            multiline
            maxLength={500}
            onSubmitEditing={sendToSaqr}
          />
          
          <TouchableOpacity 
            style={s.clearBtn} 
            onPress={handleClearChat}
            disabled={loading}>
            <Ionicons name="trash-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header موحد مع صفحة الدعم ──
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSub: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PRIMARY + '12',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  onlineText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '600',
  },

  // ── Skeleton ──
  skeletonContainer: {
    padding: 16,
    gap: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8edf2',
  },
  skeletonBubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#e8edf2',
    borderRadius: 6,
    width: '80%',
  },

  // ── قائمة الرسائل ──
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // ── Empty State ──
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // ── فاصل الوقت ──
  timeDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timeDividerText: {
    fontSize: 11,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },

  // ── رسائل المحادثة (RTL صحيح) ──
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  // رسائل صقر (تظهر في اليسار)
  messageRowSaqr: {
    justifyContent: 'flex-start',
  },
  // رسائل المستخدم (تظهر في اليمين)
  messageRowUser: {
    justifyContent: 'flex-end',
  },

  saqrAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  saqrEmoji: {
    fontSize: 18,
  },

  bubbleContainer: {
    maxWidth: '75%',
  },
  bubbleContainerSaqr: {
    alignItems: 'flex-start',
  },
  bubbleContainerUser: {
    alignItems: 'flex-end',
  },

  bubble: {
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  bubbleSaqr: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8edf2',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },

  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  bubbleTextSaqr: {
    color: '#111827',
    textAlign: 'right',
  },
  bubbleTextUser: {
    color: '#fff',
    textAlign: 'right',
  },

  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },

  bubbleTime: {
    fontSize: 10,
  },
  bubbleTimeSaqr: {
    color: '#9ca3af',
    textAlign: 'left',
  },
  bubbleTimeUser: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },

  copyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 9,
    color: '#9ca3af',
  },

  // ── مؤشر الكتابة ──
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  typingText: {
    fontSize: 12,
    color: '#64748b',
  },

  // ── شريط الإدخال (مطابق لصفحة الدعم) ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    textAlign: 'right',
  },
  clearBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  sendBtnOff: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
  },
});