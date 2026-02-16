
import React, { useState, useEffect, useRef } from 'react';
import { Bike, Utensils, Search, Clock, Check, AlertTriangle, Flame, CheckCircle2, Archive, ShoppingBag, XCircle, Printer, Loader2, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Order, OrderStatus, Tenant } from '../../types';
import { supabase } from '../../supabaseClient';

interface DashboardOrdersProps {
  orders: Order[];
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  now: Date;
  tenant: Tenant;
}

const DashboardOrders: React.FC<DashboardOrdersProps> = ({ orders = [], updateOrderStatus, now, tenant }) => {
  const [orderFilter, setOrderFilter] = useState<'all' | 'delivery' | 'local'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Persistência de Som conforme solicitado: soundEnabled no localStorage
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    return localStorage.getItem('soundEnabled') === 'true'; 
  });
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [recentOrderIds, setRecentOrderIds] = useState<Set<string>>(new Set());

  const [checkedItems, setCheckedItems] = useState<Record<string, Record<number, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('kds_checked_items');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();
  }, []);

  useEffect(() => {
    localStorage.setItem('soundEnabled', String(isAudioEnabled));
  }, [isAudioEnabled]);

  // Monitoramento Realtime
  useEffect(() => {
    const channel = supabase.channel('kds_realtime_v2')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: `tenant_slug=eq.${tenant.slug}` 
      }, (payload) => {
        const newOrderId = payload.new.id;
        
        if (isAudioEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {
            setIsAudioUnlocked(false);
            console.warn('Áudio bloqueado. Requer clique do usuário.');
          });
        }

        setRecentOrderIds(prev => {
          const next = new Set(prev);
          next.add(newOrderId);
          return next;
        });

        setTimeout(() => {
          setRecentOrderIds(prev => {
            const next = new Set(prev);
            next.delete(newOrderId);
            return next;
          });
        }, 12000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenant.slug, isAudioEnabled]);

  // Desbloqueia o contexto de áudio na primeira interação se a preferência for True
  useEffect(() => {
    const unlock = () => {
      if (isAudioEnabled && audioRef.current && !isAudioUnlocked) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
          setIsAudioUnlocked(true);
        }).catch(() => {});
      }
    };
    window.addEventListener('mousedown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [isAudioEnabled, isAudioUnlocked]);

  const handlePrint = (order: Order) => setPrintingOrder(order);

  const filteredOrders = orders.filter(o => {
    if (!o || o.status === 'finished' || o.status === 'canceled') return false;
    const matchesFilter = orderFilter === 'all' || o.type === orderFilter;
    const searchLower = orderSearch.toLowerCase();
    const idMatches = (o.id || '').toString().toLowerCase().includes(searchLower);
    const numMatches = (o.orderNumber || '').toString().includes(searchLower);
    const nameMatches = (o.customerName || '').toLowerCase().includes(searchLower);
    return matchesFilter && (idMatches || nameMatches || numMatches);
  });

  const getOrdersByStatus = (status: OrderStatus) => filteredOrders.filter(o => o.status === status);

  const columns = [
    { id: 'pending', title: 'Novos', color: 'border-yellow-500', orders: getOrdersByStatus('pending') },
    { id: 'preparing', title: 'Em Preparo', color: 'border-blue-500', orders: getOrdersByStatus('preparing') },
    { id: 'ready_to_send', title: 'Prontos', color: 'border-green-500', orders: getOrdersByStatus('ready_to_send') }
  ];

  return (
    <div className="h-full flex flex-col gap-4">
       <div className="flex items-center justify-between bg-[#161618] border border-white/5 p-3 rounded-2xl px-6">
          <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAudioEnabled ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-white/5 text-gray-500 border border-white/5'}`}
              >
                {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {isAudioEnabled ? 'Alertas: LIGADOS' : 'Alertas: MUDO'}
              </button>
              {!isAudioUnlocked && isAudioEnabled && (
                <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-bold uppercase animate-pulse">
                   <AlertTriangle size={14} />
                   <span>Clique no painel para habilitar o som</span>
                </div>
              )}
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
             <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">KDS Realtime Ativo</span>
          </div>
       </div>

       <div className="flex justify-between items-center gap-2 flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => setOrderFilter('all')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${orderFilter === 'all' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-[#161618] text-gray-500 border border-white/5'}`}>Todos</button>
            <button onClick={() => setOrderFilter('delivery')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${orderFilter === 'delivery' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-[#161618] text-gray-500 border border-white/5'}`}><Bike size={14}/> Delivery</button>
            <button onClick={() => setOrderFilter('local')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${orderFilter === 'local' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-[#161618] text-gray-500 border border-white/5'}`}><Utensils size={14}/> Mesa</button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="text" placeholder="BUSCAR PEDIDO OU NOME..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="bg-[#161618] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 w-72 font-bold" />
          </div>
       </div>

       <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
         <div className="flex gap-4 h-full min-w-[1100px]"> 
           {columns.map(col => (
             <div key={col.id} className="flex-1 flex flex-col bg-[#09090B] border border-white/5 rounded-[28px] h-full overflow-hidden shadow-2xl">
                <div className={`p-5 border-b border-white/5 flex justify-between items-center bg-[#161618]/50 ${col.color.replace('border', 'border-b-4')}`}>
                   <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px]">{col.title}</h3>
                   <span className="bg-white/10 text-white text-[10px] font-black px-3 py-1 rounded-full">{col.orders.length}</span>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                   {col.orders.map(order => {
                      const isNew = recentOrderIds.has(order.id);
                      return (
                        <div 
                          key={order.id} 
                          className={`bg-[#161618] border rounded-2xl p-5 shadow-lg transition-all group relative animate-in zoom-in-95 duration-300 
                            ${isNew ? 'border-primary ring-4 ring-primary/10 shadow-primary/30 z-10' : 'border-white/5 hover:border-white/10'}`}
                        >
                           {isNew && (
                             <div className="absolute -top-3 -right-3 bg-primary text-white p-2 rounded-xl shadow-2xl z-20 animate-bounce">
                                <Sparkles size={16} fill="currentColor" />
                             </div>
                           )}
                           
                           <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/5">
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-black text-white text-lg tracking-tighter">#{order.orderNumber}</span>
                                    {order.type === 'delivery' ? <Bike size={14} className="text-blue-400"/> : <Utensils size={14} className="text-orange-400"/>}
                                    <button onClick={() => handlePrint(order)} className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"><Printer size={14} /></button>
                                 </div>
                                 <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest truncate">{order.customerName}</p>
                              </div>
                              <div className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                           </div>
                           
                           <div className="space-y-4 mb-6">
                              {(order.items || []).map((item, idx) => (
                                 <div key={idx} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[10px] flex-shrink-0">{item.quantity}x</div>
                                    <div className="flex-1">
                                       <div className="text-gray-200 text-xs font-bold uppercase tracking-tight">{item.name}</div>
                                       {item.itemObservation && (
                                         <div className="text-[10px] font-black text-yellow-500 uppercase mt-1.5 bg-yellow-500/5 p-2 rounded-lg border-l-2 border-yellow-500">
                                           {'>>'} {item.itemObservation}
                                         </div>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                           
                           <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                              <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Valor Total</span><span className="text-sm font-black text-white">R$ {(order.total || 0).toFixed(2)}</span></div>
                              <div className="flex gap-2">
                                 {col.id === 'pending' && (<button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"><Flame size={14} /> Começar Preparo</button>)}
                                 {col.id === 'preparing' && (<button onClick={() => updateOrderStatus(order.id, 'ready_to_send')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"><CheckCircle2 size={14} /> Marcar Pronto</button>)}
                                 {col.id === 'ready_to_send' && (
                                   <button onClick={() => updateOrderStatus(order.id, 'finished')} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"><Archive size={14} /> Finalizar & Limpar</button>
                                 )}
                              </div>
                           </div>
                        </div>
                      );
                   })}
                   {col.orders.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 grayscale">
                        <ShoppingBag size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Fila Vazia</p>
                     </div>
                   )}
                </div>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};

export default DashboardOrders;
