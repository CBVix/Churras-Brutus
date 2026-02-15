import React, { useState, useEffect } from 'react';
import { Page, Product, CartItem, OrderType, UserInfo, Tenant, Order, OrderStatus, InventoryItem, Coupon } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Alerts from './pages/Alerts';
import Favourite from './pages/Favourite';
import Dashboard from './pages/Dashboard';
import BottomNav from './components/BottomNav';
// Added AlertCircle to lucide-react imports
import { Bike, Utensils, Lock, X, Mail, Key, Loader2, Gift, ChevronRight, Shield, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useFavorites } from './hooks/useFavorites';

const getEnv = (key: string): string => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key];
  }
  return '';
};

// Security check for Supabase configuration
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "⚠️ ATENÇÃO: Configuração do Supabase (VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY) ausente.\n" +
    "O aplicativo não conseguirá se conectar ao banco de dados até que as variáveis de ambiente sejam configuradas."
  );
}

const SkeletonLoader = () => (
  <div className="w-full max-w-md mx-auto bg-white min-h-screen p-6 space-y-8 animate-pulse flex flex-col justify-center items-center">
    <div className="w-20 h-20 bg-gray-100 rounded-full mb-4"></div>
    <div className="h-4 w-48 bg-gray-100 rounded-lg"></div>
    <div className="h-2 w-32 bg-gray-100 rounded-lg"></div>
  </div>
);

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.UNSET);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', whatsapp: '', address: '', reference: '', tableNumber: '' });
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Auth States
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [authTarget, setAuthTarget] = useState<'admin' | 'client'>('client'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingCoupon, setPendingCoupon] = useState<Coupon | undefined>(undefined);

  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  const foodImages = [
    "https://i.postimg.cc/Y96YJf8h/1.jpg",
    "https://i.postimg.cc/brqk8DBf/2.jpg",
    "https://i.postimg.cc/nrT7LFys/3.jpg",
    "https://i.postimg.cc/dQ9G66hM/4.jpg",
    "https://i.postimg.cc/7YY0Wzzn/5.jpg",
    "https://i.postimg.cc/4xYtJTwS/6.jpg",
    "https://i.postimg.cc/MpnRW8dX/7.jpg",
    "https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1593504049359-74330189a355?q=80&w=400&auto=format&fit=crop"
  ];

  const fetchInitialData = async () => {
    // Prevent fetching if Supabase is not configured
    if (!getEnv('VITE_SUPABASE_URL')) {
        setLoading(false);
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const storeSlug = params.get('loja') || 'churras-brutus';

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // 1. Tenant Data
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', storeSlug)
        .maybeSingle();

      if (tenantError) throw tenantError;

      // 2. Products Data
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_slug', storeSlug);

      if (tenantData) {
        const mappedTenant: Tenant = {
          slug: tenantData.slug || storeSlug,
          name: tenantData.name || '',
          logo: tenantData.logo || '',
          themeColor: tenantData.theme_color || '#f97316',
          whatsapp: tenantData.whatsapp || '',
          address: tenantData.address || '',
          instagram: tenantData.instagram || '',
          pixKey: tenantData.pix_key || '',
          paymentLink: tenantData.payment_link || '',
          deliveryFee: Number(tenantData.delivery_fee || 0),
          cardMachineFee: Number(tenantData.card_machine_fee || 0),
          operatingHours: tenantData.operating_hours || {},
          holidayClosures: tenantData.holiday_closures || [],
          categories: (tenantData.categories && tenantData.categories.length > 0) ? tenantData.categories : DEFAULT_CATEGORIES,
          products: (productsData || []).map((p: any) => ({
             id: p.id,
             name: p.name || '',
             price: Number(p.price || 0),
             rating: Number(p.rating || 5),
             reviews: p.reviews || '0',
             image: p.image || '',
             category: p.category || 'geral',
             prepTime: p.prep_time || '15 min',
             description: p.description || '',
             isVegan: p.is_vegan || false,
             isCombo: p.is_combo || false,
             isHighlighted: p.is_highlighted || false,
             availability: p.availability || 'available',
             inventoryId: p.inventory_id,
             moods: p.moods || [],
             affinityTags: p.affinity_tags || []
          }))
        };
        setCurrentTenant(mappedTenant);
        document.documentElement.style.setProperty('--primary-color', mappedTenant.themeColor);
      }

      // 3. Orders Data
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_slug', storeSlug)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name || 'Cliente',
          customerWhatsapp: o.customer_whatsapp || '',
          items: o.items || [],
          total: Number(o.total || 0),
          type: o.type as OrderType,
          status: o.status as OrderStatus,
          createdAt: new Date(o.created_at),
          tableNumber: o.table_number,
          address: o.address,
          observation: o.observation,
          couponCode: o.coupon_code,
          discountApplied: Number(o.discount_applied || 0),
          userId: o.user_id
        })));
      }

      // 4. Inventory Data
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('tenant_slug', storeSlug);

      if (inventoryData) {
        setInventory(inventoryData.map((i: any) => ({
          id: i.id,
          name: i.name || '',
          currentQty: Number(i.current_qty || 0),
          minQty: Number(i.min_qty || 0),
          unit: i.unit || 'un',
          category: i.category || 'outros',
          costPrice: Number(i.cost_price || 0)
        })));
      }

      // 5. Coupons Data
      const { data: couponsData } = await supabase
        .from('coupons')
        .select('*')
        .eq('tenant_slug', storeSlug)
        .eq('is_active', true);
      
      if (couponsData) {
        setCoupons(couponsData.map((c: any) => ({
          id: c.id,
          code: c.code || '',
          discountValue: Number(c.discount_value || 0),
          maxUses: Number(c.max_uses || 0),
          currentUses: Number(c.current_uses || 0),
          isActive: c.is_active,
          userId: c.user_id,
          customerEmail: c.customer_email,
          customerPhone: c.customer_phone
        })));
      }

    } catch (err) {
      console.error('Erro ao buscar dados do Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    
    if (!getEnv('VITE_SUPABASE_URL')) return;

    const params = new URLSearchParams(window.location.search);
    const storeSlug = params.get('loja') || 'churras-brutus';
    
    const ordersChannel = supabase.channel('orders_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `tenant_slug=eq.${storeSlug}`
      }, () => {
        fetchInitialData();
      })
      .subscribe();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN') fetchInitialData(); 
    });

    return () => { 
      authListener.subscription.unsubscribe();
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
        let result;
        if (authMode === 'signup') result = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        else result = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        
        if (result?.error) throw result.error;
        
        setShowAuthModal(false);
        if (authTarget === 'admin') {
            setIsAdminMode(true);
            setActivePage(Page.DASHBOARD);
        } else if (activePage === Page.CART) {
            setTimeout(() => handlePlaceOrder(pendingCoupon), 500);
        }
    } catch (error: any) {
        alert(error.message || 'Erro na autenticação');
    } finally {
        setAuthLoading(false);
    }
  };

  const handleSelectOrderType = (type: OrderType) => {
    setOrderType(type);
  };

  // Fixed InventoryItem property access (camelCase vs snake_case)
  const handleUpdateInventory = async (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
    if (!currentTenant) return;

    try {
      const dbInventory = newInventory.map(item => {
        const isTemporary = item.id.startsWith('inv-');
        const dbObj: any = {
          tenant_slug: 'churras-brutus',
          name: item.name,
          current_qty: item.currentQty === undefined || item.currentQty === null || (typeof item.currentQty === 'string' && item.currentQty === '') ? 0 : Number(item.currentQty),
          min_qty: item.minQty === undefined || item.minQty === null || (typeof item.minQty === 'string' && item.minQty === '') ? 0 : Number(item.minQty),
          unit: item.unit,
          category: item.category,
          cost_price: item.costPrice === undefined || item.costPrice === null || (typeof item.costPrice === 'string' && item.costPrice === '') ? 0 : Number(item.costPrice)
        };

        if (!isTemporary) {
          dbObj.id = item.id;
        }

        return dbObj;
      });

      const { error } = await supabase.from('inventory').upsert(dbInventory);
      if (error) throw error;
      fetchInitialData();
    } catch (err) {
      console.error("Erro ao sincronizar estoque:", err);
    }
  };

  const handlePlaceOrder = async (appliedCoupon?: Coupon) => {
    if (!currentTenant || cart.length === 0) return;

    if (!user) {
      setAuthTarget('client');
      setPendingCoupon(appliedCoupon);
      setShowAuthModal(true);
      return;
    }
    
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const deliveryFee = orderType === OrderType.DELIVERY ? currentTenant.deliveryFee : 0;
    const discount = (orderType !== OrderType.LOCAL && appliedCoupon) ? appliedCoupon.discountValue : 0;
    const finalTotal = Math.max(0, subtotal + deliveryFee - discount);
    
    const cleanItems = cart.map(item => ({ 
        product_id: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: item.quantity, 
        extras: item.extras, 
        observation: item.itemObservation
    }));

    try {
        const cleanWhatsapp = (userInfo.whatsapp || '').replace(/\D/g, '');
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('tenant_slug', 'churras-brutus')
            .eq('whatsapp', cleanWhatsapp)
            .maybeSingle();

        const customerData = {
            name: userInfo.name || 'Cliente',
            whatsapp: cleanWhatsapp,
            address: userInfo.address || null,
            reference: userInfo.reference || null,
            email: user?.email || null,
            total_orders: existingCustomer ? (existingCustomer.total_orders || 0) + 1 : 1,
            total_spent: existingCustomer ? (existingCustomer.total_spent || 0) + finalTotal : finalTotal,
            last_order_date: new Date().toISOString(),
            user_id: user?.id || null,
            tenant_slug: 'churras-brutus'
        };

        if (existingCustomer) {
            await supabase.from('customers').update(customerData).eq('id', existingCustomer.id);
        } else {
            await supabase.from('customers').insert([customerData]);
        }
    } catch (err) {
        console.error("Erro ao sincronizar CRM:", err);
    }

    const { data: orderResponse, error } = await supabase.from('orders').insert([{ 
      tenant_slug: 'churras-brutus', 
      customer_name: userInfo.name || 'Cliente', 
      customer_whatsapp: userInfo.whatsapp || '', 
      items: cleanItems, 
      total: finalTotal, 
      type: orderType, 
      status: 'pending', 
      table_number: userInfo.tableNumber || null, 
      address: userInfo.address || null, 
      reference: userInfo.reference || null,
      observation: userInfo.observation || null, 
      coupon_code: (orderType !== OrderType.LOCAL && appliedCoupon) ? appliedCoupon.code : null, 
      discount_applied: discount, 
      user_id: user?.id || null
    }]).select('order_number').single();

    if (error) { 
        alert(`Erro ao criar pedido: ${error.message}.`); 
        return; 
    }

    try {
        for (const item of cart) {
            if (item.inventoryId) {
                const { data: invData } = await supabase
                    .from('inventory')
                    .select('current_qty')
                    .eq('id', item.inventoryId)
                    .single();
                
                if (invData) {
                    await supabase
                        .from('inventory')
                        .update({ current_qty: Math.max(0, invData.current_qty - item.quantity) })
                        .eq('id', item.inventoryId);
                }
            }
        }
    } catch (stockErr) {
        console.error("Erro ao baixar estoque:", stockErr);
    }
    
    if (appliedCoupon && orderType !== OrderType.LOCAL) {
      await supabase.from('coupons').update({ current_uses: (appliedCoupon.currentUses || 0) + 1 }).eq('id', appliedCoupon.id);
    }
    
    setCart([]);
    setPendingCoupon(undefined);
    setActivePage(Page.HOME);
    alert(`Pedido #${orderResponse.order_number} enviado com sucesso! Você pode acompanhar o status no seu perfil.`);
  };

  // If Supabase is missing, we show an informative message but allow the skeletal structure to load
  if (!getEnv('VITE_SUPABASE_URL')) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
                <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Ambiente em Configuração</h1>
            <p className="text-gray-500 text-sm max-w-xs mb-8">
                As chaves do Supabase não foram encontradas. Por favor, configure as variáveis de ambiente <code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_URL</code> e <code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
            </p>
            <div className="flex gap-4">
               <button onClick={() => window.location.reload()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Tentar Novamente</button>
            </div>
        </div>
    );
  }

  if (loading && !currentTenant) return <SkeletonLoader />;
  if (!currentTenant) return <div className="min-h-screen flex items-center justify-center text-gray-900 bg-white p-10 text-center font-bold">Loja não encontrada ou erro de conexão.</div>;

  return (
    <div className={`w-full ${isAdminMode ? '' : 'max-w-md mx-auto'} h-screen relative flex flex-col transition-all duration-500 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      
      {showAuthModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm backdrop-blur-sm">
           <div className="relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl bg-white border border-gray-100">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900"><X size={20} /></button>
              <div className="p-8">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${authTarget === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                    {authTarget === 'admin' ? <Lock size={32} /> : <Gift size={32} />}
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight mb-2 text-gray-900">
                    {authTarget === 'admin' ? 'Acesso Restrito' : 'Clube de Vantagens'}
                  </h2>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                    {authTarget === 'client' ? 'Identifique-se para finalizar seu pedido' : 'Somente administradores'}
                  </p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="E-mail" className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 text-gray-900 focus:outline-none focus:border-primary" />
                  <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Senha" className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 text-gray-900 focus:outline-none focus:border-primary" />
                  <button disabled={authLoading} className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                    {authLoading ? <Loader2 size={18} className="animate-spin" /> : (authMode === 'login' ? 'Entrar' : 'Cadastrar')}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-primary transition-colors"
                  >
                    {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* NOVO ONBOARDING VISUAL */}
      {!isAdminMode && orderType === OrderType.UNSET && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden animate-in fade-in duration-700">
          
          {/* FOOD GRID BACKGROUND */}
          <div className="absolute inset-0 grid grid-cols-3 gap-1 opacity-60">
             {foodImages.map((src, idx) => (
               <div key={idx} className="h-full w-full overflow-hidden">
                 <img src={src} className="h-full w-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-1000" />
               </div>
             ))}
          </div>

          {/* GRADIENT OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

          {/* CONTENT */}
          <div className="relative h-full flex flex-col items-center justify-between py-20 px-8 text-center">
            
            {/* GATILHO SUTIL PARA ADMIN (TOP RIGHT) */}
            <button 
              onClick={() => { setAuthTarget('admin'); setShowAuthModal(true); }}
              className="absolute top-8 right-8 z-[110] p-4 text-white/5 hover:text-white/20 transition-all active:scale-95"
              title="Admin"
            >
              <Lock size={14} />
            </button>

            <div className="mt-auto mb-10 space-y-6">
                <div className="space-y-1">
                  <h1 className="font-display font-black text-4xl text-white uppercase tracking-[0.15em] drop-shadow-2xl">
                    Churras<br/><span className="text-primary">Brutus</span>
                  </h1>
                  <div className="w-12 h-1 bg-primary mx-auto rounded-full mt-4" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Choose your meal!</h2>
                  <p className="text-gray-400 text-xs font-bold leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest opacity-80">
                    O melhor churrasco da região em apenas alguns toques.
                  </p>
                </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="w-full space-y-4 max-w-[280px]">
              <button 
                onClick={() => handleSelectOrderType(OrderType.LOCAL)} 
                className="group w-full h-14 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95"
              >
                <Utensils size={16} /> Estou no Local
              </button>

              <button 
                onClick={() => handleSelectOrderType(OrderType.DELIVERY)} 
                className="group w-full h-14 bg-primary text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-primary/30 hover:bg-orange-600 transition-all active:scale-95"
              >
                Pedir Delivery <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {(orderType !== OrderType.UNSET || isAdminMode) && (
        <main className="flex-1 overflow-y-auto hide-scrollbar">
            {activePage === Page.HOME && <Home onSelectProduct={(p) => { setSelectedProduct(p); setActivePage(Page.DETAILS); }} tenant={currentTenant} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} coupons={coupons} user={user} orderType={orderType} />}
            {activePage === Page.DETAILS && selectedProduct && <ProductDetails isDarkMode={isDarkMode} product={selectedProduct} onBack={() => setActivePage(Page.HOME)} onAddToCart={(p, q, ex, obs) => { setCart([...cart, {...p, quantity: q, extras: ex, itemObservation: obs}]); setActivePage(Page.CART); }} isFavorite={isFavorite(selectedProduct.id)} toggleFavorite={() => toggleFavorite(selectedProduct.id)} />}
            {activePage === Page.CART && <Cart isDarkMode={isDarkMode} items={cart} orderType={orderType} userInfo={userInfo} setUserInfo={setUserInfo} onUpdateQuantity={(id, d) => setCart(prev => prev.map(i => i.id === id ? {...i, quantity: Math.max(0, i.quantity + d)} : i).filter(i => i.quantity > 0))} onBack={() => setActivePage(Page.HOME)} tenant={currentTenant} onSelectProduct={(p) => { setSelectedProduct(p); setActivePage(Page.DETAILS); }} onCheckout={handlePlaceOrder} coupons={coupons} user={user} />}
            {activePage === Page.ALERTS && <Alerts isDarkMode={isDarkMode} orderType={orderType} onBack={() => setActivePage(Page.HOME)} />}
            {activePage === Page.FAVOURITE && <Favourite isDarkMode={isDarkMode} tenant={currentTenant} favorites={favorites} toggleFavorite={toggleFavorite} onSelectProduct={(p) => { setSelectedProduct(p); setActivePage(Page.DETAILS); }} onBack={() => setActivePage(Page.HOME)} />}
            {activePage === Page.PROFILE && <Profile isDarkMode={isDarkMode} orderType={orderType} setOrderType={setOrderType} tenant={currentTenant} orders={orders} userInfo={userInfo} setUserInfo={setUserInfo} user={user} />}
            {activePage === Page.DASHBOARD && <Dashboard tenant={currentTenant} orders={orders} inventory={inventory} coupons={coupons} updateOrderStatus={async (id, s) => { await supabase.from('orders').update({status: s}).eq('id', id); fetchInitialData(); }} onUpdateInventory={handleUpdateInventory} onSaveCoupon={async (c) => { 
                const dbCoupon = {
                    id: c.id.startsWith('cp-') ? undefined : c.id,
                    tenant_slug: 'churras-brutus',
                    code: c.code,
                    discount_value: c.discountValue,
                    max_uses: c.maxUses,
                    current_uses: c.currentUses,
                    is_active: c.isActive,
                    user_id: c.userId || null,
                    customer_email: c.customer_email || null,
                    customer_phone: c.customer_phone || null
                };
                await supabase.from('coupons').upsert(dbCoupon); 
                fetchInitialData(); 
            }} onDeleteCoupon={async (id) => { await supabase.from('coupons').delete().eq('id', id); fetchInitialData(); }} onBack={() => {setIsAdminMode(false); setOrderType(OrderType.UNSET); setActivePage(Page.HOME);}} onUpdateTenant={setCurrentTenant} />}
        </main>
      )}

      {!isAdminMode && activePage !== Page.DETAILS && orderType !== OrderType.UNSET && (
        <BottomNav activeTab={activePage} onTabChange={(page) => { if (page === Page.PROFILE && !user) { setAuthTarget('client'); setShowAuthModal(true); } else setActivePage(page); }} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} isDarkMode={isDarkMode} />
      )}
    </div>
  );
};

export default App;