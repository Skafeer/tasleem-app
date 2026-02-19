import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Image, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const DANGER = '#ef4444';
const SUCCESS = '#10b981';

const STATUS: any = {
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', icon: 'refresh-outline' },
  delivered:  { label: 'تم التسليم',   color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  returned:   { label: 'مرتجع',        color: '#ef4444', bg: '#fef2f2', icon: 'arrow-undo-outline' },
};

const W_STATUS: any = {
  pending:  { label: 'معلق',    color: '#f59e0b', bg: '#fffbeb' },
  approved: { label: 'موافق',   color: '#10b981', bg: '#ecfdf5' },
  rejected: { label: 'مرفوض',  color: '#ef4444', bg: '#fef2f2' },
};

const CATEGORIES = ['إلكترونيات','ملابس','مستحضرات','أجهزة منزلية','رياضة','ألعاب','أخرى'];

export default function AdminScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'orders'|'products'|'users'|'withdrawals'|'promos'>('orders');
  const [orderFilter, setOrderFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<any>(null);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', discountPercent: '' });
  const [form, setForm] = useState({
    name:'', description:'', wholesalePrice:'', sellingPriceMin:'',
    category:'إلكترونيات', images:[] as string[], adLinks:'', stock:'10',
    isRenewable: false, discount: '0',
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => { const { data } = await api.get('/api/orders'); return data; },
    refetchInterval: 30000,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data; },
  });
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data; },
  });
  const { data: withdrawals = [] } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => { const { data } = await api.get('/api/withdrawals'); return data; },
  });
  const { data: promos = [] } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => { const { data } = await api.get('/api/promo-codes'); return data; },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  const resetForm = () => setForm({
    name:'', description:'', wholesalePrice:'', sellingPriceMin:'',
    category:'إلكترونيات', images:[], adLinks:'', stock:'10',
    isRenewable: false, discount: '0',
  });

  // رفع صورة واحدة
  const pickAndUploadImage = async () => {
    if (form.images.length >= 10) { toast.warning('الحد الأقصى 10 صور'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { toast.error('يرجى السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - form.images.length,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    setUploadingImgs(true);
    try {
      const uploadedUrls: string[] = [];
      for (const asset of result.assets) {
        const base64 = `data:image/jpeg;base64,${asset.base64}`;
        const { data } = await api.post('/api/upload', { image: base64 });
        uploadedUrls.push(data.url);
      }
      setForm(p => ({ ...p, images: [...p.images, ...uploadedUrls].slice(0, 10) }));
      toast.success(`تم رفع ${uploadedUrls.length} صورة ✅`);
    } catch { toast.error('فشل رفع الصور'); }
    setUploadingImgs(false);
  };

  const removeImage = (idx: number) => {
    setForm(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('تم تحديث الحالة ✅'); },
  });

  const updateWithdrawal = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/withdrawals/${id}`, { status });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }); toast.success('تم تحديث حالة السحب ✅'); },
  });

  const saveProduct = useMutation({
    mutationFn: async (d: any) => {
      if (showEditProduct) {
        const r = await api.put(`/api/products/${showEditProduct.id}`, d); return r.data;
      }
      const r = await api.post('/api/products', d); return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(showEditProduct ? 'تم التعديل ✅' : 'تم إضافة المنتج ✅');
      setShowAddProduct(false); setShowEditProduct(null); resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل'),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/products/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.info('تم حذف المنتج'); },
  });

  const addPromo = useMutation({
    mutationFn: async (d: any) => { const r = await api.post('/api/promo-codes', d); return r.data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('تم إضافة الكود ✅');
      setShowAddPromo(false); setPromoForm({ code: '', discountPercent: '' });
    },
  });

  const deletePromo = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/promo-codes/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promo-codes'] }); toast.info('تم حذف الكود'); },
  });

  const openEdit = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : (p.imageUrl ? [p.imageUrl] : []);
    setForm({
      name:p.name, description:p.description,
      wholesalePrice:String(p.wholesalePrice), sellingPriceMin:String(p.sellingPriceMin),
      category:p.category, images: imgs, adLinks:p.adLinks||'',
      stock:String(p.stock), isRenewable:p.isRenewable||false, discount:String(p.discount||0),
    });
    setShowEditProduct(p);
  };

  const handleSaveProduct = () => {
    if (!form.name || !form.wholesalePrice || !form.sellingPriceMin) {
      toast.warning('يرجى ملء الحقول المطلوبة'); return;
    }
    if (form.images.length === 0) { toast.warning('يرجى إضافة صورة واحدة على الأقل'); return; }
    saveProduct.mutate({
      name:form.name, description:form.description,
      wholesalePrice:Number(form.wholesalePrice),
      sellingPriceMin:Number(form.sellingPriceMin),
      category:form.category,
      imageUrl:form.images[0],
      images:form.images.join(','),
      adLinks:form.adLinks,
      stock:Number(form.stock),
      isRenewable:form.isRenewable,
      discount:Number(form.discount),
    });
  };

  const filteredOrders = orders
    .filter((o:any) => orderFilter==='all' || o.status===orderFilter)
    .filter((o:any) => !search || o.customerName?.includes(search) || String(o.id).includes(search));
  const filteredProducts = products.filter((p:any) => !search || p.name?.includes(search));
  const merchantCount = users.filter((u:any)=>u.role==='merchant').length;
  const totalRevenue = orders.filter((o:any)=>o.status==='delivered').reduce((s:number,o:any)=>s+o.totalAmount,0);
  const pendingWithdrawals = withdrawals.filter((w:any)=>w.status==='pending').length;

  const TABS = [
    {key:'orders',      label:'الطلبات',    icon:'bag-outline',          count:orders.length},
    {key:'products',    label:'المنتجات',   icon:'cube-outline',         count:products.length},
    {key:'withdrawals', label:'السحوبات',   icon:'cash-outline',         count:pendingWithdrawals},
    {key:'users',       label:'التجار',     icon:'people-outline',       count:merchantCount},
    {key:'promos',      label:'الأكواد',    icon:'pricetag-outline',     count:promos.length},
  ];

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={[PRIMARY,'#0a5566']} style={s.header} start={{x:0,y:0}} end={{x:1,y:1}}>
        <View style={{width:38}}/>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>لوحة الإدارة</Text>
          <Text style={s.headerSub}>مرحباً مدير النظام 👋</Text>
        </View>
        <View style={[s.headerBadge,{backgroundColor:'rgba(255,255,255,0.2)'}]}>
          <Ionicons name="shield-checkmark" size={22} color="#fff"/>
        </View>
      </LinearGradient>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{maxHeight:100}} contentContainerStyle={{padding:10,gap:10}}>
        {[
          {label:'الإيرادات', value:`${(totalRevenue/1000).toFixed(0)}k`, icon:'cash-outline', color:'#10b981'},
          {label:'الطلبات',   value:orders.length,   icon:'bag-outline',       color:PRIMARY},
          {label:'التجار',    value:merchantCount,   icon:'storefront-outline',color:'#8b5cf6'},
          {label:'المنتجات',  value:products.length, icon:'cube-outline',      color:SECONDARY},
          {label:'سحوبات معلقة', value:pendingWithdrawals, icon:'time-outline', color:DANGER},
        ].map((stat,i)=>(
          <View key={i} style={s.statCard}>
            <View style={[s.statIcon,{backgroundColor:stat.color+'20'}]}>
              <Ionicons name={stat.icon as any} size={16} color={stat.color}/>
            </View>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{maxHeight:58}} contentContainerStyle={{paddingHorizontal:12,gap:8,alignItems:'center'}}>
        {TABS.map(t=>(
          <TouchableOpacity key={t.key} style={[s.tabBtn,tab===t.key&&s.tabActive]}
            onPress={()=>{setTab(t.key as any);setSearch('');}}>
            <Ionicons name={t.icon as any} size={15} color={tab===t.key?PRIMARY:'#9ca3af'}/>
            <Text style={[s.tabText,tab===t.key&&s.tabTextActive]}>{t.label}</Text>
            {t.count>0&&<View style={[s.badge,tab===t.key&&s.badgeActive]}>
              <Text style={[s.badgeText,tab===t.key&&s.badgeTextActive]}>{t.count}</Text>
            </View>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      {(tab==='orders'||tab==='products')&&(
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#9ca3af"/>
          <TextInput style={s.searchInput} placeholder="بحث..." value={search}
            onChangeText={setSearch} placeholderTextColor="#9ca3af" textAlign="right"/>
          {search&&<TouchableOpacity onPress={()=>setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af"/></TouchableOpacity>}
        </View>
      )}

      {/* Order Filter */}
      {tab==='orders'&&(
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{maxHeight:42,marginBottom:4}} contentContainerStyle={{gap:8,paddingHorizontal:12}}>
          {[['all','الكل'],['pending','انتظار'],['processing','معالجة'],
            ['delivered','مُسلَّم'],['returned','مرتجع']].map(([key,label])=>(
            <TouchableOpacity key={key} style={[s.filterBtn,orderFilter===key&&s.filterBtnActive]}
              onPress={()=>setOrderFilter(key)}>
              <Text style={[s.filterText,orderFilter===key&&s.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView style={{flex:1}} contentContainerStyle={{padding:12,paddingBottom:40}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY}/>}
        showsVerticalScrollIndicator={false}>

        {/* ORDERS */}
        {tab==='orders'&&filteredOrders.map((order:any)=>(
          <View key={order.id} style={s.orderCard}>
            <View style={s.orderHead}>
              <View style={[s.statusPill,{backgroundColor:STATUS[order.status]?.bg}]}>
                <Ionicons name={STATUS[order.status]?.icon} size={12} color={STATUS[order.status]?.color}/>
                <Text style={[s.statusPillText,{color:STATUS[order.status]?.color}]}>{STATUS[order.status]?.label}</Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={s.orderId}>طلب #{order.id}</Text>
                <Text style={s.orderDate}>{new Date(order.createdAt).toLocaleDateString('ar-IQ')}</Text>
              </View>
            </View>
            <View style={s.orderBody}>
              {[{l:'👤',v:order.customerName},{l:'📞',v:order.customerPhone},
                {l:'📍',v:`${order.province} — ${order.address}`}].map((r,i)=>(
                <View key={i} style={s.orderRow}>
                  <Text style={s.orderVal}>{r.v}</Text>
                  <Text style={s.orderLbl}>{r.l}</Text>
                </View>
              ))}
              <View style={s.orderRow}>
                <Text style={[s.orderVal,{color:SUCCESS,fontWeight:'bold'}]}>{order.totalProfit?.toLocaleString()} د.ع</Text>
                <Text style={s.orderLbl}>💰 الربح</Text>
              </View>
              <View style={s.orderRow}>
                <Text style={[s.orderVal,{color:PRIMARY,fontWeight:'bold',fontSize:15}]}>{order.totalAmount?.toLocaleString()} د.ع</Text>
                <Text style={s.orderLbl}>🧾 الإجمالي</Text>
              </View>
            </View>
            <View style={s.statusBtns}>
              {Object.entries(STATUS).map(([key,val]:any)=>(
                <TouchableOpacity key={key}
                  style={[s.statusBtn,order.status===key&&{backgroundColor:val.color}]}
                  onPress={()=>updateStatus.mutate({id:order.id,status:key})}
                  disabled={updateStatus.isPending}>
                  <Text style={[s.statusBtnText,order.status===key&&{color:'#fff'}]}>{val.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* PRODUCTS */}
        {tab==='products'&&<>
          <TouchableOpacity style={s.addBtn} onPress={()=>setShowAddProduct(true)}>
            <LinearGradient colors={[PRIMARY,'#0a8a9f']} style={s.addBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="add-circle-outline" size={20} color="#fff"/>
              <Text style={s.addBtnText}>إضافة منتج جديد</Text>
            </LinearGradient>
          </TouchableOpacity>
          {filteredProducts.map((p:any)=>{
            const imgs = p.images ? p.images.split(',').filter(Boolean) : (p.imageUrl?[p.imageUrl]:[]);
            return (
              <View key={p.id} style={s.productCard}>
                {imgs[0]
                  ? <Image source={{uri:imgs[0]}} style={s.productImg} resizeMode="cover"/>
                  : <View style={[s.productImg,{backgroundColor:'#f3f4f6',justifyContent:'center',alignItems:'center'}]}>
                      <Ionicons name="image-outline" size={24} color="#d1d5db"/>
                    </View>
                }
                <View style={s.productInfo}>
                  <View style={s.productCatPill}><Text style={s.productCatText}>{p.category}</Text></View>
                  <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                  <Text style={s.productPrice}>جملة: {p.wholesalePrice?.toLocaleString()} | أدنى: {p.sellingPriceMin?.toLocaleString()}</Text>
                  <View style={{flexDirection:'row',gap:6,marginTop:4}}>
                    {p.isRenewable&&<View style={s.renewPill}><Text style={s.renewText}>قابل للتجديد</Text></View>}
                    {p.discount>0&&<View style={s.discPill}><Text style={s.discText}>خصم {p.discount}%</Text></View>}
                  </View>
                  <Text style={[s.stockText,p.stock<5&&{color:DANGER}]}>مخزون: {p.stock} {imgs.length>1?`• ${imgs.length} صور`:''}</Text>
                </View>
                <View style={s.productActions}>
                  <TouchableOpacity style={s.editBtn} onPress={()=>openEdit(p)}>
                    <Ionicons name="create-outline" size={17} color={PRIMARY}/>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={()=>deleteProduct.mutate(p.id)}>
                    <Ionicons name="trash-outline" size={17} color={DANGER}/>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>}

        {/* WITHDRAWALS */}
        {tab==='withdrawals'&&<>
          <Text style={s.sectionHeader}>طلبات السحب ({withdrawals.length})</Text>
          {withdrawals.length===0&&(
            <View style={s.emptyBox}>
              <Ionicons name="cash-outline" size={48} color="#d1d5db"/>
              <Text style={s.emptyText}>لا توجد طلبات سحب</Text>
            </View>
          )}
          {withdrawals.map((w:any)=>(
            <View key={w.id} style={s.withdrawCard}>
              <View style={s.withdrawHead}>
                <View style={[s.wStatusPill,{backgroundColor:W_STATUS[w.status]?.bg}]}>
                  <Text style={[s.wStatusText,{color:W_STATUS[w.status]?.color}]}>{W_STATUS[w.status]?.label}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={s.withdrawAmount}>{w.amount?.toLocaleString()} د.ع</Text>
                  <Text style={s.withdrawDate}>{new Date(w.createdAt).toLocaleDateString('ar-IQ')}</Text>
                </View>
              </View>
              <View style={s.withdrawInfo}>
                <Text style={s.withdrawMethod}>طريقة السحب: {w.method}</Text>
                {w.accountDetails&&<Text style={s.withdrawAccount}>{w.accountDetails}</Text>}
              </View>
              {w.status==='pending'&&(
                <View style={s.withdrawBtns}>
                  <TouchableOpacity style={[s.wBtn,{backgroundColor:'#fef2f2'}]}
                    onPress={()=>updateWithdrawal.mutate({id:w.id,status:'rejected'})}>
                    <Ionicons name="close-circle-outline" size={16} color={DANGER}/>
                    <Text style={[s.wBtnText,{color:DANGER}]}>رفض</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.wBtn,{backgroundColor:'#ecfdf5'}]}
                    onPress={()=>updateWithdrawal.mutate({id:w.id,status:'approved'})}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={SUCCESS}/>
                    <Text style={[s.wBtnText,{color:SUCCESS}]}>موافقة</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </>}

        {/* USERS */}
        {tab==='users'&&users.filter((u:any)=>u.role!=='admin').map((u:any)=>(
          <View key={u.id} style={s.userCard}>
            <View style={s.userAvatar}><Text style={s.userAvatarText}>{u.storeName?.charAt(0)}</Text></View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{u.storeName}</Text>
              <Text style={s.userPhone}>{u.phone}</Text>
              <Text style={s.userId}>{u.merchantId}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={[s.userBalance,{color:SUCCESS}]}>{u.balance?.toLocaleString()} د.ع</Text>
              <Text style={s.userBalanceLabel}>متاح</Text>
              <Text style={[s.userBalance,{color:SECONDARY,fontSize:12}]}>{u.pendingBalance?.toLocaleString()} د.ع</Text>
              <Text style={s.userBalanceLabel}>معلق</Text>
            </View>
          </View>
        ))}

        {/* PROMOS */}
        {tab==='promos'&&<>
          <TouchableOpacity style={s.addBtn} onPress={()=>setShowAddPromo(true)}>
            <LinearGradient colors={[SECONDARY,'#e09000']} style={s.addBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="add-circle-outline" size={20} color="#fff"/>
              <Text style={s.addBtnText}>إضافة كود خصم جديد</Text>
            </LinearGradient>
          </TouchableOpacity>
          {promos.map((p:any)=>(
            <View key={p.id} style={s.promoCard}>
              <TouchableOpacity style={s.promoDelBtn} onPress={()=>deletePromo.mutate(p.id)}>
                <Ionicons name="trash-outline" size={16} color={DANGER}/>
              </TouchableOpacity>
              <View style={{flex:1}}>
                <Text style={s.promoCode}>{p.code}</Text>
                <Text style={s.promoDiscount}>خصم {p.discountPercent}%</Text>
                <View style={[s.promoStatusPill,{backgroundColor:p.isActive?'#ecfdf5':'#fef2f2'}]}>
                  <Text style={{fontSize:11,color:p.isActive?SUCCESS:DANGER,fontWeight:'bold'}}>
                    {p.isActive?'فعال':'غير فعال'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {promos.length===0&&(
            <View style={s.emptyBox}>
              <Ionicons name="pricetag-outline" size={48} color="#d1d5db"/>
              <Text style={s.emptyText}>لا توجد أكواد خصم</Text>
            </View>
          )}
        </>}
      </ScrollView>

      {/* Add/Edit Product Modal */}
      {(showAddProduct||showEditProduct)&&(
        <Modal visible transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={()=>{setShowAddProduct(false);setShowEditProduct(null);resetForm();}}>
                  <Ionicons name="close" size={24} color="#6b7280"/>
                </TouchableOpacity>
                <Text style={s.modalTitle}>{showEditProduct?'تعديل المنتج':'إضافة منتج'}</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Image Upload */}
                <Text style={s.inputLabel}>روابط صور المنتج (افصل بفواصل) *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{gap:10,paddingBottom:8}}>
                  {form.images.map((url,i)=>(
                    <View key={i} style={s.imgThumbBox}>
                      <Image source={{uri:url}} style={s.imgThumb} resizeMode="cover"/>
                      <TouchableOpacity style={s.imgRemoveBtn} onPress={()=>removeImage(i)}>
                        <Ionicons name="close-circle" size={20} color={DANGER}/>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {form.images.length<10&&(
                    <TouchableOpacity style={s.imgAddBtn} onPress={pickAndUploadImage} disabled={uploadingImgs}>
                      {uploadingImgs
                        ? <ActivityIndicator color={PRIMARY}/>
                        : <><Ionicons name="camera-outline" size={24} color={PRIMARY}/>
                            <Text style={s.imgAddText}>إضافة</Text></>
                      }
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {[
                  {label:'اسم المنتج *',key:'name',placeholder:'اسم المنتج',keyboard:'default'},
                  {label:'الوصف',key:'description',placeholder:'وصف المنتج',keyboard:'default'},
                  {label:'سعر الجملة *',key:'wholesalePrice',placeholder:'0',keyboard:'numeric'},
                  {label:'أدنى سعر بيع *',key:'sellingPriceMin',placeholder:'0',keyboard:'numeric'},
                  {label:'المخزون',key:'stock',placeholder:'10',keyboard:'numeric'},
                  {label:'نسبة الخصم %',key:'discount',placeholder:'0',keyboard:'numeric'},
                  {label:'روابط إعلانية (افصل بفواصل)',key:'adLinks',placeholder:'https://...',keyboard:'url'},
                ].map(f=>(
                  <View key={f.key}>
                    <Text style={s.inputLabel}>{f.label}</Text>
                    <TextInput style={s.modalInput} placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChangeText={v=>setForm(p=>({...p,[f.key]:v}))}
                      keyboardType={f.keyboard as any} textAlign="right"
                      placeholderTextColor="#9ca3af"/>
                  </View>
                ))}

                <Text style={s.inputLabel}>التصنيف</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}}>
                  <View style={{flexDirection:'row',gap:8}}>
                    {CATEGORIES.map(cat=>(
                      <TouchableOpacity key={cat} style={[s.catBtn,form.category===cat&&s.catBtnActive]}
                        onPress={()=>setForm(p=>({...p,category:cat}))}>
                        <Text style={[s.catText,form.category===cat&&s.catTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity style={s.toggleBtn} onPress={()=>setForm(p=>({...p,isRenewable:!p.isRenewable}))}>
                  <View style={[s.toggleCircle,form.isRenewable&&s.toggleActive]}>
                    {form.isRenewable&&<Ionicons name="checkmark" size={14} color="#fff"/>}
                  </View>
                  <Text style={s.toggleText}>قابل للتجديد</Text>
                </TouchableOpacity>

                {form.wholesalePrice&&form.sellingPriceMin&&(
                  <View style={s.profitPreview}>
                    <Text style={s.profitPreviewText}>
                      💰 أدنى ربح للتاجر:{' '}
                      <Text style={{color:SUCCESS,fontWeight:'bold'}}>
                        {(Number(form.sellingPriceMin)-Number(form.wholesalePrice)).toLocaleString()} د.ع
                      </Text>
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity style={s.confirmBtn} onPress={handleSaveProduct}
                disabled={saveProduct.isPending||uploadingImgs}>
                <LinearGradient colors={[PRIMARY,'#0a8a9f']} style={s.confirmGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  {saveProduct.isPending
                    ? <ActivityIndicator color="#fff"/>
                    : <><Ionicons name={showEditProduct?'save-outline':'add-circle-outline'} size={20} color="#fff"/>
                        <Text style={s.confirmText}>{showEditProduct?'حفظ التعديلات':'إضافة المنتج'}</Text></>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Promo Modal */}
      <Modal visible={showAddPromo} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard,{maxHeight:'50%'}]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={()=>setShowAddPromo(false)}>
                <Ionicons name="close" size={24} color="#6b7280"/>
              </TouchableOpacity>
              <Text style={s.modalTitle}>إضافة كود خصم</Text>
            </View>
            <Text style={s.inputLabel}>الكود</Text>
            <TextInput style={s.modalInput} placeholder="SAVE10"
              value={promoForm.code} onChangeText={v=>setPromoForm(p=>({...p,code:v.toUpperCase()}))}
              textAlign="right" placeholderTextColor="#9ca3af" autoCapitalize="characters"/>
            <Text style={s.inputLabel}>نسبة الخصم %</Text>
            <TextInput style={s.modalInput} placeholder="10"
              value={promoForm.discountPercent} onChangeText={v=>setPromoForm(p=>({...p,discountPercent:v}))}
              keyboardType="numeric" textAlign="right" placeholderTextColor="#9ca3af"/>
            <TouchableOpacity style={[s.confirmBtn,{marginTop:16}]}
              onPress={()=>{
                if(!promoForm.code||!promoForm.discountPercent){toast.warning('يرجى ملء الحقول');return;}
                addPromo.mutate({code:promoForm.code,discountPercent:Number(promoForm.discountPercent)});
              }} disabled={addPromo.isPending}>
              <LinearGradient colors={[SECONDARY,'#e09000']} style={s.confirmGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                {addPromo.isPending?<ActivityIndicator color="#fff"/>:
                  <Text style={s.confirmText}>إضافة الكود</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f8fafc'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingVertical:12},
  headerBadge:{width:36,height:36,borderRadius:11,justifyContent:'center',alignItems:'center'},
  headerCenter:{alignItems:'center'},
  headerTitle:{fontSize:18,fontWeight:'bold',color:'#fff'},
  headerSub:{fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:1},
  statCard:{backgroundColor:'#fff',borderRadius:14,padding:10,minWidth:100,alignItems:'center',
    shadowColor:'#000',shadowOpacity:0.05,shadowRadius:6,elevation:2},
  statIcon:{width:32,height:32,borderRadius:9,justifyContent:'center',alignItems:'center',marginBottom:5},
  statValue:{fontSize:16,fontWeight:'bold',color:'#111827'},
  statLabel:{fontSize:10,color:'#6b7280',marginTop:2},
  tabBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,paddingVertical:8,
    borderRadius:20,backgroundColor:'#f3f4f6',borderWidth:1,borderColor:'#e5e7eb'},
  tabActive:{backgroundColor:PRIMARY+'15',borderColor:PRIMARY},
  tabText:{fontSize:12,color:'#9ca3af',fontWeight:'500'},
  tabTextActive:{color:PRIMARY,fontWeight:'700'},
  badge:{backgroundColor:'#f3f4f6',borderRadius:8,paddingHorizontal:5,paddingVertical:1},
  badgeActive:{backgroundColor:PRIMARY},
  badgeText:{fontSize:10,color:'#9ca3af',fontWeight:'bold'},
  badgeTextActive:{color:'#fff'},
  searchBox:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',
    marginHorizontal:12,marginVertical:6,borderRadius:12,paddingHorizontal:12,
    height:40,borderWidth:1,borderColor:'#e5e7eb',gap:6},
  searchInput:{flex:1,fontSize:13,color:'#111827'},
  filterBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:16,
    backgroundColor:'#f3f4f6',borderWidth:1,borderColor:'#e5e7eb'},
  filterBtnActive:{backgroundColor:PRIMARY,borderColor:PRIMARY},
  filterText:{fontSize:12,color:'#6b7280',fontWeight:'600'},
  filterTextActive:{color:'#fff'},
  orderCard:{backgroundColor:'#fff',borderRadius:18,padding:14,marginBottom:10,
    shadowColor:'#000',shadowOpacity:0.04,shadowRadius:8,elevation:2},
  orderHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10},
  orderId:{fontSize:14,fontWeight:'bold',color:'#111827'},
  orderDate:{fontSize:11,color:'#9ca3af',marginTop:2},
  statusPill:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:9,paddingVertical:5,borderRadius:16},
  statusPillText:{fontSize:11,fontWeight:'bold'},
  orderBody:{backgroundColor:'#f8fafc',borderRadius:12,padding:10,marginBottom:10,gap:6},
  orderRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  orderLbl:{fontSize:13,color:'#9ca3af'},
  orderVal:{fontSize:13,color:'#374151',fontWeight:'500',flex:1,textAlign:'right'},
  statusBtns:{flexDirection:'row',flexWrap:'wrap',gap:6},
  statusBtn:{paddingHorizontal:10,paddingVertical:6,borderRadius:9,
    backgroundColor:'#f9fafb',borderWidth:1,borderColor:'#e5e7eb'},
  statusBtnText:{fontSize:11,color:'#6b7280',fontWeight:'600'},
  addBtn:{borderRadius:14,marginBottom:12,overflow:'hidden',
    shadowColor:PRIMARY,shadowOpacity:0.25,shadowRadius:8,elevation:4},
  addBtnGrad:{flexDirection:'row',justifyContent:'center',alignItems:'center',height:48,gap:8},
  addBtnText:{color:'#fff',fontWeight:'bold',fontSize:14},
  productCard:{backgroundColor:'#fff',borderRadius:16,padding:12,flexDirection:'row-reverse',
    gap:10,marginBottom:10,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  productImg:{width:75,height:75,borderRadius:12},
  productInfo:{flex:1},
  productCatPill:{backgroundColor:PRIMARY+'15',borderRadius:7,paddingHorizontal:7,
    paddingVertical:3,alignSelf:'flex-end',marginBottom:3},
  productCatText:{fontSize:10,color:PRIMARY,fontWeight:'bold'},
  productName:{fontSize:13,fontWeight:'bold',color:'#111827',textAlign:'right'},
  productPrice:{fontSize:11,color:'#6b7280',textAlign:'right',marginTop:3},
  stockText:{fontSize:11,color:PRIMARY,marginTop:3},
  renewPill:{backgroundColor:'#dcfce7',borderRadius:6,paddingHorizontal:6,paddingVertical:2},
  renewText:{fontSize:10,color:'#166534',fontWeight:'bold'},
  discPill:{backgroundColor:'#fef9c3',borderRadius:6,paddingHorizontal:6,paddingVertical:2},
  discText:{fontSize:10,color:'#854d0e',fontWeight:'bold'},
  productActions:{gap:8,justifyContent:'center'},
  editBtn:{width:34,height:34,borderRadius:9,backgroundColor:PRIMARY+'15',justifyContent:'center',alignItems:'center'},
  delBtn:{width:34,height:34,borderRadius:9,backgroundColor:'#fef2f2',justifyContent:'center',alignItems:'center'},
  sectionHeader:{fontSize:15,fontWeight:'bold',color:'#111827',textAlign:'right',marginBottom:10},
  withdrawCard:{backgroundColor:'#fff',borderRadius:16,padding:14,marginBottom:10,
    shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  withdrawHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10},
  withdrawAmount:{fontSize:18,fontWeight:'bold',color:PRIMARY},
  withdrawDate:{fontSize:11,color:'#9ca3af',marginTop:2},
  wStatusPill:{paddingHorizontal:10,paddingVertical:5,borderRadius:14},
  wStatusText:{fontSize:12,fontWeight:'bold'},
  withdrawInfo:{backgroundColor:'#f9fafb',borderRadius:10,padding:10,marginBottom:10},
  withdrawMethod:{fontSize:13,color:'#374151',textAlign:'right'},
  withdrawAccount:{fontSize:12,color:'#6b7280',textAlign:'right',marginTop:4},
  withdrawBtns:{flexDirection:'row',gap:8},
  wBtn:{flex:1,flexDirection:'row',justifyContent:'center',alignItems:'center',
    gap:6,paddingVertical:10,borderRadius:12},
  wBtnText:{fontSize:13,fontWeight:'bold'},
  userCard:{backgroundColor:'#fff',borderRadius:16,padding:12,flexDirection:'row',
    alignItems:'center',gap:10,marginBottom:10,
    shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  userAvatar:{width:46,height:46,borderRadius:23,backgroundColor:PRIMARY+'20',
    justifyContent:'center',alignItems:'center'},
  userAvatarText:{fontSize:20,fontWeight:'bold',color:PRIMARY},
  userInfo:{flex:1},
  userName:{fontSize:14,fontWeight:'bold',color:'#111827',textAlign:'right'},
  userPhone:{fontSize:12,color:'#6b7280',textAlign:'right'},
  userId:{fontSize:11,color:'#9ca3af',textAlign:'right'},
  userBalance:{fontSize:14,fontWeight:'bold',textAlign:'right'},
  userBalanceLabel:{fontSize:10,color:'#9ca3af',textAlign:'right'},
  promoCard:{backgroundColor:'#fff',borderRadius:14,padding:14,flexDirection:'row',
    alignItems:'center',gap:12,marginBottom:10,
    shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  promoCode:{fontSize:18,fontWeight:'bold',color:'#111827',textAlign:'right'},
  promoDiscount:{fontSize:14,color:SECONDARY,fontWeight:'600',textAlign:'right',marginTop:3},
  promoStatusPill:{borderRadius:8,paddingHorizontal:8,paddingVertical:3,alignSelf:'flex-end',marginTop:4},
  promoDelBtn:{width:34,height:34,borderRadius:9,backgroundColor:'#fef2f2',
    justifyContent:'center',alignItems:'center'},
  emptyBox:{justifyContent:'center',alignItems:'center',paddingTop:60,gap:12},
  emptyText:{fontSize:14,color:'#9ca3af'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  modalCard:{backgroundColor:'#fff',borderTopLeftRadius:26,borderTopRightRadius:26,
    padding:20,paddingBottom:40,maxHeight:'92%'},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  modalTitle:{fontSize:17,fontWeight:'bold',color:'#111827'},
  inputLabel:{fontSize:12,color:'#374151',textAlign:'right',marginBottom:6,marginTop:10,fontWeight:'600'},
  modalInput:{borderWidth:1.5,borderColor:'#e5e7eb',borderRadius:12,padding:11,
    fontSize:14,color:'#111827',backgroundColor:'#f9fafb'},
  imgThumbBox:{position:'relative',width:80,height:80},
  imgThumb:{width:80,height:80,borderRadius:12},
  imgRemoveBtn:{position:'absolute',top:-8,right:-8},
  imgAddBtn:{width:80,height:80,borderRadius:12,backgroundColor:PRIMARY+'12',
    justifyContent:'center',alignItems:'center',borderWidth:1.5,
    borderColor:PRIMARY,borderStyle:'dashed'},
  imgAddText:{fontSize:11,color:PRIMARY,fontWeight:'600',marginTop:3},
  catBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:18,
    backgroundColor:'#f3f4f6',borderWidth:1,borderColor:'#e5e7eb'},
  catBtnActive:{backgroundColor:PRIMARY,borderColor:PRIMARY},
  catText:{fontSize:12,color:'#6b7280',fontWeight:'600'},
  catTextActive:{color:'#fff'},
  toggleBtn:{flexDirection:'row-reverse',alignItems:'center',gap:10,
    backgroundColor:'#f9fafb',borderRadius:12,padding:12,marginTop:12},
  toggleCircle:{width:24,height:24,borderRadius:12,backgroundColor:'#e5e7eb',
    justifyContent:'center',alignItems:'center'},
  toggleActive:{backgroundColor:SUCCESS},
  toggleText:{fontSize:14,color:'#374151',fontWeight:'600'},
  profitPreview:{backgroundColor:'#ecfdf5',borderRadius:12,padding:12,marginTop:8},
  profitPreviewText:{fontSize:13,color:'#374151',textAlign:'right'},
  confirmBtn:{borderRadius:14,overflow:'hidden',shadowColor:PRIMARY,shadowOpacity:0.25,shadowRadius:8,elevation:4},
  confirmGrad:{height:50,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},
  confirmText:{color:'#fff',fontWeight:'bold',fontSize:15},
});
