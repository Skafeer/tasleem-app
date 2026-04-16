import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { api } from '../src/lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function SaqrScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: 'هلا بيك عيني! أنا صقر مساعدك الذكي في تسليم. انطيني كود أي منتج وأحلله الك فوراً 🦅', sender: 'saqr' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), text: userMsg, sender: 'user' }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/saqr/analyze', { identifier: userMsg });
      setMessages(prev => [...prev, { id: Date.now() + 1, text: response.data.analysis, sender: 'saqr' }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: 'عذراً عيني، صار عندي خلل بسيط. تأكد من الكود؟', sender: 'saqr' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Stack.Screen options={{ title: 'المساعد صقر (Beta) 🦅', headerTitleAlign: 'center' }} />
      <ScrollView 
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        style={styles.chatArea}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.saqrBubble]}>
            <Text style={[styles.messageText, msg.sender === 'user' ? styles.userText : styles.saqrText]}>{msg.text}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator color="#2E7D32" style={{ marginVertical: 10 }} />}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="اكتب كود المنتج هنا..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  chatArea: { flex: 1, padding: 15 },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 15, marginBottom: 10 },
  saqrBubble: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderBottomLeftRadius: 2 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2E7D32', borderBottomRightRadius: 2 },
  messageText: { fontSize: 14 },
  saqrText: { color: '#333' },
  userText: { color: '#FFF' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE' },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 25, paddingHorizontal: 15, height: 45, textAlign: 'right' },
  sendButton: { marginLeft: 10, backgroundColor: '#2E7D32', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' }
});
