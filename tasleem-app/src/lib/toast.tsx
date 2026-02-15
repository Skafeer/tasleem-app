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

const COLORS: any = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', iconName: 'checkmark-circle' },
  error:   { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', iconName: 'close-circle' },
  info:    { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', iconName: 'information-circle' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706', iconName: 'warning' },
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
    setTimeout(() => removeToast(id), 3500);
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
        <Ionicons name="close" size={16} color="#9ca3af" />
      </TouchableOpacity>
      <View style={s.toastContent}>
        {toast.title && <Text style={[s.toastTitle, { color: c.icon }]}>{toast.title}</Text>}
        <Text style={s.toastMsg}>{toast.message}</Text>
      </View>
      <View style={[s.toastIcon, { backgroundColor: c.icon + '20' }]}>
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
    borderRadius: 16, borderWidth: 1.5, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  toastIcon: { width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center' },
  toastContent: { flex: 1, alignItems: 'flex-end' },
  toastTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  toastMsg: { fontSize: 13, color: '#374151', textAlign: 'right', lineHeight: 18 },
  closeBtn: { padding: 4 },
});
