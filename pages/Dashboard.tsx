
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Boxes, Settings, ShoppingBag, Package, Wallet, Users, Ticket, LogOut, User as UserIcon } from 'lucide-react';
import { Tenant, Order, OrderStatus, InventoryItem, DREHistoryItem, Coupon, WasteRecord } from '../types';
import { supabase } from '../supabaseClient';
import { useDashboardLogic } from '../hooks/useDashboardLogic';

// Subcomponents
import DashboardOverview from '../components/dashboard/DashboardOverview';
import DashboardOrders from '../components/dashboard/DashboardOrders';
import DashboardMenu from '../components/dashboard/DashboardMenu';
import DashboardInventory from '../components/dashboard/DashboardInventory';
import DashboardCustomers from '../components/dashboard/DashboardCustomers';
import DashboardPromos from '../components/dashboard/DashboardPromos';
import DashboardFinance from '../components/dashboard/DashboardFinance';
import DashboardSettings from '../components/dashboard/DashboardSettings';

interface DashboardProps {
  tenant: Tenant;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  inventory: InventoryItem[];
  coupons: Coupon[];
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onSaveCoupon: (coupon: Coupon) => void;
  onDeleteCoupon: (id: string) => void;
  onBack: () => void;
  onUpdateTenant: (tenant: Tenant) => void;
}

const navItems = [
  { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={16} /> },
  { id: 'pedidos', label: 'Pedidos (KDS)', icon: <ShoppingBag size={16} /> },
  { id: 'cardapio', label: 'Cardápio', icon: <Boxes size={16} /> },
  { id: 'estoque', label: 'Estoque', icon: <Package size={16} /> },
  { id: 'clientes', label: 'Clientes', icon: <Users size={16} /> },
  { id: 'promocoes', label: 'Promoções', icon: <Ticket size={16} /> },
  { id: 'dre', label: 'Financeiro', icon: <Wallet size={16} /> },
  { id: 'ajustes', label: 'Ajustes', icon: <Settings size={16} /> },
];

type Section = 'relatorios' | 'cardapio' | 'pedidos' | 'estoque' | 'dre' | 'ajustes' | 'clientes' | 'promocoes';

