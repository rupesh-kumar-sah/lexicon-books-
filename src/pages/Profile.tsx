import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import {
  Package,
  Heart,
  LogOut,
  User as UserIcon,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
  Edit2,
  Camera,
  Check,
  X as CloseIcon,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { orderApi } from '../lib/api';
import { Order } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-violet-50 text-violet-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
};

export default function Profile() {
  const { user, signOut, openAuthModal, updateProfile } = useAuth();
  const { wishlist } = useWishlist();
  const toast = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', photoURL: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    orderApi
      .mine()
      .then(({ orders }) => setOrders(orders))
      .catch(() => {})
      .finally(() => setLoading(false));
      
    setEditForm({ displayName: user.displayName, photoURL: user.photoURL || '' });
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

  const handleSave = async () => {
    if (!editForm.displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(editForm);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setEditForm(prev => ({ ...prev, photoURL: evt.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="bg-slate-50 min-h-full flex items-center justify-center px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner">
            <UserIcon className="w-9 h-9" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Access Your Profile</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">Sign in to track your orders, manage your wishlist, and customize your reading experience.</p>
          <button
            onClick={openAuthModal}
            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
          >
            Sign In / Sign Up
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-full py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Account</h1>
            <p className="text-slate-500 font-medium mt-1">Manage your identity and order activity.</p>
          </div>
          <div className="flex gap-3">
             <button
                onClick={signOut}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center gap-2 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
              
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-3xl bg-slate-100 mx-auto overflow-hidden border-4 border-white shadow-xl group-hover:shadow-blue-500/10 transition-shadow">
                  <img
                    src={isEditing ? editForm.photoURL : (user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=1d4ed8&color=fff`)}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <label className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-opacity">
                      <Camera className="w-8 h-8 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Display Name</label>
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({ displayName: user.displayName, photoURL: user.photoURL || '' });
                      }}
                      disabled={saving}
                      className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="font-black text-2xl text-slate-900 mb-1">{user.displayName}</h2>
                  <p className="text-sm text-slate-500 mb-4">{user.email}</p>
                  
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Reader since {new Date(user.createdAt).getFullYear()}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2 group/edit"
                  >
                    <Edit2 className="w-3.5 h-3.5 group-hover/edit:scale-110 transition-transform" />
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            <Link
              to="/wishlist"
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Your Wishlist</h3>
                  <p className="text-xs text-slate-400 font-medium">{wishlist.length} saved titles</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard icon={ShoppingBag} label="Orders" value={String(stats.orderCount)} accent="bg-blue-50 text-blue-700" />
              <StatCard icon={Package} label="Books" value={String(stats.itemsCount)} accent="bg-emerald-50 text-emerald-700" />
              <StatCard icon={TrendingUp} label="Spent" value={`Rs.${stats.totalSpent.toLocaleString()}`} accent="bg-violet-50 text-violet-700" />
            </div>

            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-3">
                  <Package className="w-6 h-6 text-blue-600" />
                  Order History
                </h3>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-20 bg-slate-50 rounded-2xl" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                  <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold mb-4 uppercase tracking-widest text-[10px]">No orders found</p>
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10"
                  >
                    Start Shopping
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <motion.div key={o.id} whileHover={{ x: 4 }}>
                      <Link
                        to={`/order/${o.id}`}
                        className="p-5 flex items-center justify-between gap-6 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-white hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-black text-slate-900">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                            <span className={cn('text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border', STATUS_COLORS[o.status])}>
                              {o.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} • {o.items.length} item(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-blue-700">Rs.{o.total.toFixed(2)}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
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
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
    >
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm', accent)}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{label}</p>
    </motion.div>
  );
}

