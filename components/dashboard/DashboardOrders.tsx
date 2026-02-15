import React, { useState, useEffect } from 'react';
import { Bike, Utensils, Search, Clock, Check, AlertTriangle, Flame, CheckCircle2, Archive, ShoppingBag, XCircle, Printer, Loader2 } from 'lucide-react';
import { Order, OrderStatus, Tenant } from '../../types';

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
  const [checkedItems, setCheckedItems] = useState<Record<string, Record<number, boolean>>>(() => {
    try {
      const saved = localStorage.getItem('kds_checked_items');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('kds_checked_items', JSON.stringify(checkedItems));
  }, [checkedItems]);

  // Efeito para gerenciar a geração do PDF quando um pedido é selecionado para impressão
  useEffect(() => {
    if (printingOrder) {
      const generatePDF = async () => {
        // Log de verificação da biblioteca como solicitado
        const html2pdfLib = (window as any).html2pdf;
        console.log('Biblioteca html2pdf carregada:', !!html2pdfLib);
        
        if (!html2pdfLib) {
          alert('Erro: A biblioteca de PDF não carregou. Verifique sua conexão.');
          setPrintingOrder(null);
          return;
        }

        setIsGeneratingPdf(true);
        
        // Aguarda renderização do elemento oculto no DOM
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const element = document.getElementById('printable-receipt-pdf');
        
        if (element) {
          const opt = {
            margin: 0,
            filename: `comanda-pedido-${printingOrder.orderNumber || '00'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
              scale: 3, 
              useCORS: true,
              logging: false,
              letterRendering: true
            },
            jsPDF: { 
              unit: 'mm', 
              format: [80, 297], // 80mm de largura para bobina térmica
              orientation: 'portrait' 
            }
          };

          try {
            await html2pdfLib().set(opt).from(element).save();
          } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar o PDF da comanda.');
          }
        }
        
        setIsGeneratingPdf(false);
        setPrintingOrder(null);
      };

      generatePDF();
    }
  }, [printingOrder]);

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemIdx]: !(prev[orderId]?.[itemIdx])
      }
    }));
  };

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

  const getTimeElapsed = (date: any) => {
    if (!date) return 0;
    const d = date instanceof Date ? date : new Date(date);
    return Math.floor((now.getTime() - d.getTime()) / 60000);
  };

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
  };

  const handleDispatchDelivery = (order: Order) => {
    const itemsList = (order.items || []).map(i => `• ${i.quantity}x ${i.name} ${i.itemObservation ? `(${i.itemObservation})` : ''}`).join('\n');
    let message = `🛵 *SAIU PARA ENTREGA!*\n\nOlá *${order.customerName}*, boas notícias!\nSeu pedido *#${order.orderNumber}* acabou de sair para entrega e está a caminho.\n\n*Resumo do Pedido:*\n${itemsList}\n\n📍 *Endereço:* ${order.address}\n💰 *Total:* R$ ${order.total?.toFixed(2)}\n\nQualquer dúvida é só chamar! Bom apetite 😋`;
    const phone = (order.customerWhatsapp || '').replace(/\D/g, '');
    const validPhone = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${validPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="h-full flex flex-col gap-4">
       {/* OVERLAY DE FEEDBACK UX */}
       {isGeneratingPdf && (
           <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-[#161618] border border-white/10 p-6 rounded-2xl flex items-center gap-4 shadow-2xl scale-110">
                   <Loader2 className="text-primary animate-spin" size={24} />
                   <div className="flex flex-col">
                       <span className="text-white font-bold text-xs uppercase tracking-widest">Gerando PDF da Comanda...</span>
                       <span className="text-gray-500 text-[10px] uppercase font-bold mt-1">O download iniciará em breve</span>
                   </div>
               </div>
           </div>
       )}

       {/* CONTEÚDO DA COMANDA PARA PDF (Off-screen) */}
       {printingOrder && (
           <div style={{ position: 'fixed', left: '-1000mm', top: '0', zIndex: -100 }}>
               <div id="printable-receipt-pdf" className="text-black bg-white p-8 font-mono w-[80mm] leading-tight">
                    <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-black">
                        <h2 className="text-xl font-bold uppercase m-0">{tenant.name}</h2>
                        <div className="text-[10px] mt-2 font-bold">{new Date(printingOrder.createdAt).toLocaleString('pt-BR')}</div>
                    </div>
                    
                    <div className="mb-6 text-center">
                        <div className="text-[10px] uppercase font-black tracking-widest text-gray-600 mb-1">Pedido</div>
                        <div className="text-4xl font-black uppercase tracking-tighter">#{printingOrder.orderNumber}</div>
                        <div className="text-[11px] uppercase font-bold mt-2 bg-black text-white px-2 py-1 inline-block">{printingOrder.type === 'delivery' ? 'DELIVERY' : `MESA ${printingOrder.tableNumber || ''}`}</div>
                    </div>

                    <div className="mb-6 text-[12px] space-y-2 border-b border-black pb-4">
                        <div><strong className="text-[10px] text-gray-600">CLIENTE:</strong> <span className="font-bold">{printingOrder.customerName}</span></div>
                        {printingOrder.address && (
                            <div className="mt-2 border border-black p-2 bg-gray-50">
                                <strong className="text-[10px]">ENDEREÇO:</strong><br/>
                                <span className="font-bold">{printingOrder.address}</span>
                            </div>
                        )}
                        {printingOrder.observation && (
                            <div className="mt-2 text-red-600"><strong>OBS:</strong> {printingOrder.observation}</div>
                        )}
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-widest mb-3">Resumo dos Itens</div>
                    <div className="space-y-4 mb-8">
                        {printingOrder.items.map((item, idx) => (
                            <div key={idx} className="text-[12px]">
                                <div className="flex justify-between items-start font-bold">
                                    <span className="flex-1">{item.quantity}x {item.name}</span>
                                    <span className="ml-2">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.itemObservation && (
                                    <div className="text-[11px] italic mt-1 ml-4 border-l-2 border-gray-300 pl-2">{'>>'} {item.itemObservation}</div>
                                )}
                                {item.extras && item.extras.length > 0 && (
                                    <div className="text-[11px] mt-1 ml-4 text-gray-600">+ {item.extras.join(', ')}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="border-t-4 border-double border-black pt-3 flex justify-between items-center mb-8">
                        <span className="text-sm font-bold uppercase">VALOR TOTAL:</span>
                        <span className="text-2xl font-black">R$ {printingOrder.total.toFixed(2)}</span>
                    </div>

                    <div className="text-center text-[10px] uppercase font-bold mt-12 border-t border-dashed border-black pt-6">
                        OBRIGADO PELA PREFERÊNCIA!<br/>
                        *** VOLTE SEMPRE ***
                    </div>
               </div>
           </div>
       )}

       <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => setOrderFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${orderFilter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[#161618] text-gray-400 border border-white/5 hover:bg-white/5'}`}>Todos</button>
            <button onClick={() => setOrderFilter('delivery')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${orderFilter === 'delivery' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[#161618] text-gray-400 border border-white/5 hover:bg-white/5'}`}><Bike size={14}/> Delivery</button>
            <button onClick={() => setOrderFilter('local')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${orderFilter === 'local' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[#161618] text-gray-400 border border-white/5 hover:bg-white/5'}`}><Utensils size={14}/> Mesa</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input 
                type="text" 
                placeholder="Buscar por # ou Nome..." 
                value={orderSearch} 
                onChange={e => setOrderSearch(e.target.value)} 
                className="bg-[#161618] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50 w-64 transition-all" 
              />
              {orderSearch && (
                <button onClick={() => setOrderSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <XCircle size={14} />
                </button>
              )}
            </div>
          </div>
       </div>

       <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
         <div className="flex gap-4 h-full min-w-[1000px]"> 
           {columns.map(col => (
             <div key={col.id} className="flex-1 flex flex-col bg-[#161618]/50 border border-white/5 rounded-2xl h-full overflow-hidden backdrop-blur-sm shadow-inner">
                <div className={`p-4 border-b border-white/5 flex justify-between items-center bg-[#161618]/80 ${col.color.replace('border', 'border-b-2')}`}>
                   <div className="flex items-center gap-2">
                     <h3 className="font-black text-white uppercase tracking-wider text-xs">{col.title}</h3>
                   </div>
                   <span className="bg-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">{col.orders.length}</span>
                </div>
                
                <div className="p-3 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                   {col.orders.map(order => {
                      const mins = getTimeElapsed(order.createdAt);
                      let timerColor = 'text-green-500', timerBg = 'bg-green-500/10';
                      if (mins > 45) { timerColor = 'text-red-500'; timerBg = 'bg-red-500/10 animate-pulse'; }
                      else if (mins > 20) { timerColor = 'text-yellow-500'; timerBg = 'bg-yellow-500/10'; }
                      
                      return (
                        <div key={order.id} className="bg-[#161618] border border-white/10 rounded-xl p-4 shadow-lg hover:border-primary/30 transition-all group relative animate-in zoom-in-95 duration-200">
                           <div className="flex justify-between items-start mb-3 pb-3 border-b border-white/5">
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="font-black text-white text-sm truncate">#{order.orderNumber}</span>
                                    {order.type === 'delivery' ? <div className="bg-blue-500/10 text-blue-400 p-1 rounded flex-shrink-0"><Bike size={12}/></div> : <div className="bg-orange-500/10 text-orange-400 p-1 rounded flex-shrink-0"><Utensils size={12}/></div>}
                                    <button 
                                        onClick={() => handlePrint(order)}
                                        disabled={isGeneratingPdf}
                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-colors ml-1 disabled:opacity-30"
                                        title="Gerar PDF da Comanda"
                                    >
                                        <Printer size={12} />
                                    </button>
                                 </div>
                                 <p className="text-[11px] font-bold text-gray-400 truncate pr-2">{order.customerName || 'Cliente sem nome'}</p>
                              </div>
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono font-bold text-xs flex-shrink-0 ${timerColor} ${timerBg}`}><Clock size={12} /> {mins} min</div>
                           </div>
                           
                           <div className="space-y-3 mb-4">
                              {(order.items || []).map((item, idx) => (
                                 <div key={idx} className="flex items-start gap-3 text-sm group/item cursor-pointer" onClick={() => toggleItemCheck(order.id, idx)}>
                                    <button className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${checkedItems[order.id]?.[idx] ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : 'border-white/20 text-transparent group-hover/item:border-white/40'}`}><Check size={10} strokeWidth={4} /></button>
                                    <div className={`flex-1 transition-opacity ${checkedItems[order.id]?.[idx] ? 'opacity-30' : 'opacity-100'}`}>
                                       <div className="flex gap-2"><span className="font-black text-white">{item.quantity}x</span><span className="text-gray-300 text-xs font-medium leading-tight">{item.name}</span></div>
                                       {(item.itemObservation || order.observation) && (
                                         <div className="bg-yellow-500/10 border-l-2 border-yellow-500 pl-2 py-1 mt-1.5">
                                           <p className="text-[10px] font-bold text-yellow-500 uppercase leading-relaxed flex items-start gap-1">
                                             <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" /> 
                                             <span className="line-clamp-2">{item.itemObservation || order.observation}</span>
                                           </p>
                                         </div>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                           
                           <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                              <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold uppercase text-gray-500">Total</span><span className="text-xs font-black text-white">R$ {(order.total || 0).toFixed(2)}</span></div>
                              <div className="flex gap-2">
                                 {col.id === 'pending' && (
                                   <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                                     <Flame size={14} /> Preparar
                                   </button>
                                 )}
                                 {col.id === 'preparing' && (
                                   <button onClick={() => updateOrderStatus(order.id, 'ready_to_send')} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">
                                     <CheckCircle2 size={14} /> Pronto
                                   </button>
                                 )}
                                 {col.id === 'ready_to_send' && (
                                   <>
                                     {order.type === 'delivery' && (
                                       <button onClick={() => handleDispatchDelivery(order)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2">
                                         <Bike size={14} /> WhatsApp
                                       </button>
                                     )}
                                     <button onClick={() => updateOrderStatus(order.id, 'finished')} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-white/5">
                                       <Archive size={14} /> Concluir
                                     </button>
                                   </>
                                 )}
                              </div>
                           </div>
                        </div>
                      );
                   })}
                   
                   {col.orders.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 min-h-[200px]">
                        <div className="p-4 rounded-full bg-white/5 mb-3 border border-white/5">
                          <ShoppingBag size={24} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nenhum pedido aqui</p>
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