import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CheckCircle2, ArrowRight, Package, Download } from 'lucide-react';
import { motion } from 'motion/react';

export default function OrderSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="bg-slate-50 min-h-full flex items-center justify-center py-20 px-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
      >
        <div className="bg-blue-600 p-12 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full">
               <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                 <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
               </pattern>
               <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Order Confirmed</h1>
          <p className="text-blue-100 font-medium tracking-wide text-sm uppercase">Receipt #LX-94021-BC</p>
        </div>

        <div className="p-12 space-y-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">Your collection is on its way.</h2>
            <p className="text-slate-500 leading-relaxed font-medium">
              We've processed your acquisition and our logistics team is currently preparing your library materials for shipment. You'll receive a digital ledger update shortly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3 mb-4">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Expected Delivery</span>
               </div>
               <p className="text-sm font-bold text-slate-900 tracking-tight">Tuesday, 4th May</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3 mb-4">
                  <Download className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Digital Invoice</span>
               </div>
               <button className="text-sm font-bold text-slate-900 tracking-tight hover:text-blue-700 transition-colors">Download PDF</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link to="/catalog" className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10">
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/profile" className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-900 py-4 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
              Track Order
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
