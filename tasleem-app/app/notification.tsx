import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

// Types
interface Notification {
  id: number;
  title: string;
  body: string;
  data: string | null;
  is_read: boolean;
  created_at: string;
}

const timeAgo = (date: string) => {
  const utcDate = (date.endsWith('Z') || date.includes('+')) ? date : date + 'Z';
  const diff = Date.now() - new Date(utcDate).getTime();
  if (diff < 0) return 'الآن';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  if (d < 7) return `منذ ${d} يوم`;
  return new Date(utcDate).toLocaleDateString('ar-IQ');
};

const getNotificationIcon = (notification: Notification) => {
  if (notification.data) {
    try {
      const data = JSON.parse(notification.data);
      if (data?.type === 'order_status') return { icon: 'bag-check-outline', color: '#3b82f6', bg: '#3b82f610' };
      if (data?.type === 'withdrawal_status') return { icon: 'wallet-outline', color: '#10b981', bg: '#10b98110' };
      if (data?.type === 'broadcast') return { icon: 'megaphone-outline', color: '#f59e0b', bg: '#f59e0b10' };
    } catch {}
  }
  return { icon: 'notifications-outline', color: PRIMARY, bg: PRIMARY + '10' };
};

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications/user');
      return data.sort((a: Notification, b: Notification) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    refetchInterval: 30000,
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-notifications'] });
      setModalVisible(false);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    setSelectedNotification(notification);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteNotification.mutate(id);
  };

  const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;

  const renderNotification = ({ item }: { item: Notification }) => {
    const { icon, color, bg } = getNotificationIcon(item);
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[s.notificationCard, isUnread && s.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}>
        <View style={[s.iconContainer, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        
        <View style={s.contentContainer}>
          <View style={s.headerRow}>
            <Text style={[s.title, isUnread && s.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.time}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={[s.body, isUnread && s.unreadBody]} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle-outline" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconBox}>
        <Ionicons name="notifications-off-outline" size={50} color="#9ca3af" />
      </View>
      <Text style={s.emptyTitle}>لا توجد إشعارات</Text>
      <Text style={s.emptyText}>سيتم إعلامك عند استلام إشعار جديد</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>الإشعارات</Text>
        {unreadCount > 0 && (
          <TouchableOpacity 
            style={s.markAllBtn} 
            onPress={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}>
            <Text style={s.markAllText}>تحديد الكل كمقروء</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      {notifications.length > 0 && (
        <View style={s.statsBar}>
          <View style={s.statItem}>
            <Ionicons name="notifications" size={16} color={PRIMARY} />
            <Text style={s.statText}>الكل: {notifications.length}</Text>
          </View>
          {unreadCount > 0 && (
            <View style={s.statItem}>
              <View style={s.unreadDot} />
              <Text style={s.statText}>غير مقروء: {unreadCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Notifications List */}
      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>جاري تحميل الإشعارات...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={EmptyState}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      {/* Notification Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selectedNotification?.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <Text style={s.modalTime}>
              {selectedNotification?.created_at && timeAgo(selectedNotification.created_at)}
            </Text>
            
            <Text style={s.modalBody}>{selectedNotification?.body}</Text>
            
            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.deleteModalBtn}
                onPress={() => selectedNotification && handleDelete(selectedNotification.id)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={s.deleteModalText}>حذف الإشعار</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  unreadCard: {
    backgroundColor: PRIMARY + '08',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  time: {
    fontSize: 10,
    color: '#9ca3af',
  },
  body: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  unreadBody: {
    color: '#374151',
  },
  deleteBtn: {
    padding: 4,
  },
  separator: {
    height: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 16,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  modalTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
    paddingTop: 16,
  },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },
  deleteModalText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
});