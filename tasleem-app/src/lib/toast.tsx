import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  title?: string;
  type: ToastType;
}

// ✅ الألوان الجديدة - تصميم حديث
const COLORS: any = {
  success: { bg: '#10b981', border: '#10b981', icon: '#fff', iconName: 'checkmark-circle' },
  error:   { bg: '#ef4444', border: '#ef4444', icon: '#fff', iconName: 'close-circle' },
  info:    { bg: '#3b82f6', border: '#3b82f6', icon: '#fff', iconName: 'information-circle' },
  warning: { bg: '#f59e0b', border: '#f59e0b', icon: '#fff', iconName: 'warning' },
};

let showToastFn: (msg: string, type?: ToastType, title?: string) => void = () => {};

export const toast = {
  success: (msg: string, title?: string) => showToastFn(msg, 'success', title),
  error:   (msg: string, title?: string) => showToastFn(msg, 'error', title),
  info:    (msg: string, title?: string) => showToastFn(msg, 'info', title),
  warning: (msg: string, title?: string) => showToastFn(msg, 'warning', title),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  showToastFn = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => removeToast(id), 3000); // 3 ثواني
  }, [removeToast]);

  return (
    <>
      {children}
      <View style={s.container} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </View>
    </>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const c = COLORS[toast.type];

  useState(() => {
    Animated.spring(anim, {
      toValue: 1, useNativeDriver: true,
      tension: 80, friction: 10,
    }).start();
  });

  return (
    <Animated.View style={[s.toast, {
      backgroundColor: c.bg,
      borderColor: c.border,
      transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [-20,0] }) }],
      opacity: anim,
    }]}>
      <TouchableOpacity onPress={onClose} style={s.closeBtn}>
        <Ionicons name="close" size={16} color="#fff" />
      </TouchableOpacity>
      <View style={s.toastContent}>
        {toast.title && <Text style={[s.toastTitle, { color: '#fff' }]}>{toast.title}</Text>}
        <Text style={s.toastMsg}>{toast.message}</Text>
      </View>
      <View style={[s.toastIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Ionicons name={c.iconName as any} size={22} color={c.icon} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute', top: 60, left: 16, right: 16,
    zIndex: 9999, gap: 8,
  },
  toast: {
    borderRadius: 16, borderWidth: 0, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  toastIcon: { width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center' },
  toastContent: { flex: 1, alignItems: 'flex-end' },
  toastTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  toastMsg: { fontSize: 13, color: '#fff', textAlign: 'right', lineHeight: 18 },
  closeBtn: { padding: 4 },
});