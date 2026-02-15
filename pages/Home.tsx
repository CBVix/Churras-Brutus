
import React, { useMemo, useState } from 'react';
import { 
  Search, 
  Flame, 
  Sparkles, 
  Zap, 
  UtensilsCrossed, 
  CupSoda, 
  IceCream,
  MapPin, 
  Instagram,
  MessageCircle,
  Sun,
  Moon,
  Tag,
  Clock,
  Star,
  LayoutGrid,
  Crown
} from 'lucide-react';
import { Product, Tenant, Coupon, OrderType } from '../types';
import ReviewsModal from '../components/ReviewsModal';

interface HomeProps {
  onSelectProduct: (product: Product) => void;
  tenant: Tenant;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  coupons: Coupon[];
  user?: any;
  orderType?: OrderType;
}

const Home: React.FC<HomeProps> = ({ onSelectProduct, tenant, isDarkMode, setIsDarkMode, coupons, user, orderType }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const getCategoryIcon = (catId: string) => {
    const iconSize = 16;
    switch (catId) {
      case 'tradicionais': return <Flame size={iconSize} />;
      case 'especiais': return <Sparkles size={iconSize} />;
      case 'combos': return <Zap size={iconSize} />;
      case 'pao': return <UtensilsCrossed size={iconSize} />;
      case 'bebidas': return <CupSoda size={iconSize} />;
      case 'sobremesas': return <IceCream size={iconSize} />;
      default: return <Flame size={iconSize} />;
    }
  };

  const shopStatus = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    if (tenant.holidayClosures?.includes(todayStr)) {
        return { isOpen: false, label: 'Fechado (Feriado/Folga)' };
    }

    if (tenant.operatingHours) {
        const dayOfWeek = now.getDay().toString(); // 0-6
        const config = tenant.operatingHours[dayOfWeek];
        
        if (!config || !config.isOpen) {
            return { isOpen: false, label: 'Fechado Hoje' };
        }

        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = config.open.split(':').map(Number);
        const [closeH, closeM] = config.close.split(':').map(Number);
        
        const openTime = openH * 60 + openM;
        const closeTime = closeH * 60 + closeM;

        if (closeTime < openTime) {
            if (currentTime >= openTime || currentTime <= closeTime) {
                return { isOpen: true, label: 'Aberto' };
            }
        } else {
            if (currentTime >= openTime && currentTime <= closeTime) {
                return { isOpen: true, label: 'Aberto' };
            }
        }
        return { isOpen: false, label: 'Fechado Agora' };
    }

    return { isOpen: true, label: 'Aberto' };
  }, [tenant]);

  const highlightedProducts = useMemo(() => 
    tenant.products.filter(p => p.isHighlighted && p.availability !== 'out_of_stock'),
    [tenant.products]
  );

  const filteredProducts = useMemo(() => {
    return tenant.products.filter(p => {
      const matchesCategory = selectedCategoryId === 'all' || p.category === selectedCategoryId;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && p.availability !== 'out_of_stock';
    });
  }, [tenant.products, selectedCategoryId, searchQuery]);

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 transition-all duration-700 ${isDarkMode ? 'bg-transparent text-white' : 'text-black'}`}>
      
      {/* Reviews Modal */}
      <ReviewsModal 
        isOpen={showReviewsModal} 
        onClose={() => setShowReviewsModal(false)} 
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
      />

      {/* CARD DE IDENTIDADE */}
      <section className="mb-6">
        <div className={`backdrop-blur-3xl p-6 border-b shadow-xl relative transition-all duration-500 
          ${isDarkMode 
            ? 'bg-[#1a1a1a]/95 border-white/5 shadow-black/60' 
            : 'bg-white border-silver/50 shadow-gray-200/40'} 
          rounded-b-[30px]`}
        >
          <div className="flex items-start gap-4 mb-6 mt-2">
             <div className="flex-shrink-0">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden shadow-lg border transition-all duration-500 ${isDarkMode ? 'border-white/10 bg-[#121212]' : 'border-silver bg-white'}`}>
                   <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-cover" />
                </div>
             </div>
             <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                   <div className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 border transition-all duration-500 ${shopStatus.isOpen ? (isDarkMode ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-100 text-green-600') : (isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600')}`}>
                      <div className={`w-1 h-1 rounded-full ${shopStatus.isOpen ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
                      <span className="text-[8px] font-bold uppercase tracking-widest">{shopStatus.label}</span>
                   </div>
                   <button 
                     onClick={() => setIsDarkMode(!isDarkMode)}
                     className={`relative w-[52px] h-[28px] rounded-lg transition-all duration-500 flex items-center px-1 shadow-inner border border-white/5 overflow-hidden ${isDarkMode ? 'bg-primary' : 'bg-[#E2E8F0]'}`}
                   >
                     <div className={`z-10 w-5 h-5 bg-white rounded-md shadow-lg flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}>
                       {isDarkMode ? <Moon size={11} className="text-primary" strokeWidth={3} /> : <Sun size={11} className="text-[#94A3B8]" strokeWidth={3} />}
                     </div>
                   </button>
                </div>
                <h2 className={`font-display font-bold text-xl uppercase tracking-tight leading-tight mb-2 break-words transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                   {tenant.name}
                </h2>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`text-[10px] font-semibold flex items-start gap-1.5 transition-colors group ${isDarkMode ? 'text-gray-500' : 'text-[#64748B]'}`}
                >
                   <MapPin size={12} className="text-primary flex-shrink-0 mt-0.5" /> 
                   <span className="leading-snug underline decoration-primary/20 underline-offset-2">{tenant.address}</span>
                </a>
             </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
             <a href={`https://instagram.com/${tenant.instagram}`} target="_blank" rel="noreferrer" className={`flex flex-col items-center justify-center gap-1 border py-2.5 rounded-xl text-[7px] font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white hover:bg-white/10' : 'bg-white border-silver text-[#334155] hover:shadow-md'}`}>
                <div className="w-14 h-14 flex items-center justify-center">
                  <Instagram size={14} className="text-[#E4405F]" />
                </div>
                <span>Instagram</span>
             </a>
             <a href={`https://wa.me/${tenant.whatsapp}`} target="_blank" rel="noreferrer" className={`flex flex-col items-center justify-center gap-1 border py-2.5 rounded-xl text-[7px] font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white hover:bg-white/10' : 'bg-white border-silver text-[#334155] hover:shadow-md'}`}>
                <div className="w-14 h-14 flex items-center justify-center">
                  <MessageCircle size={14} className="text-[#25D366]" />
                </div>
                <span>WhatsApp</span>
             </a>
             <button 
                onClick={() => setShowReviewsModal(true)}
                className={`flex flex-col items-center justify-center gap-1 border py-2.5 rounded-xl text-[7px] font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white hover:bg-white/10' : 'bg-white border-silver text-[#334155] hover:shadow-md'}`}>
                <div className="w-14 h-14 flex items-center justify-center">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                </div>
                <span>Reviews</span>
             </button>
          </div>
        </div>
      </section>

      {/* Busca */}
      <section className="px-6 mb-6">
        <div className="relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-primary' : 'text-[#94A3B8] group-focus-within:text-primary'}`} size={18} />
          <input 
            type="text" 
            placeholder="Buscar no cardápio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-4 pl-11 pr-4 rounded-2xl text-xs border shadow-sm focus:outline-none transition-all ${isDarkMode ? 'bg-[#1a1a1a] border-white/5 text-white placeholder-gray-700' : 'bg-white border-silver text-black'}`}
          />
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="mb-10 px-6">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setSelectedCategoryId('all')}
            className={`flex items-center gap-3 h-14 px-3 rounded-2xl border transition-all active:scale-95 ${
              selectedCategoryId === 'all' 
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                : (isDarkMode ? 'bg-[#1a1a1a] border-white/5 text-gray-400' : 'bg-white border-silver text-black')
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selectedCategoryId === 'all' ? 'bg-white/20' : (isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-gray-100')}`}>
              <LayoutGrid size={18} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest truncate">Todos</span>
          </button>
          
          {tenant.categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`flex items-center gap-3 h-14 px-3 rounded-2xl border transition-all active:scale-95 ${
                selectedCategoryId === cat.id 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                  : (isDarkMode ? 'bg-[#1a1a1a] border-white/5 text-gray-400' : 'bg-white border-silver text-black')
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selectedCategoryId === cat.id ? 'bg-white/20' : (isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-gray-100')}`}>
                {getCategoryIcon(cat.id)}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest truncate">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Destaques */}
      {selectedCategoryId === 'all' && searchQuery === '' && highlightedProducts.length > 0 && (
        <section className="px-6 mb-10 animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-2 mb-5">
            <Crown size={20} className="text-primary" />
            <h2 className={`text-lg font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>Em Destaque</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {highlightedProducts.map((p) => (
              <div 
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className={`p-3 rounded-3xl border shadow-xl flex flex-col gap-2 transition-all active:scale-95 group ${isDarkMode ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-silver'}`}
              >
                <div className="h-32 w-full rounded-2xl overflow-hidden bg-black/5 relative">
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-lg shadow-lg">
                    <Star size={10} fill="currentColor" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className={`font-black text-[10px] uppercase tracking-tight truncate mb-1 transition-colors ${isDarkMode ? 'text-white' : 'text-black'}`}>{p.name}</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-black text-xs">R$ {p.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] opacity-60 font-bold uppercase tracking-widest mt-1">
                    <Clock size={10} className="text-primary" /> {p.prepTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lista de Produtos */}
      <section className="px-6">
        {selectedCategoryId !== 'all' && (
          <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-left duration-300">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              {getCategoryIcon(selectedCategoryId)}
            </div>
            <h2 className={`text-lg font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>
              {tenant.categories.find(c => c.id === selectedCategoryId)?.name}
            </h2>
          </div>
        )}

        {selectedCategoryId === 'all' && (
          <div className="mb-6">
            <h2 className={`text-lg font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>
              {searchQuery ? `Resultados para "${searchQuery}"` : "Cardápio Completo"}
            </h2>
          </div>
        )}

        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className={`p-3 rounded-2xl flex items-center gap-4 border shadow-sm active:scale-[0.98] transition-all group ${isDarkMode ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-silver'}`}
            >
              <div className={`w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 transition-colors border ${isDarkMode ? 'border-white/5 bg-[#121212]' : 'border-gray-50 bg-gray-100'}`}>
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex-1 min-w-0 py-1">
                <h4 className={`font-black text-xs uppercase tracking-tight transition-colors truncate mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  {product.name}
                </h4>
                <p className={`text-[10px] mb-3 line-clamp-2 font-medium leading-relaxed ${isDarkMode ? 'text-gray-400 opacity-60' : 'text-[#334155]'}`}>
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-primary text-[9px] font-black uppercase tracking-widest">
                    <Clock size={12} /> {product.prepTime}
                  </div>
                  <div className="text-primary font-black text-sm">
                    R$ {product.price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center opacity-40">
              <UtensilsCrossed size={40} className="text-gray-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
