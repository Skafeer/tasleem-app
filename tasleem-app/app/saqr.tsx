// /workspaces/tasleem-app/tasleem-app/app/saqr.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  Clipboard, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const formatTime = (date?: Date) => {
  if (!date) return '';
  return date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

type Message = { 
  id: string;
  role: 'user' | 'saqr'; 
  text: string;
  timestamp: Date;
};

// معالجة أخطاء API بشكل احترافي
const handleApiError = (err: any): string => {
  const errorMsg = err?.message || err?.response?.data?.message || '';
  
  if (errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('Service Unavailable')) {
    return '🦅 عذراً، صقر يستقبل طلبات كثيرة الآن!\n⏳ انتظر 30 ثانية ثم حاول مرة أخرى.\nشكراً لصبرك ❤️';
  }
  
  if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
    return '🦅 لقد تجاوزت عدد المحاولات المسموح بها.\n⏱️ انتظر دقيقة ثم حاول مجدداً.';
  }
  
  if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
    return '🦅 يبدو أن جلسة الدخول انتهت.\n🔄 الرجاء تسجيل الدخول مرة أخرى.';
  }
  
  if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
    return '🦅 عفواً، خدمة صقر غير متاحة حالياً.\n🔄 الرجاء المحاولة لاحقاً.';
  }
  
  return '🦅 عذراً، حدث خطأ تقني.\n🔄 الرجاء المحاولة مرة أخرى بعد قليل.';
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

  // التمرير للأسفل عند إضافة رسائل جديدة
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  // نسخ الرد
  const handleCopyMessage = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('', '✅ تم نسخ الرد بنجاح');
  };

  // إرسال الطلب إلى صقر
  const sendToSaqr = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // إضافة رسالة المستخدم
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
      } else if (data?.response) {
        reply = data.response;
      } else {
        reply = '✅ تم استلام طلبك بنجاح.\nسأقوم بتحليل المنتج لك حالياً.';
      }
      
      const saqrMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'saqr',
        text: reply,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, saqrMessage]);
    } catch (err: any) {
      console.log('Saqr error:', err);
      
      const errorMessageText = handleApiError(err);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'saqr',
        text: errorMessageText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // مسح المحادثة
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

  // تحديث الصفحة (سحب للأسفل)
  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header - نفس تصميم صفحة الدعم */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>متصل</Text>
          </View>
          <Text style={styles.headerTitle}>صقر AI</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>محلل المنتجات الذكي | رد خلال ثوان</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* قائمة الرسائل */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          renderItem={({ item }) => {
            const isSaqr = item.role === 'saqr';
            
            return (
              <View style={[styles.messageRow, isSaqr ? styles.messageRowSaqr : styles.messageRowUser]}>
                {isSaqr && (
                  <View style={styles.saqrAvatar}>
                    <Text style={styles.saqrEmoji}>🦅</Text>
                  </View>
                )}
                
                <View style={[styles.bubbleContainer, isSaqr ? styles.bubbleContainerSaqr : styles.bubbleContainerUser]}>
                  <View style={[styles.bubble, isSaqr ? styles.bubbleSaqr : styles.bubbleUser]}>
                    <Text style={[styles.bubbleText, isSaqr ? styles.bubbleTextSaqr : styles.bubbleTextUser]}>
                      {item.text}
                    </Text>
                    
                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.bubbleTime, isSaqr ? styles.bubbleTimeSaqr : styles.bubbleTimeUser]}>
                        {formatTime(item.timestamp)}
                      </Text>
                      
                      {/* أيقونة النسخ - تظهر فقط لرسائل صقر */}
                      {isSaqr && (
                        <TouchableOpacity 
                          onPress={() => handleCopyMessage(item.text)}
                          style={styles.copyButton}
                          activeOpacity={0.7}>
                          <Ionicons name="copy-outline" size={14} color={PRIMARY} />
                          <Text style={styles.copyButtonText}>نسخ</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingRow}>
                <View style={styles.saqrAvatar}>
                  <Text style={styles.saqrEmoji}>🦅</Text>
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.typingText}>صقر يحلل...</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyEmoji}>🦅</Text>
              </View>
              <Text style={styles.emptyTitle}>مرحباً بك في صقر</Text>
              <Text style={styles.emptyText}>أرسل كود منتج أو اسمه وسأقوم بتحليله لك</Text>
            </View>
          }
        />

        {/* شريط الإدخال - نفس تصميم صفحة الدعم */}
        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnOff]}
            onPress={sendToSaqr}
            disabled={!input.trim() || loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
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
            style={styles.clearBtn} 
            onPress={handleClearChat}
            disabled={loading}>
            <Ionicons name="trash-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
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

  // ── رسائل المحادثة ──
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageRowSaqr: {
    justifyContent: 'flex-start',
  },
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
    maxWidth: '78%',
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
    marginTop: 8,
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

  // زر النسخ الجديد
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIMARY + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  copyButtonText: {
    fontSize: 10,
    color: PRIMARY,
    fontWeight: '500',
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

  // ── شريط الإدخال ──
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