
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Tag, ShoppingBag, Clock, Info, Bell, Ticket, Copy } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AppNotification, OrderType } from '../types';

interface AlertsProps {
  onBack: () => void;
  isDarkMode?: boolean;
  orderType?: OrderType;
}

const Alerts: React.FC<AlertsProps> = ({ onBack, isDarkMode, orderType }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Inscrever para mudanças em tempo real
    const channel = supabase.channel('realtime_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderType]);

  const mapNotification = (data: any): AppNotification => ({
    id: data.id,
    title: data.title,
    message: data.message,
    type: data.type,
    isRead: data.is_read,
    createdAt: data.created_at
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Buscar Notificações (Sempre visíveis se is_active=true)
      let notifQuery = supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true) // Filtro adicionado conforme nova coluna
        .order('created_at', { ascending: false });

      if (user) {
        notifQuery = notifQuery.or(`user_id.eq.${user.id},user_id.is.null`);
      } else {
        notifQuery = notifQuery.is('user_id', null);
      }

      const { data: notifData, error: notifError } = await notifQuery;
      
      // Mapeia notificações mesmo se houver erro (retornando array vazio em caso de falha crítica)
      const fetchedNotifications = (notifData || []).map(mapNotification);
      if (notifError) console.error('Erro ao buscar notificações:', notifError);

      // 2. Lógica de Cupons: 
      // Mostra se for DELIVERY ou se o modo não foi definido (UNSET/null/undefined)
      // Bloqueia APENAS se explicitamente for LOCAL
      let activeCouponsAsAlerts: any[] = [];
      const isActuallyLocal = orderType === OrderType.LOCAL;
      
      if (!isActuallyLocal) {
          // Filtro de Exclusividade: Apenas cupons PÚBLICOS e ATIVOS
          const couponsQuery = supabase
            .from('coupons')
            .select('*')
            .eq('is_active', true)
            .is('user_id', null)
            .is('customer_email', null)
            .is('customer_phone', null);

          const { data: couponRes, error: couponError } = await couponsQuery;
          
          // Debug logs
          console.log('DEBUG Alertas - Modo Atual:', orderType || 'PADRÃO/DELIVERY');
          console.log('DEBUG Alertas - Resposta Cupons Públicos:', couponRes);
          
          if (!couponError && couponRes) {
              activeCouponsAsAlerts = couponRes
                .filter((c: any) => c.current_uses < c.max_uses)
                .map((c: any) => ({
                    id: `coupon-${c.id}`,
                    title: `🎟️ CUPOM: ${c.code}`,
                    message: `Ganhe R$ ${c.discount_value.toFixed(2)} de desconto!`,
                    type: 'promo' as const,
                    isRead: false,
                    createdAt: new Date().toISOString()
                }));
          }
      } else {
          console.log('DEBUG Alertas - Modo Local: Cupons públicos ocultados por regra de negócio.');
      }

      // Combina as fontes de dados de forma independente
      setNotifications([...activeCouponsAsAlerts, ...fetchedNotifications]);

    } catch (error) {
      console.error('Erro crítico no fetchData dos Alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (notif.id.startsWith('coupon-')) {
        const code = notif.title.split(': ')[1];
        if (code) {
            navigator.clipboard.writeText(code);
            alert(`Código ${code} copiado com sucesso!`);
        }
    } else {
        markAsRead(notif.id);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (!id.startsWith('coupon-')) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'promo': return <Ticket className="text-primary" />;
      case 'order': return <ShoppingBag className="text-green-500" />;
      case 'system': return <Info className="text-blue-500" />;
      default: return <Bell className="text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    if (dateString === new Date().toISOString()) return 'Agora';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min atrás`;
    return `${Math.floor(mins / 60)}h atrás`;
  };

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 transition-colors ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}`}>
      <header className="px-6 pt-12 pb-8 flex items-center gap-4">
        <button onClick={onBack} className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-sm transition-all ${isDarkMode ? 'bg-[#1a1a1a] border-white/5 text-white' : 'bg-white border-gray-100 text-gray-700'}`}>
          <ChevronLeft size={20} />
        </button>
        <h1 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>Notificações</h1>
      </header>

      <section className="px-6 space-y-4">
        {loading ? (
           <div className="text-center py-10 opacity-50 text-xs uppercase font-bold tracking-widest text-gray-400">Carregando informações...</div>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-xl border flex gap-4 transition-all cursor-pointer active:scale-[0.98] ${isDarkMode ? 'bg-[#1a1a1a] border-white/5 shadow-black/20' : 'bg-white border-gray-100 shadow-sm'} ${!notif.isRead ? 'border-l-4 border-l-primary' : ''}`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold text-[11px] uppercase tracking-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{notif.title}</h4>
                  <div className="flex items-center gap-1 text-[9px] text-gray-500 font-bold uppercase"><Clock size={10} /> {notif.id.startsWith('coupon-') ? 'Válido' : formatTime(notif.createdAt)}</div>
                </div>
                <p className={`text-[11px] font-medium leading-relaxed mb-2 ${isDarkMode ? 'text-gray-400 opacity-60' : 'text-gray-600'}`}>{notif.message}</p>
                
                {notif.id.startsWith('coupon-') && (
                  <div className="flex items-center gap-1.5 text-primary text-[9px] font-black uppercase tracking-widest bg-primary/10 w-fit px-2 py-1 rounded">
                    <Copy size={10} /> Copiar Código
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 flex flex-col items-center opacity-40">
            <Bell size={40} className="mb-4 text-gray-400" />
            <p className={`text-[10px] font-bold uppercase tracking-widest text-center max-w-[200px] ${isDarkMode ? 'text-gray-500' : 'text-[#64748B]'}`}>
              {orderType === OrderType.LOCAL 
                ? 'Sem promoções ou avisos para consumo local' 
                : 'Nenhuma notificação ou cupom disponível'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Alerts;
