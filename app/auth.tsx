import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLogin } from '../src/hooks/useAuth';

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const login = useLogin();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('خطأ', 'أدخل رقم الهاتف وكلمة المرور');
      return;
    }
    try {
      await login.mutateAsync({ phone, password });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('خطأ', 'رقم الهاتف أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>تسليم</Text>
        <Text style={styles.subtitle}>منصة التجار</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>رقم الهاتف</Text>
        <TextInput
          style={styles.input}
          placeholder="07XXXXXXXXX"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textAlign="right"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>كلمة المرور</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.btn, login.isPending && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={login.isPending}
        >
          {login.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>تسجيل الدخول</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E3A6E' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#a0b4d0', marginTop: 8 },
  form: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 48,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#333',
    textAlign: 'right', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 12, padding: 14,
    fontSize: 15, color: '#333',
    marginBottom: 16, backgroundColor: '#fafafa',
  },
  btn: {
    backgroundColor: '#1E3A6E', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
