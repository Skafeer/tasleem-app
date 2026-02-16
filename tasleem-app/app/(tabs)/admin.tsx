import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Image, Animated,
  Dimensions, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const { width } = Dimensions.get('window');
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

export default function AdminScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'orders'|'products'|'users'>('orders');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    name:'', description:'', wholesalePrice:'',
    sellingPriceMin:'', category:'إلكترونيات', imageUrl:'', stock:'10'
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

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('تم تحديث الحالة ✅');
    },
  });

  const addProduct = useMutation({
    mutationFn: async (d: any) => { const r = await api.post('/api/products', d); return r.data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم إضافة المنتج ✅');
      setShowAddProduct(false);
      setForm({ name:'', description:'', wholesalePrice:'', sellingPriceMin:'', category:'إلكترونيات', imageUrl:'', stock:'10' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل'),
  });

  const editProduct = useMutation({
    mutationFn: async ({ id, ...d }: any) => { const r = await api.put(`/api/products/${id}`, d); return r.data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم التعديل ✅');
      setShowEditProduct(null);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/products/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.info('تم الحذف'); },
  });

  const totalRevenue = orders.filter((o:any)=>o.status==='delivered').reduce((s:number,o:any)=>s+o.totalAmount,0);
  const totalProfit  = orders.filter((o:any)=>o.status==='delivered').reduce((s:number,o:any)=>s+o.totalProfit,0);
  const pendingCount = orders.filter((o:any)=>o.status==='pending').length;
  const merchantCount = users.filter((u:any)=>u.role==='merchant').length;

  const filteredOrders = orders
    .filter((o:any) => orderFilter==='all' || o.status===orderFilter)
    .filter((o:any) => !search || o.customerName?.includes(search) || o.customerPhone?.includes(search) || String(o.id).includes(search));

  const filteredProducts = products.filter((p:any) =>
    !search || p.name?.includes(search) || p.category?.includes(search));

  const openEdit = (p: any) => {
    setForm({ name:p.name, description:p.description, wholesalePrice:String(p.wholesalePrice),
      sellingPriceMin:String(p.sellingPriceMin), category:p.category, imageUrl:p.imageUrl, stock:String(p.stock) });
    setShowEditProduct(p);
  };

  const CATEGORIES = ['إلكترونيات','ملابس','مستحضرات','أجهزة منزلية','رياضة','ألعاب','أخرى'];

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={[PRIMARY,'#0a5566']} style={s.header} start={{x:0,y:0}} end={{x:1,y:1}}>
        <View style={[s.headerBadge,{backgroundColor:'rgba(255,255,255,0.2)'}]}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
        </View>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>لوحة الإدارة</Text>
          <Text style={s.headerSub}>مرحباً مدير النظام 👋</Text>
        </View>
        <View style={{width:38}} />
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{maxHeight:110}} contentContainerStyle={{padding:12,gap:10}}>
        {[
          {label:'الإيرادات', value:`${(totalRevenue/1000).toFixed(0)}k`, icon:'cash-outline', color:'#10b981', bg:'#ecfdf5'},
          {label:'الأرباح',   value:`${(totalProfit/1000).toFixed(0)}k`,  icon:'trending-up-outline', color:'#3b82f6', bg:'#eff6ff'},
          {label:'معلقة',     value:pendingCount, icon:'time-outline', color:'#f59e0b', bg:'#fffbeb'},
          {label:'الطلبات',   value:orders.length, icon:'bag-outline', color:PRIMARY, bg:'#f0f9ff'},
          {label:'التجار',    value:merchantCount, icon:'storefront-outline', color:'#8b5cf6', bg:'#f5f3ff'},
          {label:'المنتجات',  value:products.length, icon:'cube-outline', color:SECONDARY, bg:'#fffbeb'},
        ].map((stat,i) => (
          <View key={i} style={[s.statCard,{backgroundColor:'#fff'}]}>
            <View style={[s.statIcon,{backgroundColor:stat.color+'20'}]}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color} />
            </View>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.tabs}>
        {[
          {key:'orders',   label:'الطلبات',  icon:'bag-outline',   count:orders.length},
          {key:'products', label:'المنتجات', icon:'cube-outline',  count:products.length},
          {key:'users',    label:'التجار',   icon:'people-outline',count:merchantCount},
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn,tab===t.key&&s.tabActive]}
            onPress={()=>{setTab(t.key as any);setSearch('');}}>
            <Ionicons name={t.icon as any} size={18} color={tab===t.key?PRIMARY:'#9ca3af'} />
            <Text style={[s.tabText,tab===t.key&&s.tabTextActive]}>{t.label}</Text>
            <View style={[s.badge,tab===t.key&&s.badgeActive]}>
              <Text style={[s.badgeText,tab===t.key&&s.badgeTextActive]}>{t.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput style={s.searchInput} placeholder="بحث..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9ca3af" textAlign="right" />
        {search?<TouchableOpacity onPress={()=>setSearch('')}>
          <Ionicons name="close-circle" size={18} color="#9ca3af" /></TouchableOpacity>:null}
      </View>

      {tab==='orders'&&(
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{maxHeight:44,marginBottom:4}} contentContainerStyle={{gap:8,paddingHorizontal:16}}>
          {[['all','الكل','grid-outline'],['pending','انتظار','time-outline'],
            ['processing','معالجة','refresh-outline'],['delivered','مُسلَّم','checkmark-circle-outline'],
            ['returned','مرتجع','arrow-undo-outline']].map(([key,label,icon])=>(
            <TouchableOpacity key={key} style={[s.filterBtn,orderFilter===key&&s.filterBtnActive]}
              onPress={()=>setOrderFilter(key)}>
              <Ionicons name={icon as any} size={13} color={orderFilter===key?'#fff':'#6b7280'} />
              <Text style={[s.filterText,orderFilter===key&&s.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView style={{flex:1}} contentContainerStyle={{padding:14,paddingBottom:40}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY}/>}
        showsVerticalScrollIndicator={false}>

        {tab==='orders'&&filteredOrders.map((order:any)=>(
          <View key={order.id} style={s.orderCard}>
            <View style={s.orderHead}>
              <View style={[s.statusPill,{backgroundColor:STATUS[order.status]?.bg}]}>
                <Ionicons name={STATUS[order.status]?.icon} size={13} color={STATUS[order.status]?.color}/>
                <Text style={[s.statusPillText,{color:STATUS[order.status]?.color}]}>{STATUS[order.status]?.label}</Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={s.orderId}>طلب #{order.id}</Text>
                <Text style={s.orderDate}>{new Date(order.createdAt).toLocaleDateString('ar-IQ')}</Text>
              </View>
            </View>
            <View style={s.orderBody}>
              {[
                {l:'👤 الزبون', v:order.customerName},
                {l:'📞 الهاتف', v:order.customerPhone},
                {l:'📍 المحافظة', v:order.province},
                {l:'🏠 العنوان', v:order.address},
              ].map((row,i)=>(
                <View key={i} style={s.orderRow}>
                  <Text style={s.orderVal}>{row.v}</Text>
                  <Text style={s.orderLbl}>{row.l}</Text>
                </View>
              ))}
              <View style={s.orderRow}>
                <Text style={[s.orderVal,{color:SUCCESS,fontWeight:'bold'}]}>{order.totalProfit?.toLocaleString()} د.ع</Text>
                <Text style={s.orderLbl}>💰 الربح</Text>
              </View>
              <View style={s.orderRow}>
                <Text style={[s.orderVal,{color:PRIMARY,fontWeight:'bold',fontSize:16}]}>{order.totalAmount?.toLocaleString()} د.ع</Text>
                <Text style={s.orderLbl}>🧾 الإجمالي</Text>
              </View>
            </View>
            {order.items?.length>0&&(
              <View style={s.itemsBox}>
                <Text style={s.itemsTitle}>المنتجات ({order.items.length})</Text>
                {order.items.map((item:any,i:number)=>(
                  <View key={i} style={s.itemRow}>
                    <Text style={s.itemPrice}>{(item.price*item.quantity)?.toLocaleString()} د.ع</Text>
                    <Text style={s.itemName}>{item.product?.name||`منتج #${item.productId}`}</Text>
                    <Text style={s.itemQty}>×{item.quantity}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={s.statusBtns}>
              {Object.entries(STATUS).map(([key,val]:any)=>(
                <TouchableOpacity key={key}
                  style={[s.statusBtn,order.status===key&&{backgroundColor:val.color}]}
                  onPress={()=>updateStatus.mutate({id:order.id,status:key})}
                  disabled={updateStatus.isPending}>
                  <Ionicons name={val.icon} size={13} color={order.status===key?'#fff':val.color}/>
                  <Text style={[s.statusBtnText,order.status===key&&{color:'#fff'}]}>{val.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {tab==='products'&&<>
          <TouchableOpacity style={s.addBtn} onPress={()=>setShowAddProduct(true)}>
            <LinearGradient colors={[PRIMARY,'#0a8a9f']} style={s.addBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="add-circle-outline" size={22} color="#fff"/>
              <Text style={s.addBtnText}>إضافة منتج جديد</Text>
            </LinearGradient>
          </TouchableOpacity>
          {filteredProducts.map((p:any)=>(
            <View key={p.id} style={s.productCard}>
              {p.imageUrl
                ? <Image source={{uri:p.imageUrl}} style={s.productImg} resizeMode="cover"/>
                : <View style={[s.productImg,{backgroundColor:'#f3f4f6',justifyContent:'center',alignItems:'center'}]}>
                    <Ionicons name="image-outline" size={28} color="#d1d5db"/>
                  </View>
              }
              <View style={s.productInfo}>
                <View style={s.productCatPill}><Text style={s.productCatText}>{p.category}</Text></View>
                <Text style={s.productName}>{p.name}</Text>
                <Text style={s.productDesc} numberOfLines={1}>{p.description}</Text>
                <View style={s.productPrices}>
                  <View><Text style={s.priceLabel}>أدنى بيع</Text>
                    <Text style={[s.priceVal,{color:SECONDARY}]}>{p.sellingPriceMin?.toLocaleString()}</Text></View>
                  <View><Text style={s.priceLabel}>الجملة</Text>
                    <Text style={[s.priceVal,{color:'#6b7280'}]}>{p.wholesalePrice?.toLocaleString()}</Text></View>
                  <View><Text style={s.priceLabel}>الربح</Text>
                    <Text style={[s.priceVal,{color:SUCCESS}]}>{(p.sellingPriceMin-p.wholesalePrice)?.toLocaleString()}</Text></View>
                </View>
                <View style={s.stockRow}>
                  <View style={[s.stockPill,p.stock<5&&{backgroundColor:'#fef2f2'}]}>
                    <Ionicons name="layers-outline" size={12} color={p.stock<5?DANGER:PRIMARY}/>
                    <Text style={[s.stockText,p.stock<5&&{color:DANGER}]}>{p.stock<5?'⚠️ ':''} مخزون: {p.stock}</Text>
                  </View>
                </View>
              </View>
              <View style={s.productActions}>
                <TouchableOpacity style={s.editBtn} onPress={()=>openEdit(p)}>
                  <Ionicons name="create-outline" size={18} color={PRIMARY}/>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={()=>deleteProduct.mutate(p.id)}>
                  <Ionicons name="trash-outline" size={18} color={DANGER}/>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>}

        {tab==='users'&&users.filter((u:any)=>u.role!=='admin').map((u:any)=>(
          <View key={u.id} style={s.userCard}>
            <LinearGradient colors={[PRIMARY+'15','#fff']} style={s.userGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
              <View style={s.userTop}>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={s.userName}>{u.storeName}</Text>
                  <Text style={s.userPhone}>{u.phone}</Text>
                  <Text style={s.userId}>🆔 {u.merchantId}</Text>
                  <Text style={s.userDate}>📅 {new Date(u.createdAt).toLocaleDateString('ar-IQ')}</Text>
                </View>
                <View style={s.userAvatar}>
                  <Text style={s.userAvatarText}>{u.storeName?.charAt(0)}</Text>
                </View>
              </View>
              <View style={s.userStats}>
                <View style={s.userStatBox}>
                  <Text style={[s.userStatVal,{color:SUCCESS}]}>{u.balance?.toLocaleString()} د.ع</Text>
                  <Text style={s.userStatLabel}>الرصيد المتاح</Text>
                </View>
                <View style={[s.userStatBox,{borderRightWidth:1,borderRightColor:'#e5e7eb'}]}>
                  <Text style={[s.userStatVal,{color:SECONDARY}]}>{u.pendingBalance?.toLocaleString()} د.ع</Text>
                  <Text style={s.userStatLabel}>قيد المعالجة</Text>
                </View>
              </View>
              <Text style={s.userAddress}>📍 {u.address||'لا يوجد عنوان'}</Text>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      {(showAddProduct||showEditProduct)&&(
        <Modal visible transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={()=>{setShowAddProduct(false);setShowEditProduct(null);}}>
                  <Ionicons name="close" size={24} color="#6b7280"/>
                </TouchableOpacity>
                <Text style={s.modalTitle}>{showEditProduct?'تعديل المنتج':'إضافة منتج'}</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  {label:'اسم المنتج *',key:'name',placeholder:'اسم المنتج',keyboard:'default'},
                  {label:'الوصف',key:'description',placeholder:'وصف مختصر',keyboard:'default'},
                  {label:'سعر الجملة *',key:'wholesalePrice',placeholder:'0',keyboard:'numeric'},
                  {label:'أدنى سعر بيع *',key:'sellingPriceMin',placeholder:'0',keyboard:'numeric'},
                  {label:'رابط الصورة',key:'imageUrl',placeholder:'https://...',keyboard:'url'},
                  {label:'المخزون',key:'stock',placeholder:'10',keyboard:'numeric'},
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
                  <View style={{flexDirection:'row',gap:8}}>
                    {CATEGORIES.map(cat=>(
                      <TouchableOpacity key={cat} style={[s.catBtn,form.category===cat&&s.catBtnActive]}
                        onPress={()=>setForm(p=>({...p,category:cat}))}>
                        <Text style={[s.catText,form.category===cat&&s.catTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                {form.imageUrl?<Image source={{uri:form.imageUrl}} style={s.previewImg} resizeMode="cover"/>:null}
                {form.wholesalePrice&&form.sellingPriceMin?(
                  <View style={s.profitPreview}>
                    <Text style={s.profitPreviewText}>💰 الربح: <Text style={{color:SUCCESS,fontWeight:'bold'}}>
                      {(Number(form.sellingPriceMin)-Number(form.wholesalePrice)).toLocaleString()} د.ع
                    </Text></Text>
                  </View>
                ):null}
              </ScrollView>
              <TouchableOpacity style={s.confirmBtn}
                onPress={()=>{
                  if(!form.name||!form.wholesalePrice||!form.sellingPriceMin){toast.warning('يرجى ملء الحقول');return;}
                  const payload={name:form.name,description:form.description,
                    wholesalePrice:Number(form.wholesalePrice),sellingPriceMin:Number(form.sellingPriceMin),
                    category:form.category,
                    imageUrl:form.imageUrl||'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
                    stock:Number(form.stock)};
                  if(showEditProduct) editProduct.mutate({id:showEditProduct.id,...payload});
                  else addProduct.mutate(payload);
                }}
                disabled={addProduct.isPending||editProduct.isPending}>
                <LinearGradient colors={[PRIMARY,'#0a8a9f']} style={s.confirmGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                  {(addProduct.isPending||editProduct.isPending)
                    ?<ActivityIndicator color="#fff"/>
                    :<><Ionicons name={showEditProduct?'save-outline':'add-circle-outline'} size={20} color="#fff"/>
                      <Text style={s.confirmText}>{showEditProduct?'حفظ التعديلات':'إضافة المنتج'}</Text></>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f8fafc'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14},
  headerBadge:{width:38,height:38,borderRadius:12,justifyContent:'center',alignItems:'center'},
  headerCenter:{alignItems:'center'},
  headerTitle:{fontSize:20,fontWeight:'bold',color:'#fff'},
  headerSub:{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:2},
  statCard:{borderRadius:16,padding:12,minWidth:110,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,elevation:3},
  statIcon:{width:36,height:36,borderRadius:10,justifyContent:'center',alignItems:'center',marginBottom:6},
  statValue:{fontSize:18,fontWeight:'bold',color:'#111827',textAlign:'right'},
  statLabel:{fontSize:10,color:'#6b7280',textAlign:'right',marginTop:2},
  tabs:{flexDirection:'row',backgroundColor:'#fff',paddingHorizontal:16,paddingVertical:10,gap:8,borderBottomWidth:1,borderBottomColor:'#f3f4f6'},
  tabBtn:{flex:1,flexDirection:'column',alignItems:'center',gap:4,paddingVertical:8,borderRadius:12,backgroundColor:'#f9fafb'},
  tabActive:{backgroundColor:PRIMARY+'12'},
  tabText:{fontSize:11,color:'#9ca3af',fontWeight:'500'},
  tabTextActive:{color:PRIMARY,fontWeight:'700'},
  badge:{backgroundColor:'#f3f4f6',borderRadius:10,paddingHorizontal:6,paddingVertical:2},
  badgeActive:{backgroundColor:PRIMARY},
  badgeText:{fontSize:10,color:'#9ca3af',fontWeight:'bold'},
  badgeTextActive:{color:'#fff'},
  searchBox:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',margin:12,borderRadius:14,paddingHorizontal:14,height:44,borderWidth:1,borderColor:'#e5e7eb',gap:8},
  searchInput:{flex:1,fontSize:13,color:'#111827'},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:'#f3f4f6',borderWidth:1,borderColor:'#e5e7eb'},
  filterBtnActive:{backgroundColor:PRIMARY,borderColor:PRIMARY},
  filterText:{fontSize:12,color:'#6b7280',fontWeight:'600'},
  filterTextActive:{color:'#fff'},
  orderCard:{backgroundColor:'#fff',borderRadius:20,padding:16,marginBottom:12,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:10,elevation:3},
  orderHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12},
  orderId:{fontSize:15,fontWeight:'bold',color:'#111827'},
  orderDate:{fontSize:11,color:'#9ca3af',marginTop:2},
  statusPill:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:6,borderRadius:20},
  statusPillText:{fontSize:12,fontWeight:'bold'},
  orderBody:{backgroundColor:'#f8fafc',borderRadius:14,padding:12,marginBottom:12,gap:8},
  orderRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  orderLbl:{fontSize:12,color:'#9ca3af'},
  orderVal:{fontSize:13,color:'#374151',fontWeight:'500'},
  itemsBox:{backgroundColor:'#f0f9ff',borderRadius:12,padding:12,marginBottom:12},
  itemsTitle:{fontSize:12,fontWeight:'bold',color:PRIMARY,textAlign:'right',marginBottom:8},
  itemRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:4},
  itemQty:{fontSize:13,fontWeight:'bold',color:PRIMARY,backgroundColor:PRIMARY+'15',paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  itemName:{flex:1,fontSize:13,color:'#374151',textAlign:'right',paddingHorizontal:8},
  itemPrice:{fontSize:13,fontWeight:'bold',color:'#374151'},
  statusBtns:{flexDirection:'row',flexWrap:'wrap',gap:6},
  statusBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,paddingVertical:7,borderRadius:10,backgroundColor:'#f9fafb',borderWidth:1,borderColor:'#e5e7eb'},
  statusBtnText:{fontSize:11,color:'#6b7280',fontWeight:'600'},
  addBtn:{borderRadius:16,marginBottom:14,overflow:'hidden',shadowColor:PRIMARY,shadowOpacity:0.3,shadowRadius:10,elevation:5},
  addBtnGrad:{flexDirection:'row',justifyContent:'center',alignItems:'center',height:52,gap:8},
  addBtnText:{color:'#fff',fontWeight:'bold',fontSize:15},
  productCard:{backgroundColor:'#fff',borderRadius:18,padding:14,flexDirection:'row-reverse',gap:12,marginBottom:10,shadowColor:'#000',shadowOpacity:0.05,shadowRadius:8,elevation:2},
  productImg:{width:80,height:80,borderRadius:14},
  productInfo:{flex:1},
  productCatPill:{backgroundColor:PRIMARY+'15',borderRadius:8,paddingHorizontal:8,paddingVertical:3,alignSelf:'flex-end',marginBottom:4},
  productCatText:{fontSize:10,color:PRIMARY,fontWeight:'bold'},
  productName:{fontSize:14,fontWeight:'bold',color:'#111827',textAlign:'right'},
  productDesc:{fontSize:11,color:'#9ca3af',textAlign:'right',marginTop:2},
  productPrices:{flexDirection:'row',justifyContent:'flex-end',gap:12,marginTop:6},
  priceLabel:{fontSize:10,color:'#9ca3af',textAlign:'center'},
  priceVal:{fontSize:12,fontWeight:'bold',textAlign:'center'},
  stockRow:{flexDirection:'row',justifyContent:'flex-end',marginTop:6},
  stockPill:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:PRIMARY+'12',borderRadius:8,paddingHorizontal:8,paddingVertical:3},
  stockText:{fontSize:11,color:PRIMARY,fontWeight:'600'},
  productActions:{gap:8},
  editBtn:{width:36,height:36,borderRadius:10,backgroundColor:PRIMARY+'15',justifyContent:'center',alignItems:'center'},
  delBtn:{width:36,height:36,borderRadius:10,backgroundColor:'#fef2f2',justifyContent:'center',alignItems:'center'},
  userCard:{borderRadius:20,marginBottom:12,overflow:'hidden',shadowColor:'#000',shadowOpacity:0.05,shadowRadius:8,elevation:2},
  userGrad:{padding:16},
  userTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12},
  userAvatar:{width:52,height:52,borderRadius:26,backgroundColor:PRIMARY+'20',justifyContent:'center',alignItems:'center'},
  userAvatarText:{fontSize:22,fontWeight:'bold',color:PRIMARY},
  userName:{fontSize:16,fontWeight:'bold',color:'#111827'},
  userPhone:{fontSize:13,color:'#6b7280',marginTop:2},
  userId:{fontSize:11,color:'#9ca3af',marginTop:2},
  userDate:{fontSize:11,color:'#9ca3af',marginTop:2},
  userStats:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.7)',borderRadius:12,padding:12,marginBottom:8},
  userStatBox:{flex:1,alignItems:'center'},
  userStatVal:{fontSize:16,fontWeight:'bold'},
  userStatLabel:{fontSize:11,color:'#9ca3af',marginTop:2},
  userAddress:{fontSize:12,color:'#6b7280',textAlign:'right'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  modalCard:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:44,maxHeight:'92%'},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  modalTitle:{fontSize:18,fontWeight:'bold',color:'#111827'},
  inputLabel:{fontSize:13,color:'#374151',textAlign:'right',marginBottom:6,marginTop:12,fontWeight:'500'},
  modalInput:{borderWidth:1.5,borderColor:'#e5e7eb',borderRadius:12,padding:12,fontSize:14,color:'#111827',backgroundColor:'#f9fafb'},
  catBtn:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:'#f3f4f6',borderWidth:1,borderColor:'#e5e7eb'},
  catBtnActive:{backgroundColor:PRIMARY,borderColor:PRIMARY},
  catText:{fontSize:13,color:'#6b7280',fontWeight:'600'},
  catTextActive:{color:'#fff'},
  previewImg:{width:'100%',height:160,borderRadius:16,marginVertical:12},
  profitPreview:{backgroundColor:'#ecfdf5',borderRadius:12,padding:12,marginTop:8},
  profitPreviewText:{fontSize:14,color:'#374151',textAlign:'right'},
  confirmBtn:{borderRadius:16,marginTop:20,overflow:'hidden',shadowColor:PRIMARY,shadowOpacity:0.3,shadowRadius:10,elevation:5},
  confirmGrad:{height:52,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},
  confirmText:{color:'#fff',fontWeight:'bold',fontSize:16},
});
