import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from '../constants';
import { orderApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    address: '',
    city: '',
    zip: '',
    country: 'USA',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreeShipping = total >= FREE_SHIPPING_THRESHOLD;
  const shipping = total > 0 ? (isFreeShipping ? 0 : SHIPPING_FEE) : 0;
  const finalTotal = total + shipping;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const { orderId } = await orderApi.create({
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          author: i.author,
          coverImage: i.coverImage,
          price: i.price,
          quantity: i.quantity,
        })),
        customer: formData,
      });
      clearCart();
      navigate(`/order-success?id=${orderId}`);
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-50 min-h-full py-32 text-center px-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
        <Link to="/catalog" className="text-blue-600 font-bold hover:underline">
          Continue shopping →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-full py-12">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-20">
        <form onSubmit={handleCheckout} className="space-y-12">
          <div>
            <Link
              to="/cart"
              className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-700 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Cart
            </Link>
            <h1 className="font-sans text-5xl font-bold mb-8 text-slate-900 tracking-tight leading-tight">
              Checkout
            </h1>
          </div>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shipping Information</h2>

            <div className="space-y-4">
              <Field label="Email Address" required type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} />
                <Field label="Last Name" value={formData.lastName} onChange={(v) => setFormData({ ...formData, lastName: v })} />
              </div>
              <Field label="Delivery Address" required value={formData.address} onChange={(v) => setFormData({ ...formData, address: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" value={formData.city} onChange={(v) => setFormData({ ...formData, city: v })} />
                <Field label="ZIP" value={formData.zip} onChange={(v) => setFormData({ ...formData, zip: v })} />
              </div>
            </div>
          </section>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full flex items-center justify-center space-x-3 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <span>{isProcessing ? 'Processing...' : `Place Order — $${finalTotal.toFixed(2)}`}</span>
          </button>
        </form>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
            <h2 className="text-xl font-bold mb-8 text-slate-900 tracking-tight">Order Summary</h2>
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
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">
                Encrypted, secure checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
      />
    </div>
  );
}
