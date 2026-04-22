import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import { CreditCard, Truck, ShieldCheck, ArrowLeft, ChevronRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from '../constants';
import { cn } from '../lib/utils';

export default function Checkout() {
  const { items, total } = useCart();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zip: '',
    country: 'USA'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreeShipping = total >= FREE_SHIPPING_THRESHOLD;
  const shipping = total > 0 ? (isFreeShipping ? 0 : SHIPPING_FEE) : 0;
  const finalTotal = total + shipping;

  const [mockUrl, setMockUrl] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);
    setMockUrl(null);
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            title: i.title,
            author: i.author,
            image: i.coverImage,
            price: i.price,
            quantity: i.quantity
          })),
          customerDetails: formData
        })
      });

      const data = await response.json();
      
      if (data.mode === 'universal-simulation') {
        // Handle universal integration flow
        window.location.href = data.url;
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Checkout initialization failed.');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = '/order-success'; 
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-full py-12">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Left: Forms */}
        <div className="space-y-12">
          <div>
            <Link to="/cart" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-700 mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Catalog
            </Link>
            <h1 className="font-sans text-5xl font-bold mb-8 text-slate-900 tracking-tight leading-tight">Checkout</h1>
            <div className="flex items-center space-x-4">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    step >= s ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-200 text-slate-400"
                  )}>
                    {s}
                  </div>
                  {s === 1 && <div className="w-12 h-px mx-4 bg-slate-200" />}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shipping Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">First Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Delivery Address</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            </section>

            <button 
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full flex items-center justify-center space-x-3 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <span>{isProcessing ? 'Processing Transaction...' : 'Complete Transaction'}</span>
            </button>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
            <h2 className="text-xl font-bold mb-8 text-slate-900 tracking-tight">Order Information</h2>
            <div className="space-y-6 mb-10 max-h-[40vh] overflow-y-auto scrollbar-hide pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                    <img src={item.coverImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</p>
                    <p className="text-xs text-blue-700 font-medium mb-1">by {item.author}</p>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-tight">
                       <span>Qty: {item.quantity}</span>
                       <span className="text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-100 mb-8">
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Shipping</span>
                <span className="font-bold text-slate-900">{isFreeShipping ? 'Complimentary' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                <span className="text-lg font-bold text-slate-900">Total Due</span>
                <span className="text-3xl font-bold text-slate-900">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">Secure AES-256 Payment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
