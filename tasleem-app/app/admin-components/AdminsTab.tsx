import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const DANGER = '#ef4444';
const WARNING = '#f59e0b';
const SUCCESS = '#10b981';
const BG = '#f2f6f9';

const ALL_PERMISSIONS = [
  { key: 'orders', label: 'الطلبات', icon: 'bag-handle-outline' },
  { key: 'products', label: 'المنتجات', icon: 'cube-outline' },
  { key: 'withdrawals', label: 'السحوبات', icon: 'cash-outline' },
  { key: 'merchants', label: 'التجار', icon: 'people-outline' },
  { key: 'promos', label: 'الأكواد', icon: 'pricetag-outline' },
  { key: 'banners', label: 'البنرات', icon: 'images-outline' },
  { key: 'stats', label: 'الإحصائيات', icon: 'bar-chart-outline' },
  { key: 'notifications', label: 'الإشعارات', icon: 'notifications-outline' },
];

export default function AdminsTab() {
  const qc = useQueryClient();
  const [view, setView] = useState<'admins' | 'promote'>('admins');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);

  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/admins');
      return data;
    },
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users');
      return data;
    },
  });

  const merchants = (allUsers as any[]).filter((u: any) => u.role === 'merchant');
  const filteredMerchants = merchants.filter((u: any) =>
    !search || u.storeName?.includes(search) || u.phone?.includes(search)
  );

  const promoteMutation = useMutation({
    mutationFn: async () =>
      api.post('/api/admin/admins', { userId: selectedUser.id, permissions: selectedPerms }),
    onSuccess: () => {
      toast.success(`تم ترقية ${selectedUser.store_name} لأدمن ✅`);
      setSelectedUser(null);
      setSelectedPerms([]);
      setView('admins');
      setSearch('');
      qc.invalidateQueries({ queryKey: ['admins'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الترقية'),
  });

  const editMutation = useMutation({
    mutationFn: async (id: number) =>
      api.patch(`/api/admin/admins/${id}`, { permissions: editPerms }),
    onSuccess: () => {
      toast.success('تم تحديث الصلاحيات ✅');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => toast.error('فشل التحديث'),
  });

  const demoteMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/api/admin/admins/${id}/demote`),
    onSuccess: () => {
      toast.success('تم تحويله لتاجر');
      qc.invalidateQueries({ queryKey: ['admins'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل التحويل'),
  });

  const confirmDemote = (admin: any) => {
    Alert.alert('تحويل لتاجر', `هل تريد تحويل "${admin.storeName}" من أدمن لتاجر؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تحويل', style: 'destructive', onPress: () => demoteMutation.mutate(admin.id) },
    ]);
  };

  const togglePerm = (key: string, perms: string[], setPerms: (p: string[]) => void) => {
    setPerms(perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key]);
  };

  const startEdit = (admin: any) => {
    setEditingId(admin.id);
    try {
      setEditPerms(JSON.parse(admin.permissions || '[]'));
    } catch {
      setEditPerms([]);
    }
  };

  const adminList = admins as any[];

  // ── عرض اختيار التاجر وصلاحياته ──
  if (view === 'promote') {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

        {/* هيدر */}
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => {
              setView('admins');
              setSelectedUser(null);
              setSelectedPerms([]);
              setSearch('');
            }}>
            <Ionicons name="chevron-back" size={18} color={PRIMARY} />
            <Text style={s.backBtnText}>رجوع</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>ترقية تاجر لأدمن</Text>
          <View style={s.headerIcon}>
            <Ionicons name="shield-outline" size={22} color={PRIMARY} />
          </View>
        </View>

        {!selectedUser ? (
          <>
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={18} color="#9ca3af" />
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="ابحث باسم المتجر أو الهاتف..."
                placeholderTextColor="#9ca3af"
                textAlign="right"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={17} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingUsers ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 30 }} />
            ) : filteredMerchants.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="people-outline" size={40} color="#d1d5db" />
                <Text style={s.emptyText}>لا توجد نتائج</Text>
              </View>
            ) : (
              filteredMerchants.map((u: any) => (
                <TouchableOpacity
                  key={u.id}
                  style={s.merchantRow}
                  onPress={() => setSelectedUser(u)}>
                  <View style={s.merchantAvatar}>
                    <Text style={s.merchantAvatarText}>{u.storeName?.charAt(0)}</Text>
                  </View>
                  <View style={s.merchantInfo}>
                    <Text style={s.merchantName}>{u.storeName}</Text>
                    <Text style={s.merchantPhone}>{u.phone}</Text>
                  </View>
                  <Ionicons name="chevron-back" size={18} color="#d1d5db" />
                </TouchableOpacity>
              ))
            )}
          </>
        ) : (
          <>
            <View style={s.selectedCard}>
              <View style={s.merchantAvatar}>
                <Text style={s.merchantAvatarText}>{selectedUser.store_name?.charAt(0)}</Text>
              </View>
              <View style={s.selectedInfo}>
                <Text style={s.merchantName}>{selectedUser.store_name}</Text>
                <Text style={s.merchantPhone}>{selectedUser.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close-circle" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text style={s.sectionLabel}>اختر الصلاحيات</Text>
            <View style={s.permsGrid}>
              {ALL_PERMISSIONS.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[s.permChip, selectedPerms.includes(p.key) && s.permChipOn]}
                  onPress={() => togglePerm(p.key, selectedPerms, setSelectedPerms)}>
                  <Ionicons
                    name={p.icon as any}
                    size={15}
                    color={selectedPerms.includes(p.key) ? '#fff' : '#6b7280'}
                  />
                  <Text
                    style={[s.permChipText, selectedPerms.includes(p.key) && s.permChipTextOn]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.promoteBtn, promoteMutation.isPending && { opacity: 0.7 }]}
              onPress={() => promoteMutation.mutate()}
              disabled={promoteMutation.isPending}>
              {promoteMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text style={s.promoteBtnText}>ترقية لأدمن</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  // ── عرض قائمة الأدمنز ──
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

      {/* هيدر */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.addBtn} onPress={() => setView('promote')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>ترقية تاجر</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.pageTitle}>إدارة الأدمنية</Text>
          <Text style={s.pageSub}>{adminList.length} أدمن مسجل</Text>
        </View>
        <View style={s.headerIcon}>
          <Ionicons name="shield-outline" size={22} color={PRIMARY} />
        </View>
      </View>

      {loadingAdmins ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : adminList.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="people-outline" size={40} color="#d1d5db" />
          <Text style={s.emptyText}>لا يوجد أدمنز</Text>
        </View>
      ) : (
        adminList.map((admin: any) => {
          const isSuperAdmin = admin.is_super_admin;
          let perms: string[] = [];
          try {
            perms = JSON.parse(admin.permissions || '[]');
          } catch { }
          const isEditing = editingId === admin.id;

          return (
            <View key={admin.id} style={[s.adminCard, isSuperAdmin && s.adminCardSuper]}>

              <View style={s.adminTop}>
                {!isSuperAdmin && (
                  <View style={s.adminActions}>
                    <TouchableOpacity
                      style={s.editBtn}
                      onPress={() => (isEditing ? setEditingId(null) : startEdit(admin))}>
                      <Ionicons
                        name={isEditing ? 'close-outline' : 'create-outline'}
                        size={18}
                        color={PRIMARY}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.demoteBtn} onPress={() => confirmDemote(admin)}>
                      <Ionicons name="arrow-down-circle-outline" size={18} color={WARNING} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={s.adminInfo}>
                  <View style={s.nameRow}>
                    <Text style={s.adminName}>{admin.storeName}</Text>
                    {isSuperAdmin && (
                      <View style={s.superBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                        <Text style={s.superBadgeText}>سوبر أدمن</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.adminPhone}>{admin.phone}</Text>
                  <Text style={s.adminId}>ID: {admin.merchant_id}</Text>
                </View>
                <View style={[s.adminAvatar, isSuperAdmin && s.adminAvatarSuper]}>
                  <Ionicons
                    name={isSuperAdmin ? 'star' : 'shield-outline'}
                    size={22}
                    color={isSuperAdmin ? WARNING : PRIMARY}
                  />
                </View>
              </View>

              {!isSuperAdmin && !isEditing && (
                <View style={s.permsDisplay}>
                  {perms.length === 0 ? (
                    <Text style={s.noPermsText}>لا توجد صلاحيات</Text>
                  ) : (
                    <View style={s.permsRow}>
                      {perms.map(pk => {
                        const p = ALL_PERMISSIONS.find(x => x.key === pk);
                        return p ? (
                          <View key={pk} style={s.permTag}>
                            <Ionicons name={p.icon as any} size={11} color={PRIMARY} />
                            <Text style={s.permTagText}>{p.label}</Text>
                          </View>
                        ) : null;
                      })}
                    </View>
                  )}
                </View>
              )}

              {isEditing && (
                <View style={s.editSection}>
                  <Text style={s.editTitle}>تعديل الصلاحيات</Text>
                  <View style={s.permsGrid}>
                    {ALL_PERMISSIONS.map(p => (
                      <TouchableOpacity
                        key={p.key}
                        style={[s.permChip, editPerms.includes(p.key) && s.permChipOn]}
                        onPress={() => togglePerm(p.key, editPerms, setEditPerms)}>
                        <Ionicons
                          name={p.icon as any}
                          size={15}
                          color={editPerms.includes(p.key) ? '#fff' : '#6b7280'}
                        />
                        <Text
                          style={[s.permChipText, editPerms.includes(p.key) && s.permChipTextOn]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[s.saveBtn, editMutation.isPending && { opacity: 0.7 }]}
                    onPress={() => editMutation.mutate(admin.id)}
                    disabled={editMutation.isPending}>
                    {editMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={s.saveBtnText}>حفظ الصلاحيات</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 14, paddingBottom: 60 },

  // هيدر
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  pageSub: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // رجوع
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY + '12',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtnText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: 'bold',
  },

  // بحث
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
  },

  // بطاقة التاجر في القائمة
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  merchantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  merchantInfo: { flex: 1, alignItems: 'flex-end' },
  merchantName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  merchantPhone: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 3,
  },

  // الحساب المختار
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: PRIMARY + '08',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: PRIMARY + '30',
  },
  selectedInfo: { flex: 1, alignItems: 'flex-end' },

  // صلاحيات
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 12,
  },
  permsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  permChipOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  permChipText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  permChipTextOn: {
    color: '#fff',
  },

  // زر الترقية
  promoteBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  promoteBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // بطاقة الأدمن
  adminCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  adminCardSuper: {
    borderWidth: 1.5,
    borderColor: WARNING + '60',
    backgroundColor: '#fffbeb',
  },
  adminTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  adminAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatarSuper: {
    backgroundColor: '#fef3c7',
  },
  adminInfo: { flex: 1, alignItems: 'flex-end' },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  adminName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  adminPhone: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  adminId: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 2,
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: WARNING,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  superBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: WARNING + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // عرض الصلاحيات
  permsDisplay: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  permsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  permTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIMARY + '12',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  permTagText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '600',
  },
  noPermsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },

  // تعديل
  editSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 14,
  },
  editTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 12,
  },

  // فارغ
  empty: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});