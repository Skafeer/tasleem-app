import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  Clipboard, Alert, Image, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const formatTime = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
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

export default function SupportScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['support-messages'],
    queryFn: async () => { 
      const { data } = await api.get('/api/support/messages'); 
      return data; 
    },
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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate({ msg: message.trim() });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { 
      Alert.alert('تنبيه', 'يرجى السماح بالوصول إلى الصور'); 
      return; 
    }
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
      sendMutation.mutate({ msg: '', imageUrl: data.url });
    } catch { 
      Alert.alert('خطأ', 'فشل رفع الصورة'); 
    } finally { 
      setUploadingImage(false); 
    }
  };

  const handleLongPress = (msg: string) => {
    Clipboard.setString(msg);
    Alert.alert('', 'تم نسخ الرسالة');
  };

  // التمرير إلى الأسفل عند إضافة رسائل جديدة
  useEffect(() => {
    if ((messages as any[]).length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages]);

  const msgList = messages as any[];

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header موحد RTL (زر رجوع يمين، عنوان وسط، حالة يسار) ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <View style={s.onlineIndicator}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>متاح</Text>
          </View>
          <Text style={s.headerTitle}>الدعم الفني</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
        <Text style={s.headerSub}>نرد خلال ساعات العمل</Text>
      </View>

      {/* ✅ تحسين KeyboardAvoidingView ليرتفع المحتوى مع الكيبورد */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        
        {/* Skeleton Loading */}
        {isLoading && msgList.length === 0 ? (
          <View style={s.skeletonContainer}>
            {[1, 2, 3].map((_, i) => <SkeletonMessage key={i} />)}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={msgList}
            keyExtractor={(item: any) => String(item.id)}
            // ✅ جعل القائمة تملأ المساحة، وعندما تكون فارغة نوسّط العنصر الفارغ
            contentContainerStyle={[
              s.messagesList, 
              msgList.length === 0 && s.emptyListContainer
            ]}
            showsVerticalScrollIndicator={false}
            // ✅ إغلاق الكيبورد عند النقر على أي مكان في القائمة
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <Ionicons name="chatbubbles-outline" size={42} color="#9ca3af" />
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
                  
                  {/* RTL صحيح: رسائل المستخدم في اليمين، رسائل الأدمن في اليسار */}
                  <View style={[s.messageRow, isAdmin ? s.messageRowAdmin : s.messageRowUser]}>
                    {isAdmin && (
                      <View style={s.adminAvatar}>
                        <Ionicons name="shield-checkmark" size={14} color="#fff" />
                      </View>
                    )}
                    
                    <TouchableOpacity 
                      style={[s.bubbleContainer, isAdmin ? s.bubbleContainerAdmin : s.bubbleContainerUser]}
                      onLongPress={() => item.message && handleLongPress(item.message)} 
                      activeOpacity={0.8}>
                      <View style={[s.bubble, isAdmin ? s.bubbleAdmin : s.bubbleUser]}>
                        {item.image_url && (
                          <Image source={{ uri: item.image_url }} style={s.messageImage} resizeMode="cover" />
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

        {/* شريط الإدخال - RTL صحيح: زر صورة ← حقل ← زر إرسال */}
        <View style={s.inputRow}>
          <TouchableOpacity 
            style={[s.sendBtn, (!message.trim() || sendMutation.isPending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!message.trim() || sendMutation.isPending}>
            {sendMutation.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" />}
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
          
          <TouchableOpacity 
            style={s.imageBtn} 
            onPress={handlePickImage} 
            disabled={uploadingImage}>
            {uploadingImage
              ? <ActivityIndicator color={PRIMARY} size="small" />
              : <Ionicons name="image-outline" size={22} color={PRIMARY} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header موحد RTL ──
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
  // ✅ عند عدم وجود رسائل، نوسّط العنصر الفارغ
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Empty State ──
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
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

  // ── فاصل التاريخ ──
  dateDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateDividerText: {
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
  // رسائل الأدمن (تظهر في اليسار)
  messageRowAdmin: {
    justifyContent: 'flex-start',
  },
  // رسائل المستخدم (تظهر في اليمين)
  messageRowUser: {
    justifyContent: 'flex-end',
  },

  adminAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  bubbleContainer: {
    maxWidth: '75%',
  },
  bubbleContainerAdmin: {
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
  bubbleAdmin: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8edf2',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },

  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
  },

  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  bubbleTextAdmin: {
    color: '#111827',
    textAlign: 'right',
  },
  bubbleTextUser: {
    color: '#fff',
    textAlign: 'right',
  },

  bubbleTime: {
    fontSize: 10,
  },
  bubbleTimeAdmin: {
    color: '#9ca3af',
    textAlign: 'left',
  },
  bubbleTimeUser: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },

  // ── شريط الإدخال (RTL صحيح) ──
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
  imageBtn: {
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