import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const DANGER  = '#ef4444';
const SUCCESS = '#10b981';

const ALL_PERMISSIONS = [
  { key: 'orders',        label: 'الطلبات',     icon: 'bag-handle-outline'    },
  { key: 'products',      label: 'المنتجات',    icon: 'cube-outline'           },
  { key: 'withdrawals',   label: 'السحوبات',    icon: 'cash-outline'           },
  { key: 'merchants',     label: 'التجار',      icon: 'people-outline'         },
  { key: 'promos',        label: 'الأكواد',     icon: 'pricetag-outline'       },
  { key: 'banners',       label: 'البنرات',     icon: 'images-outline'         },
  { key: 'stats',         label: 'الإحصائيات', icon: 'bar-chart-outline'      },
  { key: 'notifications', label: 'الإشعارات',  icon: 'notifications-outline'  },
];

export default function AdminsTab() {
  const qc = useQueryClient();

  // فورم إضافة أدمن
  const [showForm,    setShowForm]    = useState(false);
  const [storeName,   setStoreName]   = useState('');
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [newPerms,    setNewPerms]    = useState<string[]>([]);
  const [focusedField, setFocused]   = useState<string | null>(null);

  // تعديل صلاحيات
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editPerms,   setEditPerms]   = useState<string[]>([]);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => { const { data } = await api.get('/api/admin/admins'); return data; },
  });

  const addMutation = useMutation({
    mutationFn: async () => api.post('/api/admin/admins', { storeName, phone, password, permissions: newPerms }),
    onSuccess: () => {
      toast.success('تم إضافة الأدمن ✅');
      setShowForm(false); setStoreName(''); setPhone(''); setPassword(''); setNewPerms([]);
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الإضافة'),
  });

  const editMutation = useMutation({
    mutationFn: async (id: number) => api.patch(`/api/admin/admins/${id}`, { permissions: editPerms }),
    onSuccess: () => {
      toast.success('تم تحديث الصلاحيات ✅');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: () => toast.error('فشل التحديث'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/admin/admins/${id}`),
    onSuccess: () => {
      toast.success('تم حذف الأدمن');
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحذف'),
  });

  const confirmDelete = (id: number, name: string) => {
    Alert.alert('حذف أدمن', `هل تريد حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const togglePerm = (key: string, perms: string[], setPerms: (p: string[]) => void) => {
    setPerms(perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key]);
  };

  const startEdit = (admin: any) => {
    setEditingId(admin.id);
    try { setEditPerms(JSON.parse(admin.permissions || '[]')); } catch { setEditPerms([]); }
  };

  const adminList = admins as any[];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

      {/* هيدر */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
          <Text style={s.addBtnText}>{showForm ? 'إلغاء' : 'أدمن جديد'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>إدارة الأدمنية</Text>
          <Text style={s.headerSub}>{adminList.length} أدمن مسجل</Text>
        </View>
        <View style={s.headerIcon}>
          <Ionicons name="shield-outline" size={22} color={PRIMARY} />
        </View>
      </View>

      {/* ── فورم إضافة أدمن ── */}
      {showForm && (
        <View style={s.formCard}>
          <Text style={s.formTitle}>إضافة أدمن جديد</Text>

          {/* الاسم */}
          <Text style={s.fieldLabel}>الاسم</Text>
          <View style={[s.inputRow, focusedField === 'name' && s.inputFocused]}>
            <TextInput style={s.input} value={storeName} onChangeText={setStoreName}
              placeholder="اسم الأدمن" placeholderTextColor="#9ca3af" textAlign="right"
              onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
            <Ionicons name="person-outline" size={18} color={focusedField === 'name' ? PRIMARY : '#9ca3af'} />
          </View>

          {/* الهاتف */}
          <Text style={s.fieldLabel}>رقم الهاتف</Text>
          <View style={[s.inputRow, focusedField === 'phone' && s.inputFocused]}>
            <TextInput style={s.input} value={phone} onChangeText={setPhone}
              placeholder="07xxxxxxxxx" placeholderTextColor="#9ca3af" textAlign="right"
              keyboardType="phone-pad"
              onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} />
            <Ionicons name="call-outline" size={18} color={focusedField === 'phone' ? PRIMARY : '#9ca3af'} />
          </View>

          {/* كلمة المرور */}
          <Text style={s.fieldLabel}>كلمة المرور</Text>
          <View style={[s.inputRow, focusedField === 'pass' && s.inputFocused]}>
            <TextInput style={s.input} value={password} onChangeText={setPassword}
              placeholder="كلمة المرور" placeholderTextColor="#9ca3af" textAlign="right"
              secureTextEntry={!showPass}
              onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color={focusedField === 'pass' ? PRIMARY : '#9ca3af'} />
            </TouchableOpacity>
          </View>

          {/* الصلاحيات */}
          <Text style={s.fieldLabel}>الصلاحيات</Text>
          <View style={s.permsGrid}>
            {ALL_PERMISSIONS.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[s.permChip, newPerms.includes(p.key) && s.permChipOn]}
                onPress={() => togglePerm(p.key, newPerms, setNewPerms)}>
                <Ionicons name={p.icon as any} size={15} color={newPerms.includes(p.key) ? '#fff' : '#6b7280'} />
                <Text style={[s.permChipText, newPerms.includes(p.key) && s.permChipTextOn]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* زر الحفظ */}
          <TouchableOpacity
            style={[s.saveBtn, addMutation.isPending && { opacity: 0.7 }]}
            onPress={() => addMutation.mutate()}
            disabled={addMutation.isPending}>
            {addMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.saveBtnText}>إضافة الأدمن</Text></>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* ── قائمة الأدمنز ── */}
      {isLoading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : adminList.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <Ionicons name="people-outline" size={36} color="#9ca3af" />
          </View>
          <Text style={s.emptyTitle}>لا يوجد أدمنز</Text>
          <Text style={s.emptyText}>أضف أول أدمن من الزر أعلاه</Text>
        </View>
      ) : (
        adminList.map((admin: any) => {
          const isSuperAdmin = admin.is_super_admin;
          let perms: string[] = [];
          try { perms = JSON.parse(admin.permissions || '[]'); } catch {}
          const isEditing = editingId === admin.id;

          return (
            <View key={admin.id} style={[s.adminCard, isSuperAdmin && s.adminCardSuper]}>
              {/* معلومات الأدمن */}
              <View style={s.adminTop}>
                <View style={s.adminActions}>
                  {!isSuperAdmin && (
                    <>
                      <TouchableOpacity style={s.editBtn} onPress={() => isEditing ? setEditingId(null) : startEdit(admin)}>
                        <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={18} color={PRIMARY} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(admin.id, admin.store_name)}>
                        <Ionicons name="trash-outline" size={18} color={DANGER} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.adminNameRow}>
                    <Text style={s.adminName}>{admin.store_name}</Text>
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
                  <Ionicons name={isSuperAdmin ? 'star' : 'shield-outline'} size={22} color={isSuperAdmin ? '#f59e0b' : PRIMARY} />
                </View>
              </View>

              {/* الصلاحيات الحالية */}
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

              {/* تعديل الصلاحيات */}
              {isEditing && (
                <View style={s.editSection}>
                  <Text style={s.editTitle}>تعديل الصلاحيات</Text>
                  <View style={s.permsGrid}>
                    {ALL_PERMISSIONS.map(p => (
                      <TouchableOpacity
                        key={p.key}
                        style={[s.permChip, editPerms.includes(p.key) && s.permChipOn]}
                        onPress={() => togglePerm(p.key, editPerms, setEditPerms)}>
                        <Ionicons name={p.icon as any} size={15} color={editPerms.includes(p.key) ? '#fff' : '#6b7280'} />
                        <Text style={[s.permChipText, editPerms.includes(p.key) && s.permChipTextOn]}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[s.saveBtn, { marginTop: 8 }, editMutation.isPending && { opacity: 0.7 }]}
                    onPress={() => editMutation.mutate(admin.id)}
                    disabled={editMutation.isPending}>
                    {editMutation.isPending
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.saveBtnText}>حفظ الصلاحيات</Text></>
                    }
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
  container:       { padding: 14, paddingBottom: 60 },

  // هيدر
  headerRow:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon:      { width: 44, height: 44, borderRadius: 14, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center' },
  headerTitle:     { fontSize: 16, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  headerSub:       { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 2 },
  addBtn:          { flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  addBtnText:      { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // فورم
  formCard:        { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 },
  formTitle:       { fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 16 },
  fieldLabel:      { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 8, fontWeight: '600' },
  inputRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 14 },
  inputFocused:    { borderColor: PRIMARY, backgroundColor: '#fff' },
  input:           { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' } as any,

  // صلاحيات
  permsGrid:       { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  permChip:        { flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#e5e7eb' },
  permChipOn:      { backgroundColor: PRIMARY, borderColor: PRIMARY },
  permChipText:    { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  permChipTextOn:  { color: '#fff' },

  // زر الحفظ
  saveBtn:         { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // بطاقة الأدمن
  adminCard:       { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  adminCardSuper:  { borderWidth: 1.5, borderColor: '#f59e0b' + '60', backgroundColor: '#fffbeb' },
  adminTop:        { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  adminAvatar:     { width: 48, height: 48, borderRadius: 14, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center' },
  adminAvatarSuper: { backgroundColor: '#fef3c7' },
  adminNameRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  adminName:       { fontSize: 15, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  adminPhone:      { fontSize: 13, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  adminId:         { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 2 },
  superBadge:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 3,
    backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  superBadgeText:  { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  adminActions:    { flexDirection: 'row-reverse', gap: 8 },
  editBtn:         { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center' },
  deleteBtn:       { width: 34, height: 34, borderRadius: 10, backgroundColor: DANGER + '15',
    justifyContent: 'center', alignItems: 'center' },

  // عرض الصلاحيات
  permsDisplay:    { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 },
  permsRow:        { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  permTag:         { flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: PRIMARY + '12', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  permTagText:     { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  noPermsText:     { fontSize: 12, color: '#9ca3af', textAlign: 'right' },

  // تعديل
  editSection:     { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 14 },
  editTitle:       { fontSize: 13, fontWeight: 'bold', color: '#374151', textAlign: 'right', marginBottom: 12 },

  // فارغ
  empty:           { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyIconBox:    { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center' },
  emptyTitle:      { fontSize: 15, fontWeight: 'bold', color: '#374151' },
  emptyText:       { fontSize: 13, color: '#9ca3af' },
});
