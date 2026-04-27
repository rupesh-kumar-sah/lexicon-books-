import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Heart, LogOut, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { orderApi } from '../lib/api';
import { Order } from '../types';

export default function Profile() {
  const { user, signOut, openAuthModal } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    orderApi
      .mine()
      .then(({ orders }) => setOrders(orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="bg-slate-50 min-h-full flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <UserIcon className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">You're not signed in</h2>
          <p className="text-slate-500 mb-8">Sign in to access your profile, wishlist, and order history.</p>
          <button
            onClick={openAuthModal}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-full py-12">
      <div className="max-w-4xl mx-auto px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-12 tracking-tight">Your Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-24 h-24 rounded-full bg-blue-100 mx-auto mb-4 overflow-hidden border-4 border-white shadow-sm">
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=1d4ed8&color=fff`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="font-bold text-lg text-slate-900">{user.displayName}</h2>
              <p className="text-xs text-slate-400 mb-6">{user.email}</p>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="block w-full mb-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all"
                >
                  Admin Dashboard
                </Link>
              )}
              <button
                onClick={signOut}
                className="w-full py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:border-rose-200 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Order History
              </h3>
              {loading ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-sm text-slate-400">No orders yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <li key={o.id} className="py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Order #{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(o.createdAt).toLocaleDateString()} • {o.items.length} item(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">${o.total.toFixed(2)}</p>
                        <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest">{o.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              to="/wishlist"
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Your Wishlist</h3>
                  <p className="text-xs text-slate-400">View saved books</p>
                </div>
              </div>
              <span className="text-blue-600 font-bold text-sm group-hover:translate-x-1 transition">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
