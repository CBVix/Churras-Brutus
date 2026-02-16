
import React, { useState, useEffect, useRef } from 'react';
import { Bike, Utensils, Search, Clock, AlertTriangle, Flame, CheckCircle2, Archive, ShoppingBag, XCircle, Printer, Loader2, Volume2, VolumeX, Sparkles, Send, Check } from 'lucide-react';
import { Order, OrderStatus, Tenant, OrderType } from '../../types';
import { supabase } from '../../supabaseClient';

interface DashboardOrdersProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  now: Date;
  tenant: Tenant;
}

const DashboardOrders: React.FC<DashboardOrdersProps> = ({ orders = [], setOrders, updateOrderStatus, now, tenant }) => {
  const [orderFilter, setOrderFilter] = useState<'all' | 'delivery' | 'local'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    return localStorage.getItem('soundEnabled') === 'true'; 
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recentOrderIds, setRecentOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();
    localStorage.setItem('soundEnabled', String(isAudioEnabled));
  }, [isAudioEnabled]);

  // Sincronização em Tempo Real (Realtime)
  useEffect(() => {
    const channel = supabase.channel(`kds_${tenant.slug}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: `tenant_slug=eq.${tenant.slug}` 
      }, (payload) => {
        const newOrderRaw = payload.new;
        
        const mappedOrder: Order = {
          id: newOrderRaw.id,
          orderNumber: newOrderRaw.order_number,
          customerName: newOrderRaw.customer_name || 'Cliente',
          customerWhatsapp: newOrderRaw.customer_whatsapp || '',
          items: newOrderRaw.items || [],
          total: Number(newOrderRaw.total || 0),
          type: newOrderRaw.type as OrderType,
          status: newOrderRaw.status as OrderStatus,
          createdAt: new Date(newOrderRaw.created_at),
          tableNumber: newOrderRaw.table_number,
          address: newOrderRaw.address,
          observation: newOrderRaw.observation,
          userId: newOrderRaw.user_id
        };

        setOrders(prev => {
          const exists = prev.some(o => o.id === mappedOrder.id);
          if (exists) return prev;
          return [mappedOrder, ...prev];
        });

        if (isAudioEnabled && audioRef.current) {
          audioRef.current.play().catch(e => console.warn("Erro ao tocar áudio:", e));
        }

        setRecentOrderIds(prev => new Set(prev).add(mappedOrder.id));
        setTimeout(() => {
          setRecentOrderIds(prev => {
            const next = new Set(prev);
            next.delete(mappedOrder.id);
            return next;
          });
        }, 15000);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `tenant_slug=eq.${tenant.slug}`
      }, (payload) => {
        const updated = payload.new;
        setOrders(prev => prev.map(o => o.id === updated.id ? { 
          ...o, 
          status: updated.status as OrderStatus 
        } : o));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant.slug, isAudioEnabled, setOrders]);

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
      <div style="border-bottom: 1px dashed #eee; padding: 4px 0;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <span>${item.quantity}x ${item.name}</span>
          <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        ${item.itemObservation ? `<div style="font-size: 11px; margin-top: 2px; color: #444;">* Obs: ${item.itemObservation}</div>` : ''}
      </div>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Comanda #${order.orderNumber}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              padding: 10mm 5mm; 
              margin: 0;
              color: #000;
              line-height: 1.2;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
            .store-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .order-info { font-size: 22px; font-weight: 900; margin: 5px 0; }
            .section { margin-bottom: 12px; }
            .label { font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 2px; }
            .value { font-size: 14px; font-weight: bold; }
            .divider { border-top: 1px solid #000; margin: 10px 0; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 10px; }
            .footer { text-align: center; font-size: 10px; margin-top: 20px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${tenant.name}</div>
            <div class="order-info">PEDIDO #${order.orderNumber}</div>
            <div style="font-size: 10px;">${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
          </div>
          <div class="section">
            <span class="label">Cliente:</span>
            <span class="value">${order.customerName}</span>
          </div>
          <div class="section">
            <span class="label">Local / Entrega:</span>
            <span class="value">${order.type === 'delivery' ? 'DELIVERY' : `MESA ${order.tableNumber || '-'}`}</span>
          </div>
          <div class="divider"></div>
          <div class="section"><span class="label">Itens:</span>${itemsHtml}</div>
          <div class="divider"></div>
          <div class="total">TOTAL: R$ ${order.total.toFixed(2)}</div>
          <script>window.onload = function() { window.print(); setTimeout(() => { window.close(); }, 500); };</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleOutForDelivery = async (order: Order) => {
    updateOrderStatus(order.id, 'out_for_delivery');
    const message = `Olá, ${order.customerName}! Seu pedido do ${tenant.name} acabou de sair para entrega e logo chegará até você. Prepare o apetite! 🛵🔥`;
    const cleanPhone = order.customerWhatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredOrders = orders.filter(o => {
    if (!o || o.status === 'finished' || o.status === 'canceled') return false;
    const matchesFilter = orderFilter === 'all' || o.type === orderFilter;
    const searchLower = orderSearch.toLowerCase();
    return matchesFilter && (
      o.customerName.toLowerCase().includes(searchLower) || 
      o.orderNumber?.toString().includes(searchLower) ||
      o.id.toString().includes(searchLower)
    );
  });

  const getOrdersByStatus = (status: OrderStatus) => filteredOrders.filter(o => o.status === status);

  const columns = [
    { id: 'pending', title: 'Novos', color: 'border-yellow-500', orders: getOrdersByStatus('pending') },
    { id: 'preparing', title: 'Em Preparo', color: 'border-blue-500', orders: getOrdersByStatus('preparing') },
    { id: 'ready_to_send', title: 'Prontos', color: 'border-green-500', orders: getOrdersByStatus('ready_to_send') },
    { id: 'out_for_delivery', title: 'Em Trânsito', color: 'border-indigo-500', orders: getOrdersByStatus('out_for_delivery') }
  ];

  return (
    <div className="flex flex-col gap-0 bg-[#09090B] pb-[100px] min-h-screen">
       {/* BARRA SUPERIOR DE FERRAMENTAS - ÚNICO ELEMENTO STICKY */}
       <div className="flex items-center justify-between bg-[#09090B] border-b border-white/5 p-4 px-8 shadow-2xl sticky top-[-32px] z-[50]">
          <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isAudioEnabled ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-gray-500 border border-white/5'}`}
              >
                {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {isAudioEnabled ? 'Sons Ativos' : 'Sons Mudos'}
              </button>
              <div className="flex items-center gap-3 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" />
                <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">KDS Realtime Ativo</span>
              </div>
          </div>
          <p className="text-[10px] font-black uppercase text-gray-600 tracking-[0.2em]">Cozinha Brutus v2.5</p>
       </div>

       {/* FILTROS E BUSCA - NÃO MAIS STICKY */}
       <div className="flex justify-between items-center gap-4 flex-shrink-0 px-8 bg-[#09090B] py-6 border-b border-white/5 relative z-[10]">
          <div className="flex gap-2 bg-[#161618] p-1 rounded-xl border border-white/5 shadow-inner">
            <button onClick={() => setOrderFilter('all')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${orderFilter === 'all' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Todos</button>
            <button onClick={() => setOrderFilter('delivery')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${orderFilter === 'delivery' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Bike size={14}/> Delivery</button>
            <button onClick={() => setOrderFilter('local')} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${orderFilter === 'local' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Utensils size={14}/> Mesa</button>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
            <input type="text" placeholder="BUSCAR POR NOME OU #..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="bg-[#161618] border border-white/5 rounded-xl pl-11 pr-6 py-3 text-[10px] text-white focus:outline-none focus:border-primary/50 w-72 font-black tracking-widest" />
          </div>
       </div>

       {/* COLUNAS KDS - ROLAGEM GLOBAL DA PÁGINA */}
       <div className="w-full pt-8 overflow-x-auto hide-scrollbar bg-[#09090B]">
         <div className="flex gap-6 h-fit min-w-full items-start px-8"> 
           {columns.map(col => (
             <div key={col.id} className="w-[340px] flex-shrink-0 flex flex-col bg-[#09090B] border border-white/5 rounded-[32px] shadow-2xl relative h-fit">
                {/* CABEÇALHO DA COLUNA - NÃO MAIS STICKY, AGORA PARTE DO CONTEÚDO */}
                <div className={`p-5 border-b border-white/5 flex justify-between items-center bg-[#111113] rounded-t-[32px] ${col.color.replace('border', 'border-b-4')}`}>
                   <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px]">{col.title}</h3>
                   <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-lg border border-primary/30">{col.orders.length}</span>
                </div>
                
                <div className="p-4 space-y-4 h-fit bg-[#09090B]">
                   {col.orders.map(order => {
                      const isNew = recentOrderIds.has(order.id);
                      const waitTime = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
                      
                      return (
                        <div key={order.id} className={`bg-[#161618] border rounded-2xl p-4 shadow-xl transition-all group relative animate-in zoom-in-95 duration-500 h-fit ${isNew ? 'border-primary ring-4 ring-primary/20 shadow-primary/40 scale-[1.03] z-[20] animate-pulse' : 'border-white/5 hover:border-white/10'}`}>
                           {isNew && (
                             <div className="absolute -top-3 -left-3 bg-primary text-white p-2 rounded-xl shadow-2xl z-[30] animate-bounce border-2 border-[#161618]">
                                <Sparkles size={16} fill="currentColor" />
                             </div>
                           )}
                           
                           <div className="flex justify-between items-start mb-3 pb-3 border-b border-white/5">
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-black text-white text-xl tracking-tighter leading-none">#{order.orderNumber}</span>
                                    <div className={`px-2 py-0.5 rounded-md flex items-center gap-1.5 border ${order.type === 'delivery' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                       {order.type === 'delivery' ? <Bike size={10} /> : <Utensils size={10} />}
                                       <span className="text-[8px] font-black uppercase tracking-widest">{order.type === 'delivery' ? 'DEL' : `M${order.tableNumber || ''}`}</span>
                                    </div>
                                 </div>
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">{order.customerName}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                 <button 
                                   onClick={() => handlePrintOrder(order)}
                                   className="p-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all active:scale-90 border border-primary/20 group/btn shadow-lg"
                                   title="IMPRIMIR COMANDA"
                                 >
                                   <Printer size={16} className="group-active/btn:scale-110" />
                                 </button>
                                 <div className={`flex items-center gap-1 text-[9px] font-black ${waitTime > 15 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                                    <Clock size={10} />
                                    <span>{waitTime}M</span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="space-y-1.5 mb-4 max-h-[160px] overflow-y-auto hide-scrollbar">
                              {(order.items || []).map((item, idx) => (
                                 <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                    <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-black text-[11px] shadow-md flex-shrink-0">{item.quantity}x</div>
                                    <div className="flex-1 pt-0.5">
                                       <div className="text-white text-[11px] font-bold uppercase tracking-tight leading-tight">{item.name}</div>
                                       {item.itemObservation && (
                                         <div className="mt-1.5 bg-yellow-500/10 border-l-2 border-yellow-500 p-2 rounded-r-lg">
                                           <p className="text-[9px] font-black text-yellow-500 uppercase leading-tight italic">OBS: {item.itemObservation}</p>
                                         </div>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                           
                           <div className="pt-3 border-t border-white/5 space-y-3">
                              <div className="flex justify-between items-center px-1">
                                 <span className="text-[8px] font-black uppercase text-gray-600 tracking-widest">Valor do Pedido</span>
                                 <span className="text-sm font-black text-white tracking-tighter">R$ {(order.total || 0).toFixed(2)}</span>
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                 {col.id === 'pending' && (
                                   <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                                      <Flame size={14} fill="currentColor" /> Começar Preparo
                                   </button>
                                 )}
                                 {col.id === 'preparing' && (
                                   <button onClick={() => updateOrderStatus(order.id, 'ready_to_send')} className="w-full bg-green-600 hover:bg-green-500 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                                      <CheckCircle2 size={14} fill="currentColor" /> Finalizar Prato
                                   </button>
                                 )}
                                 {col.id === 'ready_to_send' && (
                                   <div className="flex gap-2">
                                      {order.type === 'delivery' ? (
                                        <button onClick={() => handleOutForDelivery(order)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                                           <Bike size={14} /> Saiu para Entrega
                                        </button>
                                      ) : (
                                        <button onClick={() => updateOrderStatus(order.id, 'finished')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                                           <Check size={14} /> Pedido Entregue
                                        </button>
                                      )}
                                   </div>
                                 )}
                                 {col.id === 'out_for_delivery' && (
                                   <button onClick={() => updateOrderStatus(order.id, 'finished')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                                      <Check size={14} /> Confirmar Entrega
                                   </button>
                                 )}
                              </div>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};

export default DashboardOrders;
