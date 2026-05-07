import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Cart() {
  const { settings } = useSiteSettings();
  const { items, removeFromCart, updateQuantity, total } = useCart();
  
  const isFreeShipping = total >= settings.freeShippingThreshold;
  const subtotal = total;
  const shipping = total > 0 ? (isFreeShipping ? 0 : settings.shippingKtm) : 0; // estimate based on KTM
  const finalTotal = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-32 text-center bg-slate-50 min-h-full">
        <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-white rounded-full border border-slate-200 shadow-sm text-slate-300">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="font-sans text-4xl font-bold mb-4 text-slate-900 leading-tight">Your collection is empty.</h2>
        <p className="text-slate-500 mb-10 max-w-md mx-auto font-medium">Explore our curated selection to begin building your personal library.</p>
        <Link to="/catalog" className="inline-flex items-center justify-center px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
          Begin Exploring
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 bg-slate-50 min-h-full">
      <h1 className="font-sans text-4xl font-bold mb-12 text-slate-900 tracking-tight">Your Shopping Bag</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="w-24 sm:w-28 aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                
                <div className="flex-grow flex flex-col min-h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{item.title}</h3>
                      <p className="text-sm font-medium text-blue-700">{item.author}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-auto">{item.genre}</div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1.5 hover:bg-white rounded transition-all text-slate-500"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1.5 hover:bg-white rounded transition-all text-slate-500"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-xl font-bold text-slate-900">Rs.{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm sticky top-24">
            <h2 className="font-bold text-xl mb-8 text-slate-900 tracking-tight">Order Summary</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">Rs.{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Shipping</span>
                {isFreeShipping ? (
                  <span className="font-bold text-emerald-600 uppercase text-[10px] tracking-widest">Complimentary</span>
                ) : (
                  <span className="font-bold text-slate-900">Rs.{shipping.toFixed(2)}</span>
                )}
              </div>
              {!isFreeShipping && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                   <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tight">
                    Add Rs.{(settings.freeShippingThreshold - subtotal).toFixed(2)} for free shipping.
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-8 border-t border-slate-200 flex justify-between items-center mb-10">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-3xl font-bold text-slate-900">Rs.{finalTotal.toFixed(2)}</span>
            </div>
            
            <Link 
              to="/checkout"
              className="w-full flex items-center justify-center space-x-3 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20"
            >
              <span>Complete Purchase</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
