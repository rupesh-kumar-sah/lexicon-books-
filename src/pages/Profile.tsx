import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import {
  Package,
  Heart,
  LogOut,
  User as UserIcon,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { orderApi } from '../lib/api';
import { Order } from '../types';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-violet-50 text-violet-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
};

export default function Profile() {
  const { user, signOut, openAuthModal } = useAuth();
  const { wishlist } = useWishlist();
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

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'cancelled');
    const totalSpent = active.reduce((s, o) => s + o.total, 0);
    const itemsCount = active.reduce(
      (s, o) => s + o.items.reduce((q, it) => q + it.quantity, 0),
      0
    );
    return {
      orderCount: orders.length,
      totalSpent,
      itemsCount,
    };
  }, [orders]);

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
      <div className="max-w-5xl mx-auto px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-12 tracking-tight">Your Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              <p className="text-xs text-slate-400 mb-2">{user.email}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
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

            <Link
              to="/wishlist"
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Wishlist</h3>
                  <p className="text-xs text-slate-400">{wishlist.length} saved</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={ShoppingBag} label="Orders" value={String(stats.orderCount)} accent="bg-blue-50 text-blue-700" />
              <StatCard icon={Package} label="Books" value={String(stats.itemsCount)} accent="bg-emerald-50 text-emerald-700" />
              <StatCard icon={TrendingUp} label="Spent" value={`$${stats.totalSpent.toFixed(0)}`} accent="bg-violet-50 text-violet-700" />
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Order History
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-slate-50 rounded-xl" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-sm text-slate-400 mb-4">No orders yet.</p>
                  <Link
                    to="/catalog"
                    className="inline-block text-blue-600 font-bold text-sm hover:underline"
                  >
                    Start exploring →
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <li key={o.id}>
                      <Link
                        to={`/order/${o.id}`}
                        className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50 -mx-3 px-3 rounded-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString()} • {o.items.length} item(s)
                          </p>
                        </div>
                        <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded', STATUS_COLORS[o.status])}>
                          {o.status}
                        </span>
                        <p className="text-sm font-bold text-slate-900 w-20 text-right">${o.total.toFixed(2)}</p>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', accent)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{label}</p>
    </div>
  );
}
