import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Package, Heart, LogOut } from 'lucide-react';

export default function Profile() {
  const { user, profile, signOut } = useAuth();

  if (!user) return <div className="p-20 text-center text-slate-400">Please sign in to view your profile.</div>;

  return (
    <div className="bg-slate-50 min-h-full py-12">
      <div className="max-w-4xl mx-auto px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-12 tracking-tight">Your Account</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* User Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 overflow-hidden border-4 border-white shadow-sm">
                <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" />
              </div>
              <h2 className="font-bold text-lg text-slate-900">{user.displayName}</h2>
              <p className="text-xs text-slate-400 mb-6">{user.email}</p>
              <button 
                onClick={signOut}
                className="w-full py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:border-red-200 hover:text-red-500 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>

            <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Membership</p>
              <h3 className="text-xl font-bold mb-4">Lexicon Elite</h3>
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-all">Manage Plan</button>
            </div>
          </div>

          {/* Activity */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Order History
              </h3>
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-sm text-slate-400">No orders found yet.</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Heart className="w-4 h-4 text-blue-600" />
                Your Wishlist
              </h3>
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-sm text-slate-400">Your wishlist is currently empty.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
