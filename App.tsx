
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
import { Bike, Utensils, Lock, X, Mail, Key, Loader2, Gift, ChevronRight, Shield, Clock, ArrowRight } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useFavorites } from './hooks/useFavorites';

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
  
  // Persistência de Tipo de Pedido e Modo Admin
  const [orderType, setOrderType] = useState<OrderType>(() => {
    return (localStorage.getItem('brutus_order_type') as OrderType) || OrderType.UNSET;
  });
  
  const [isAdminMode, setIsAdminMode] = useState(() => {
    return localStorage.getItem('brutus_admin_mode') === 'true';
  });

  const [userInfo, setUserInfo] = useState<UserInfo>(() => {
    const saved = localStorage.getItem('brutus_user_info');
    return saved ? JSON.parse(saved) : { name: '', whatsapp: '', address: '', reference: '', tableNumber: '' };
  });

  // Estado para rastrear pedido ativo (Anônimo ou Logado)
  const [activeOrderTracking, setActiveOrderTracking] = useState<{id: string, number: string, status: string} | null>(() => {
    const saved = localStorage.getItem('brutus_active_order');
    return saved ? JSON.parse(saved) : null;
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
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
    "https://i.postimg.cc/Y96YJf8h/1.jpg", "https://i.postimg.cc/brqk8DBf/2.jpg", "https://i.postimg.cc/nrT7LFys/3.jpg",
    "https://i.postimg.cc/dQ9G66hM/4.jpg", "https://i.postimg.cc/7YY0Wzzn/5.jpg", "https://i.postimg.cc/4xYtJTwS/6.jpg",
    "https://i.postimg.cc/MpnRW8dX/7.jpg", "https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1593504049359-74330189a355?q=80&w=400&auto=format&fit=crop"
  ];

  // Efeito para persistência
  useEffect(() => {
    localStorage.setItem('brutus_order_type', orderType);
  }, [orderType]);

  useEffect(() => {
    localStorage.setItem('brutus_admin_mode', String(isAdminMode));
    if (isAdminMode) setActivePage(Page.DASHBOARD);
  }, [isAdminMode]);

  useEffect(() => {
    localStorage.setItem('brutus_user_info', JSON.stringify(userInfo));
  }, [userInfo]);

  // Monitoramento do Pedido Ativo no Celular do Cliente
  useEffect(() => {
    if (activeOrderTracking) {
      localStorage.setItem('brutus_active_order', JSON.stringify(activeOrderTracking));
      
      // Inscreve para ouvir mudanças especificamente DESTE pedido
      const channel = supabase.channel(`tracking_${activeOrderTracking.id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `id=eq.${activeOrderTracking.id}` 
        }, (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'finished' || newStatus === 'canceled') {
            console.log('Pedido concluído/cancelado. Limpando tracking.');
            localStorage.removeItem('brutus_active_order');
            setActiveOrderTracking(null);
          } else {
            setActiveOrderTracking(prev => prev ? { ...prev, status: newStatus } : null);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeOrderTracking]);

  const fetchInitialData = async () => {
    const params = new URLSearchParams(window.location.search);
    const storeSlug = params.get('loja') || 'churras-brutus';

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // 1. Tenant Data
      const { data: tenantData } = await supabase.from('tenants').select('*').eq('slug', storeSlug).maybeSingle();
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
          products: [] // Preenchido abaixo
        };

        const { data: productsData } = await supabase.from('products').select('*').eq('tenant_slug', storeSlug);
        mappedTenant.products = (productsData || []).map((p: any) => ({
             id: p.id, name: p.name, price: Number(p.price), rating: Number(p.rating || 5), reviews: p.reviews || '0',
             image: p.image, category: p.category, prepTime: p.prep_time, description: p.description,
             isVegan: p.is_vegan, isCombo: p.is_combo, isHighlighted: p.is_highlighted, availability: p.availability,
             inventoryId: p.inventory_id
        }));

        setCurrentTenant(mappedTenant);
        document.documentElement.style.setProperty('--primary-color', mappedTenant.themeColor);
      }

      // 2. Orders (Só traz do banco os do usuário logado se não for admin)
      const ordersQuery = supabase.from('orders').select('*').eq('tenant_slug', storeSlug).order('created_at', { ascending: false });
      if (!isAdminMode && currentUser) ordersQuery.eq('user_id', currentUser.id);
      
      const { data: ordersData } = await ordersQuery;
      if (ordersData) {
        setOrders(ordersData.map((o: any) => ({
          id: o.id, orderNumber: o.order_number, customerName: o.customer_name, customerWhatsapp: o.customer_whatsapp,
          items: o.items, total: Number(o.total), type: o.type as OrderType, status: o.status as OrderStatus,
          createdAt: new Date(o.created_at), tableNumber: o.table_number, address: o.address, userId: o.user_id
        })));
      }

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchInitialData();
  }, [isAdminMode]);

  const handlePlaceOrder = async (appliedCoupon?: Coupon) => {
    if (!currentTenant || cart.length === 0) return;

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const deliveryFee = orderType === OrderType.DELIVERY ? currentTenant.deliveryFee : 0;
    const discount = (orderType !== OrderType.LOCAL && appliedCoupon) ? appliedCoupon.discountValue : 0;
    const finalTotal = Math.max(0, subtotal + deliveryFee - discount);
    
    const cleanItems = cart.map(item => ({ 
        product_id: item.id, name: item.name, price: item.price, quantity: item.quantity, observation: item.itemObservation
    }));

    const { data: orderResponse, error } = await supabase.from('orders').insert([{ 
      tenant_slug: 'churras-brutus', 
      customer_name: userInfo.name || 'Cliente Anônimo', 
      customer_whatsapp: userInfo.whatsapp || '', 
      items: cleanItems, 
      total: finalTotal, 
      type: orderType, 
      status: 'pending', 
      table_number: userInfo.tableNumber || null, 
      address: userInfo.address || null, 
      user_id: user?.id || null
    }]).select('*').single();

    if (error) { alert(`Erro: ${error.message}`); return; }

    // Salvar tracking do pedido no localStorage para usuários anônimos
    setActiveOrderTracking({
        id: orderResponse.id,
        number: orderResponse.order_number,
        status: orderResponse.status
    });

    setCart([]);
    setPendingCoupon(undefined);
    setActivePage(Page.HOME);
    alert(`Pedido #${orderResponse.order_number} enviado! Acompanhe o status no topo do cardápio.`);
  };

  /**
   * Fix: Added handleSelectOrderType to resolve reference error in the banner.
   */
  const handleSelectOrderType = (type: OrderType) => {
    setOrderType(type);
  };

  /**
   * Fix: Added handleUpdateInventory to resolve reference error in Dashboard component.
   */
  const handleUpdateInventory = (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
  };

  /**
   * Fix: Added handleAuth to resolve reference error in login form.
   */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        
        if (authTarget === 'admin') {
          setIsAdminMode(true);
          setActivePage(Page.DASHBOARD);
        }
      }
    } catch (err: any) {
      alert(`Erro na autenticação: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading && !currentTenant) return <SkeletonLoader />;
  if (!currentTenant) return <div className="min-h-screen flex items-center justify-center">Erro ao carregar loja.</div>;

  return (
    <div className={`w-full ${isAdminMode ? '' : 'max-w-md mx-auto'} h-screen relative flex flex-col transition-all duration-500 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      
      {/* Banner de Pedido Ativo (Apenas para Clientes) */}
      {!isAdminMode && activeOrderTracking && activePage === Page.HOME && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[110] animate-in slide-in-from-top duration-500">
           <button 
             onClick={() => setActivePage(Page.PROFILE)}
             className="w-full bg-primary text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between group active:scale-95 transition-all"
           >
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                   <Clock size={20} />
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Pedido em andamento</p>
                   <p className="text-sm font-bold tracking-tight">#{activeOrderTracking.number} • Status: {
                     activeOrderTracking.status === 'pending' ? 'Novo' : 
                     activeOrderTracking.status === 'preparing' ? 'Preparando' : 
                     activeOrderTracking.status === 'ready_to_send' ? 'Pronto' : activeOrderTracking.status
                   }</p>
                </div>
             </div>
             <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="relative w-full max-w-sm rounded-[32px] overflow-hidden bg-white border border-gray-100 p-8">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"><X size={20} /></button>
              <h2 className="text-2xl font-black uppercase text-center mb-6">{authTarget === 'admin' ? 'Dashboard' : 'Login'}</h2>
              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="E-mail" className="w-full h-12 px-4 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:border-primary" />
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Senha" className="w-full h-12 px-4 rounded-xl border bg-gray-50 text-gray-900 focus:outline-none focus:border-primary" />
                <button disabled={authLoading} className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                  {authLoading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
                </button>
              </form>
           </div>
        </div>
      )}

      {!isAdminMode && orderType === OrderType.UNSET && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden animate-in fade-in duration-700">
          <div className="absolute inset-0 grid grid-cols-3 gap-1 opacity-60">
             {foodImages.map((src, idx) => ( <div key={idx} className="h-full w-full overflow-hidden"> <img src={src} className="h-full w-full object-cover grayscale-[20%]" /> </div> ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="relative h-full flex flex-col items-center justify-between py-20 px-8 text-center">
            <button onClick={() => { setAuthTarget('admin'); setShowAuthModal(true); }} className="absolute top-8 right-8 text-white/5 hover:text-white/20"><Lock size={14} /></button>
            <div className="mt-auto mb-10 space-y-6">
                <h1 className="font-display font-black text-4xl text-white uppercase tracking-[0.15em]">Churras<br/><span className="text-primary">Brutus</span></h1>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">O melhor churrasco!</h2>
            </div>
            <div className="w-full space-y-4 max-w-[280px]">
              <button onClick={() => handleSelectOrderType(OrderType.LOCAL)} className="w-full h-14 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"> <Utensils size={16} /> Estou no Local </button>
              <button onClick={() => handleSelectOrderType(OrderType.DELIVERY)} className="w-full h-14 bg-primary text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-primary/30"> Pedir Delivery <ChevronRight size={16} /> </button>
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
            {activePage === Page.DASHBOARD && <Dashboard tenant={currentTenant} orders={orders} inventory={inventory} coupons={coupons} updateOrderStatus={async (id, s) => { await supabase.from('orders').update({status: s}).eq('id', id); fetchInitialData(); }} onUpdateInventory={handleUpdateInventory} onSaveCoupon={async (c) => { await supabase.from('coupons').upsert(c); fetchInitialData(); }} onDeleteCoupon={async (id) => { await supabase.from('coupons').delete().eq('id', id); fetchInitialData(); }} onBack={() => {setIsAdminMode(false); setOrderType(OrderType.UNSET); setActivePage(Page.HOME);}} onUpdateTenant={setCurrentTenant} />}
        </main>
      )}

      {!isAdminMode && activePage !== Page.DETAILS && orderType !== OrderType.UNSET && (
        <BottomNav activeTab={activePage} onTabChange={(page) => { if (page === Page.PROFILE && !user && !activeOrderTracking) { setAuthTarget('client'); setShowAuthModal(true); } else setActivePage(page); }} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} isDarkMode={isDarkMode} />
      )}
    </div>
  );
};

export default App;
