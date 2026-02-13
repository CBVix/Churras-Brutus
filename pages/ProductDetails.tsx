
import React, { useState } from 'react';
import { ChevronLeft, Star, Clock, Minus, Plus, ShoppingCart, CheckCircle2, Heart } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, extras: string[], observation: string, doneness?: string) => void;
  isDarkMode?: boolean;
  toggleFavorite?: () => void;
  isFavorite?: boolean;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onBack, onAddToCart, isDarkMode, toggleFavorite, isFavorite }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [observation, setObservation] = useState('');

  const extras = [
    { name: 'Farofa Especial', price: 2.50 },
    { name: 'Vinagrete Caseiro', price: 3.00 },
    { name: 'Maionese de Alho', price: 2.00 }
  ];

  const toggleExtra = (name: string) => {
    setSelectedExtras(prev => 
      prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]
    );
  };

  return (
    <div className={`min-h-screen pb-40 animate-in fade-in duration-500 transition-colors duration-500 ${isDarkMode ? 'bg-[#121212] text-white' : 'bg-[#F8FAFC]'}`}>
      <div className="relative h-[40vh] w-full px-4 pt-10">
        <div className={`w-full h-full rounded-2xl overflow-hidden shadow-2xl relative border-4 transition-colors ${isDarkMode ? 'border-[#1a1a1a]' : 'border-white'}`}>
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          <button 
            onClick={onBack}
            className={`absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${isDarkMode ? 'bg-black/60 text-white backdrop-blur-md' : 'bg-white/90 text-[#0F172A] backdrop-blur-md'}`}
          >
            <ChevronLeft size={20} />
          </button>
          {toggleFavorite && (
            <button 
              onClick={toggleFavorite}
              className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${isDarkMode ? 'bg-black/60 text-white backdrop-blur-md' : 'bg-white/90 text-[#0F172A] backdrop-blur-md'}`}
            >
              <Heart size={20} fill={isFavorite ? "#EF4444" : "none"} className={isFavorite ? "text-[#EF4444]" : "text-current"} />
            </button>
          )}
        </div>
      </div>

      <div className="px-6 mt-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className={`text-xl font-bold mb-1 transition-colors ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>{product.name}</h1>
            <div className="flex items-center gap-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-primary fill-primary" />
                <span className={isDarkMode ? 'text-gray-300' : 'text-[#0F172A]'}>{product.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-primary" />
                <span>{product.prepTime}</span>
              </div>
            </div>
          </div>
          <span className="text-lg font-bold text-primary">R$ {product.price.toFixed(2)}</span>
        </div>

        <p className={`text-sm leading-relaxed mb-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-[#64748B]'}`}>
          {product.description}
        </p>

        <div className="flex items-center justify-between mb-8">
           <h3 className={`font-bold text-sm ${isDarkMode ? 'text-gray-200' : 'text-[#0F172A]'}`}>Quantidade</h3>
           <div className={`flex items-center rounded-xl p-1 shadow-sm border transition-colors ${isDarkMode ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-silver'}`}>
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className={`w-10 text-center font-bold ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
              >
                <Plus size={16} />
              </button>
           </div>
        </div>

        <div className="space-y-6 mb-10">
          <div>
            <h3 className={`font-bold text-sm mb-4 ${isDarkMode ? 'text-gray-200' : 'text-[#0F172A]'}`}>Personalizar</h3>
            <div className="space-y-3">
              {extras.map(extra => (
                <div 
                  key={extra.name}
                  onClick={() => toggleExtra(extra.name)}
                  className={`flex justify-between items-center p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedExtras.includes(extra.name) 
                      ? (isDarkMode ? 'border-primary bg-primary/5' : 'border-primary bg-orange-50')
                      : (isDarkMode ? 'border-white/5 bg-[#1a1a1a]' : 'border-silver bg-white')
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      selectedExtras.includes(extra.name) ? 'bg-primary border-primary' : 'border-gray-500'
                    }`}>
                      {selectedExtras.includes(extra.name) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-[#334155]'}`}>{extra.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary">+R$ {extra.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className={`font-bold text-sm mb-4 ${isDarkMode ? 'text-gray-200' : 'text-[#0F172A]'}`}>Observações</h3>
            <textarea 
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, etc..."
              className={`w-full p-4 rounded-xl border shadow-sm min-h-[100px] focus:outline-none transition-all text-xs font-medium ${isDarkMode ? 'bg-[#1a1a1a] border-white/5 text-white placeholder-gray-700' : 'bg-white border-silver text-onyx'}`}
            />
          </div>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 p-6 z-50 transition-colors ${isDarkMode ? 'bg-[#1a1a1a]/95 border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]' : 'bg-white/95 border-t border-silver shadow-[0_-10px_30px_rgba(0,0,0,0.05)]'}`}>
        <button 
          onClick={() => onAddToCart(product, quantity, selectedExtras, observation)}
          className="w-full bg-primary h-14 rounded-xl flex items-center justify-center gap-3 text-white font-bold text-sm shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
        >
          <ShoppingCart size={18} />
          <span>Confirmar Seleção</span>
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;
