import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser, useLogout } from '../../src/hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const logout = useLogout();

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => {
        await logout.mutateAsync();
        router.replace('/auth');
      }},
    ]);
  };

  const MenuItem = ({ icon, label, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name="chevron-back" size={18} color="#ccc" />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name={icon} size={20} color="#1E3A6E" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>حسابي</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.storeName?.charAt(0) || '؟'}
          </Text>
        </View>
        <Text style={styles.storeName}>{user?.storeName}</Text>
        <Text style={styles.merchantId}>{user?.merchantId}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      <View style={styles.menu}>
        <MenuItem icon="person-outline" label="تعديل الملف الشخصي"
          onPress={() => router.push('/profile-edit')} />
        <MenuItem icon="lock-closed-outline" label="تغيير كلمة المرور"
          onPress={() => router.push('/change-password')} />
        <MenuItem icon="time-outline" label="سجل السحوبات"
          onPress={() => router.push('/withdraw-history')} />
        <MenuItem icon="shield-outline" label="إعدادات الأمان"
          onPress={() => router.push('/security')} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#fff', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold',
    color: '#1E3A6E', textAlign: 'right' },
  profileCard: { backgroundColor: '#1E3A6E', margin: 16,
    borderRadius: 20, padding: 24, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff', justifyContent: 'center',
    alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#1E3A6E' },
  storeName: { fontSize: 20, fontWeight: 'bold',
    color: '#fff', marginBottom: 4 },
  merchantId: { fontSize: 13, color: '#a0b4d0', marginBottom: 2 },
  phone: { fontSize: 13, color: '#a0b4d0' },
  menu: { backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row-reverse', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#333', textAlign: 'right' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, margin: 16,
    padding: 16, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: '#fee2e2' },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: '600' },
});