const Dashboard: React.FC<DashboardProps> = ({ 
  tenant, orders, setOrders, inventory, coupons, updateOrderStatus, onUpdateInventory, onSaveCoupon, onDeleteCoupon, onBack, onUpdateTenant 
}) => {
  const [activeSection, setActiveSection] = useState<Section>('relatorios');
  const [financePeriod, setFinancePeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [now, setNow] = useState(new Date());
  const [manualTransactions, setManualTransactions] = useState<any[]>([]);
  const [fixedCostsDetails, setFixedCostsDetails] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<{avatar_url?: string, full_name?: string} | null>(null);

  useEffect(() => {
    fetchAdminProfile();
    updateDatesFromPeriod('month');
    const timer = setInterval(() => setNow(new Date()), 10000); 
    return () => clearInterval(timer);
  }, []);

  const fetchAdminProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (data) setAdminProfile(data);
    }
  };

  const updateDatesFromPeriod = (period: 'today' | 'week' | 'month' | 'year' | 'custom') => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    setEndDate(formatDate(today));
    let start = new Date();
    if (period === 'today') {} 
    else if (period === 'week') start.setDate(today.getDate() - 7);
    else if (period === 'month') start.setDate(today.getDate() - 30);
    else if (period === 'year') start = new Date(today.getFullYear(), 0, 1);
    else return; 
    setStartDate(formatDate(start));
  };

  const { customerKPIs, chartData, dreCalculations } = useDashboardLogic(
    orders, inventory, tenant, financePeriod, startDate, endDate, manualTransactions, fixedCostsDetails, null, []
  );

  const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);

  return (
    <div className="flex h-screen w-screen bg-[#09090B] overflow-hidden font-sans text-gray-400 selection:bg-primary/30">
      {/* Sidebar - Escala 80% */}
      <aside className="w-52 bg-[#09090B] border-r border-[#1F1F23] flex flex-col flex-shrink-0 z-[50] transition-all">
        <div className="flex items-center justify-center bg-[#09090B] px-3 py-6">
          <img src="https://i.postimg.cc/Wbfzdjgy/LOGO-CHURRAS-BRUTUS.png" alt="Brutus Admin" className="h-20 w-auto object-contain transition-transform hover:scale-105" />
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto hide-scrollbar">
          {navItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveSection(item.id as Section)} 
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 group ${activeSection === item.id ? 'bg-primary text-white shadow-lg shadow-primary/10 translate-x-1' : 'text-gray-400 hover:bg-[#1F1F23] hover:text-white'}`}
            >
              <div className={`transition-colors ${activeSection === item.id ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{item.icon}</div>
              <span className="uppercase tracking-widest">{item.label}</span>
              {item.id === 'pedidos' && pendingOrdersCount > 0 && (<span className="ml-auto bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-md animate-pulse font-black">{pendingOrdersCount}</span>)}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1F1F23]">
          <button onClick={onBack} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[#1F1F23] text-[9px] font-black text-gray-500 hover:text-white hover:bg-[#1F1F23] transition-colors uppercase tracking-[0.2em]"><LogOut size={14} /> Sair</button>
        </div>
      </aside>

      {/* Main Content area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-[60px] border-b border-[#1F1F23] flex items-center justify-between px-6 flex-shrink-0 bg-[#09090B]/90 backdrop-blur-xl sticky top-0 z-[45]">
           <div className="flex items-center gap-4">
              <h1 className="text-base font-black tracking-tight text-white uppercase">
                {activeSection === 'relatorios' ? 'Visão Geral' : activeSection === 'pedidos' ? 'Cozinha (KDS)' : activeSection === 'dre' ? 'Financeiro' : activeSection}
              </h1>
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Real-time Ativo</span>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex flex-col items-end mr-1">
                 <span className="text-[9px] font-black text-white uppercase tracking-wider">{tenant.name}</span>
                 <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Administrador</span>
              </div>
              <div className="w-9 h-9 rounded-xl border border-white/10 overflow-hidden bg-[#161618] flex items-center justify-center relative">
                 {adminProfile?.avatar_url ? (
                    <img src={adminProfile.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                 ) : (
                    <UserIcon size={18} className="text-gray-600" />
                 )}
              </div>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-5 scroll-smooth hide-scrollbar">
            {activeSection === 'relatorios' && (<DashboardOverview orders={orders} financePeriod={financePeriod} setFinancePeriod={setFinancePeriod} dreCalculations={dreCalculations} chartData={chartData} handleExportCSV={() => {}} />)}
            {activeSection === 'pedidos' && <DashboardOrders orders={orders} setOrders={setOrders} updateOrderStatus={updateOrderStatus} now={now} tenant={tenant} />}
            {activeSection === 'cardapio' && <DashboardMenu tenant={tenant} inventory={inventory} onUpdateTenant={onUpdateTenant} />}
            {activeSection === 'estoque' && <DashboardInventory inventory={inventory} onUpdateInventory={onUpdateInventory} />}
            {activeSection === 'clientes' && <DashboardCustomers customerKPIs={customerKPIs} tenant={tenant} coupons={coupons} onSaveCoupon={onSaveCoupon} />}
            {activeSection === 'promocoes' && <DashboardPromos coupons={coupons} onSaveCoupon={onSaveCoupon} onDeleteCoupon={onDeleteCoupon} tenant={tenant} couponStats={{}} />}
            {activeSection === 'dre' && (<DashboardFinance dreCalculations={dreCalculations} manualTransactions={manualTransactions} setManualTransactions={setManualTransactions} onCloseMonth={() => {}} tenant={tenant} fixedCostsDetails={fixedCostsDetails} setFixedCostsDetails={setFixedCostsDetails} orders={orders} inventory={inventory} financePeriod={financePeriod} setFinancePeriod={setFinancePeriod} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />)}
            {activeSection === 'ajustes' && <DashboardSettings tenant={tenant} onUpdateTenant={onUpdateTenant} onUpdateProfile={fetchAdminProfile} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
