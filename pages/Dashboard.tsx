
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Boxes, 
  Settings, 
  ShoppingBag,
  Package,
  Wallet,
  Users,
  Ticket,
  LogOut
} from 'lucide-react';
import { Tenant, Order, OrderStatus, InventoryItem, DREHistoryItem, Coupon, PrinterSettings, WasteRecord } from '../types';
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
  { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={18} /> },
  { id: 'pedidos', label: 'Pedidos (KDS)', icon: <ShoppingBag size={18} /> },
  { id: 'cardapio', label: 'Cardápio', icon: <Boxes size={18} /> },
  { id: 'estoque', label: 'Estoque', icon: <Package size={18} /> },
  { id: 'clientes', label: 'Clientes', icon: <Users size={18} /> },
  { id: 'promocoes', label: 'Promoções', icon: <Ticket size={18} /> },
  { id: 'dre', label: 'Financeiro', icon: <Wallet size={18} /> },
  { id: 'ajustes', label: 'Ajustes', icon: <Settings size={18} /> },
];

type Section = 'relatorios' | 'cardapio' | 'pedidos' | 'estoque' | 'dre' | 'ajustes' | 'clientes' | 'promocoes';

const Dashboard: React.FC<DashboardProps> = ({ 
  tenant, orders, inventory, coupons, updateOrderStatus, onUpdateInventory, onSaveCoupon, onDeleteCoupon, onBack, onUpdateTenant 
}) => {
  const [activeSection, setActiveSection] = useState<Section>('relatorios');
  
  // Estado de Datas
  const [financePeriod, setFinancePeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [now, setNow] = useState(new Date());
  
  const [manualTransactions, setManualTransactions] = useState<any[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [dreHistory, setDreHistory] = useState<DREHistoryItem[]>([]);
  const [fixedCostsDetails, setFixedCostsDetails] = useState<any[]>([]);
  const [financeGoal, setFinanceGoal] = useState({ type: 'breakeven', targetValue: 0 });

  // Load local storage data (Apenas waste e goal, o resto foi para o Supabase)
  useEffect(() => {
    const savedWaste = localStorage.getItem('churrasco_waste');
    const savedGoal = localStorage.getItem('churrasco_finance_goal');
    
    if (savedWaste) setWasteRecords(JSON.parse(savedWaste));
    if (savedGoal) setFinanceGoal(JSON.parse(savedGoal));
    
    updateDatesFromPeriod('month');
  }, []);

  useEffect(() => {
    localStorage.setItem('churrasco_waste', JSON.stringify(wasteRecords));
    localStorage.setItem('churrasco_finance_goal', JSON.stringify(financeGoal));
  }, [wasteRecords, financeGoal]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000); 
    return () => clearInterval(timer);
  }, []);

  const updateDatesFromPeriod = (period: 'today' | 'week' | 'month' | 'year' | 'custom') => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setEndDate(formatDate(today));

    let start = new Date();
    if (period === 'today') {
    } else if (period === 'week') {
        start.setDate(today.getDate() - 7);
    } else if (period === 'month') {
        start.setDate(today.getDate() - 30);
    } else if (period === 'year') {
        start = new Date(today.getFullYear(), 0, 1);
    } else {
        return; 
    }
    setStartDate(formatDate(start));
  };

  const handlePeriodChange = (period: 'today' | 'week' | 'month' | 'year' | 'custom') => {
      setFinancePeriod(period);
      updateDatesFromPeriod(period);
  };

  const fetchFinancialHistory = async () => {
    try {
       const { data } = await supabase
         .from('financial_snapshots')
         .select('*')
         .eq('tenant_slug', tenant.slug)
         .order('year', { ascending: false })
         .order('month', { ascending: false })
         .limit(12);

       if (data && data.length > 0) {
         const mappedHistory: DREHistoryItem[] = data.map((item: any) => {
           const date = new Date(item.year, item.month - 1);
           const periodName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
           return {
             period: periodName.charAt(0).toUpperCase() + periodName.slice(1),
             revenue: item.revenue,
             cmv: item.cmv,
             fixedCosts: item.fixed_costs,
             netProfit: item.net_profit,
             margin: item.margin
           };
         });
         setDreHistory(mappedHistory);
       }
    } catch (err) {
       console.error("Erro ao buscar histórico financeiro", err);
    }
  };

  useEffect(() => {
    if (activeSection === 'dre') {
      fetchFinancialHistory();
    }
  }, [activeSection, tenant.slug]);

  const { customers, customerKPIs, chartData, dreCalculations } = useDashboardLogic(
    orders, inventory, tenant, financePeriod, startDate, endDate, manualTransactions, fixedCostsDetails, financeGoal, dreHistory
  );

  const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Cliente', 'Tipo', 'Total', 'Data', 'Status'];
    const rows = orders.map(o => [
        o.id, 
        o.customerName, 
        o.type === 'delivery' ? 'Delivery' : 'Mesa', 
        o.total.toFixed(2), 
        new Date(o.createdAt).toLocaleDateString(), 
        o.status
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const couponStats = useMemo(() => {
      const stats: Record<string, { revenue: number, count: number }> = {};
      orders.forEach(order => {
          if (order.couponCode) {
              if (!stats[order.couponCode]) stats[order.couponCode] = { revenue: 0, count: 0 };
              stats[order.couponCode].revenue += order.total;
              stats[order.couponCode].count += 1;
          }
      });
      return stats;
  }, [orders]);

  const renderTopBar = () => (
    <header className="h-[72px] border-b border-[#1F1F23] flex items-center justify-between px-8 flex-shrink-0 bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-50">
       <div className="flex items-center gap-4">
         <h1 className="text-xl font-bold tracking-tight text-white capitalize">
           {activeSection === 'relatorios' ? 'Visão Geral' : 
            activeSection === 'dre' ? 'Gestão Financeira' : activeSection}
         </h1>
       </div>
    </header>
  );

  return (
    <div className="flex h-screen w-screen bg-[#09090B] overflow-hidden font-sans text-gray-400 selection:bg-primary/30">
      <aside className="w-64 bg-[#09090B] border-r border-[#1F1F23] flex flex-col flex-shrink-0 z-20">
        <div className="flex items-center justify-center bg-[#09090B] px-4 py-8">
          <img src="https://i.postimg.cc/Wbfzdjgy/LOGO-CHURRAS-BRUTUS.png" alt="Brutus Admin" className="h-32 w-auto object-contain transition-transform hover:scale-105" />
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group ${
                activeSection === item.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/10 translate-x-1' 
                  : 'text-gray-400 hover:bg-[#1F1F23] hover:text-white'
              }`}
            >
              <div className={`transition-colors ${activeSection === item.id ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
                {item.icon}
              </div>
              <span className="uppercase tracking-wide">{item.label}</span>
              {item.id === 'pedidos' && pendingOrdersCount > 0 && (
                 <span className="ml-auto bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-md animate-pulse">{pendingOrdersCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#1F1F23]">
          <button 
            onClick={onBack}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-[#1F1F23] text-xs font-bold text-gray-400 hover:text-white hover:bg-[#1F1F23] transition-colors uppercase tracking-wider"
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {renderTopBar()}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
            {activeSection === 'relatorios' && (
              <DashboardOverview 
                orders={orders} 
                financePeriod={financePeriod} 
                setFinancePeriod={handlePeriodChange} 
                dreCalculations={dreCalculations}
                chartData={chartData}
                handleExportCSV={handleExportCSV}
              />
            )}
            {activeSection === 'pedidos' && <DashboardOrders orders={orders} updateOrderStatus={updateOrderStatus} now={now} tenant={tenant} />}
            {activeSection === 'cardapio' && <DashboardMenu tenant={tenant} inventory={inventory} onUpdateTenant={onUpdateTenant} />}
            {activeSection === 'estoque' && <DashboardInventory inventory={inventory} onUpdateInventory={onUpdateInventory} />}
            {activeSection === 'clientes' && <DashboardCustomers customers={customers} customerKPIs={customerKPIs} tenant={tenant} coupons={coupons} onSaveCoupon={onSaveCoupon} />}
            {activeSection === 'promocoes' && <DashboardPromos coupons={coupons} onSaveCoupon={onSaveCoupon} onDeleteCoupon={onDeleteCoupon} tenant={tenant} couponStats={couponStats} />}
            {activeSection === 'dre' && (
              <DashboardFinance 
                dreCalculations={dreCalculations} 
                manualTransactions={manualTransactions} 
                setManualTransactions={setManualTransactions}
                onCloseMonth={() => fetchFinancialHistory()} 
                tenant={tenant}
                fixedCostsDetails={fixedCostsDetails}
                setFixedCostsDetails={setFixedCostsDetails}
                orders={orders}
                inventory={inventory}
                financePeriod={financePeriod}
                setFinancePeriod={handlePeriodChange}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
              />
            )}
            {activeSection === 'ajustes' && <DashboardSettings tenant={tenant} onUpdateTenant={onUpdateTenant} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
