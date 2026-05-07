import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Book as BookIcon,
  Settings,
  Plus,
  Search,
  MoveVertical as MoreVertical,
  X,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ShieldAlert,
  Loader as Loader2,
  Star as StarIcon,
  ShoppingBag,
  TrendingUp,
  Users as UsersIcon,
  DollarSign,
  Package,
  AlertTriangle,
  Trash2,
  Palette,
  Save,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { adminApi, bookApi } from '../lib/api';
import { cn } from '../lib/utils';
import { GENRES } from '../constants';
import { AdminOrder, AdminStats, AdminUser, Book, OrderStatus, SiteSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useNavigate, Link } from 'react-router-dom';

type Tab = 'dashboard' | 'inventory' | 'orders' | 'users' | 'settings';

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
          Verifying Credentials...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLoginForm />;
  }

  const openAdd = () => {
    setSelectedBook(null);
    setModalMode('add');
  };
  const openEdit = (b: Book) => {
    setSelectedBook(b);
    setModalMode('edit');
  };
  const closeModal = () => setModalMode(null);
  const onSaved = () => {
    closeModal();
    setRefreshKey((k) => k + 1);
  };

  const titles: Record<Tab, string> = {
    dashboard: 'Analytics',
    inventory: 'Inventory',
    orders: 'Orders',
    users: 'Users',
    settings: 'Site Settings',
  };

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Management</p>
          <nav className="space-y-2">
            {[
              { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Analytics' },
              { id: 'inventory' as Tab, icon: BookIcon, label: 'Inventory' },
              { id: 'orders' as Tab, icon: ShoppingBag, label: 'Orders' },
              { id: 'users' as Tab, icon: UsersIcon, label: 'Users' },
              { id: 'settings' as Tab, icon: Settings, label: 'Site Settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-blue-700'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 space-y-2">

          <button className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-blue-700 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto relative">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="font-sans text-4xl font-bold mb-2 text-slate-900 tracking-tight">
              {titles[activeTab]}
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Manage your BookSellNP storefront.
            </p>
          </div>
          {activeTab === 'inventory' && (
            <button
              onClick={openAdd}
              className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Book</span>
            </button>
          )}
        </header>

        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'inventory' && <InventoryView key={refreshKey} onEdit={openEdit} />}
        {activeTab === 'orders' && <OrdersView />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'settings' && <ThemesView />}

        <AnimatePresence>
          {modalMode && (
            <BookEntryModal mode={modalMode} book={selectedBook} onClose={closeModal} onSaved={onSaved} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-violet-100 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

const PIE_COLORS = ['#2563eb', '#7c3aed', '#dc2626', '#16a34a', '#ea580c', '#0891b2'];

function DashboardView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .stats()
      .then((res) => {
        if (res && typeof res.totalRevenue === 'number') {
          setStats(res);
        }
      })
      .catch((e) => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse h-32 bg-white border border-slate-200 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center text-rose-600 font-medium">
        {error || 'No data available'}
      </div>
    );
  }

  const cards = [
    { label: 'Total Revenue', value: `Rs.${stats.totalRevenue.toFixed(2)}`, helper: 'Excl. cancelled', icon: DollarSign, accent: 'emerald' },
    { label: 'Orders', value: stats.totalOrders, helper: 'All time', icon: ShoppingBag, accent: 'blue' },
    { label: 'Customers', value: stats.totalUsers, helper: 'Registered readers', icon: UsersIcon, accent: 'violet' },
    { label: 'Catalog', value: stats.totalBooks, helper: 'Titles in stock', icon: BookIcon, accent: 'amber' },
  ];

  const accentMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={cn('p-2.5 rounded-xl', accentMap[c.accent])}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{c.value}</p>
            <p className="text-xs text-slate-400 mt-2">{c.helper}</p>
          </div>
        ))}
      </div>

      {stats.lowStockCount > 0 && (
        <div className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-amber-900">Low stock alert</p>
            <p className="text-sm text-amber-800">
              {stats.lowStockCount} {stats.lowStockCount === 1 ? 'title has' : 'titles have'} 5 or fewer copies remaining.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Last 14 Days</h3>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Revenue & Orders
              </h2>
            </div>
          </div>
          {stats.dailyOrders.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">
              No order activity in the last 14 days.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyOrders}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#revenue)"
                    name="Revenue (Rs.)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Catalog Mix</h3>
            <h2 className="text-lg font-bold text-slate-900">By Genre</h2>
          </div>
          {stats.topGenres.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topGenres}
                    dataKey="count"
                    nameKey="genre"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {stats.topGenres.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Activity</h3>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Recent Orders
          </h2>
        </div>
        {stats.recentOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            No orders yet — your first sale is around the corner.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{o.customerName || o.customerEmail}</p>
                  <p className="text-xs text-slate-400">
                    #{o.id.slice(0, 8)} · {o.itemCount} items · {new Date(o.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className={cn('text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border', STATUS_COLORS[o.status])}>
                  {o.status}
                </div>
                <p className="font-bold text-slate-900 w-20 text-right">Rs.{o.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersView() {
  const toast = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const reload = () => {
    setLoading(true);
    adminApi
      .orders({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        limit: 200,
      })
      .then((res) => {
        if (res && Array.isArray(res.orders)) {
          setOrders(res.orders);
        }
      })
      .catch((e) => toast.error(e.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [statusFilter, search]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdating(id);
    try {
      await adminApi.updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success(`Order updated to ${status}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setUpdating(null);
    }
  };

  const removeOrder = async (id: string) => {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return;
    setUpdating(id);
    try {
      await adminApi.deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast.success('Order deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setUpdating(null);
    }
  };

  const statusOptions: (OrderStatus | 'all')[] = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by email, name, or order ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-medium italic">
            No orders match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((o) => (
              <div key={o.id} className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-bold text-slate-900">{o.customerName || o.customerEmail}</p>
                      <div className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border', STATUS_COLORS[o.status])}>
                        {o.status}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      #{o.id.slice(0, 8)} · {o.customerEmail} · {new Date(o.createdAt).toLocaleString()} · {o.items.length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">Rs.{o.total.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={o.status}
                      disabled={updating === o.id}
                      onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                      className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500/30 outline-none disabled:opacity-50"
                    >
                      {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                      className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      {expanded === o.id ? 'Hide' : 'Items'}
                    </button>
                    <button
                      onClick={() => removeOrder(o.id)}
                      disabled={updating === o.id}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-50"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expanded === o.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-6">
                        {o.status === 'cancelled' && (
                          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            This order has been cancelled and any reserved stock has been returned.
                          </div>
                        )}
                        
                        <div className="grid md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Shipping To</p>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <p className="font-bold text-slate-900 text-sm mb-1">{o.customerName}</p>
                              <p className="text-xs text-slate-600 leading-relaxed mb-3">{o.shippingAddress}</p>
                              <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                                <Phone className="w-3.5 h-3.5" />
                                {o.customerPhone || 'No phone provided'}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-tighter">Placed on {new Date(o.createdAt).toLocaleString()}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Payment Summary</p>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Subtotal</span>
                                <span className="font-bold text-slate-900">Rs.{o.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Shipping</span>
                                <span className="font-bold text-slate-900">Rs.{o.shipping.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-slate-200">
                                <span className="font-bold text-slate-900">Total</span>
                                <span className="font-bold text-blue-700">Rs.{o.total.toFixed(2)}</span>
                              </div>
                            </div>

                            {o.locationCoords ? (
                              <div className="mt-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Pinned Delivery Location</p>
                                <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                                  <div className="aspect-video bg-slate-200 relative group">
                                    <img 
                                      src={`https://maps.googleapis.com/maps/api/staticmap?center=${o.locationCoords.lat},${o.locationCoords.lng}&zoom=15&size=400x250&markers=color:red%7C${o.locationCoords.lat},${o.locationCoords.lng}&key=${(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY}`}
                                      alt="Delivery Location Map"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center', 'text-slate-400', 'text-[10px]');
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-center p-4">Google Maps Key Error or Static Map API Disabled</div>';
                                      }}
                                    />
                                    <a 
                                      href={`https://www.google.com/maps?q=${o.locationCoords.lat},${o.locationCoords.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2"
                                    >
                                      <MapPin className="w-4 h-4" />
                                      Open in Google Maps
                                    </a>
                                  </div>
                                  <div className="p-3 text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                                    Coords: {o.locationCoords.lat.toFixed(5)}, {o.locationCoords.lng.toFixed(5)}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                No coordinate data for this order
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Items ({o.items.length})</p>
                            <ul className="space-y-3">
                              {o.items.map((it: any, i: number) => (
                                <li key={i} className="flex gap-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                  <img
                                    src={it.coverImage}
                                    alt=""
                                    className="w-10 h-14 object-cover rounded border border-slate-100 shadow-sm"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 text-xs truncate leading-tight mb-0.5">{it.title}</p>
                                    <p className="text-[10px] text-slate-400 mb-2 truncate">{it.author}</p>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                        Qty: {it.quantity}
                                      </span>
                                      <span className="text-xs font-bold text-blue-700">Rs.{(it.price * it.quantity).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookEntryModal({
  mode,
  book,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  book?: Book | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [formData, setFormData] = useState<Partial<Book>>({
    title: book?.title || '',
    author: book?.author || '',
    description: book?.description || '',
    price: book?.price || 0,
    coverImage: book?.coverImage || '',
    isbn: book?.isbn || '',
    genre: book?.genre || GENRES[0],
    stock: book?.stock || 0,
    rating: book?.rating || 5,
    year: book?.year || new Date().getFullYear(),
    featured: book?.featured || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'edit' && book?.id) {
        await bookApi.update(book.id, formData);
        toast.success(`Updated "${formData.title}"`);
      } else {
        await bookApi.create(formData);
        toast.success(`Added "${formData.title}" to the catalog`);
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'edit' ? 'Edit Book' : 'New Book'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              {mode === 'edit' ? 'Update inventory entry' : 'Register a new title'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-rose-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Title" required value={formData.title} onChange={(v) => setFormData({ ...formData, title: v })} />
            <Field label="Author" required value={formData.author} onChange={(v) => setFormData({ ...formData, author: v })} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Cover Image (URL or Upload)</label>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={formData.coverImage?.startsWith('data:') ? '(uploaded image)' : formData.coverImage || ''}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                placeholder="https://... or click Upload"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
              <label className="shrink-0 px-4 py-3 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      setFormData((prev) => ({ ...prev, coverImage: evt.target?.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                {formData.coverImage ? (
                  <img src={formData.coverImage} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>
            {formData.coverImage?.startsWith('data:') && (
              <p className="text-[10px] text-emerald-600 font-bold ml-1">✓ Image uploaded successfully</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description</label>
            <textarea
              required
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Field label="Price (Rs.)" required type="number" step="0.01" min="0" value={String(formData.price ?? 0)} onChange={(v) => setFormData({ ...formData, price: Number(v) })} />
            <Field label="Stock" required type="number" min="0" value={String(formData.stock ?? 0)} onChange={(v) => setFormData({ ...formData, stock: Number(v) })} />
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Genre</label>
              <select
                required
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold uppercase tracking-widest appearance-none"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <Field label="ISBN" required value={formData.isbn || ''} onChange={(v) => setFormData({ ...formData, isbn: v })} />
            <Field label="Year" required type="number" min="1" max={String(new Date().getFullYear())} value={String(formData.year ?? new Date().getFullYear())} onChange={(v) => setFormData({ ...formData, year: Number(v) })} />
            <Field label="Rating" required type="number" min="0" max="5" step="0.1" value={String(formData.rating ?? 5)} onChange={(v) => setFormData({ ...formData, rating: Number(v) })} />
            <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-xs font-bold text-slate-700">Featured</span>
            </label>
          </div>

          <div className="flex items-center space-x-4 pt-4 border-t border-slate-50">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Book' : 'Create Book'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
      />
    </div>
  );
}

function InventoryView({ onEdit }: { key?: React.Key | string | number; onEdit: (book: Book) => void }) {
  const toast = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Book; direction: 'asc' | 'desc' }>({
    key: 'title',
    direction: 'asc',
  });

  const reload = () => {
    setLoading(true);
    bookApi
      .list({ limit: 500 })
      .then(({ books }) => setBooks(books))
      .catch((e) => toast.error(e.message || 'Failed to load inventory'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await bookApi.remove(id);
      toast.success(`Removed "${title}"`);
      reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete book.');
    }
  };

  const requestSort = (key: keyof Book) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filtered = useMemo(() => {
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.isbn?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [books, searchTerm]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortConfig]);

  const SortIcon = ({ column }: { column: keyof Book }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-400 font-medium">
          {filtered.length} of {books.length} titles
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <Th onClick={() => requestSort('title')}>Title <SortIcon column="title" /></Th>
              <Th onClick={() => requestSort('stock')}>Stock <SortIcon column="stock" /></Th>
              <Th onClick={() => requestSort('price')}>Price <SortIcon column="price" /></Th>
              <Th onClick={() => requestSort('rating')}>Rating <SortIcon column="rating" /></Th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-8 py-6 h-20 bg-slate-50/20" />
                </tr>
              ))
            ) : sorted.length > 0 ? (
              sorted.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-14 bg-slate-100 rounded border border-slate-100 overflow-hidden shrink-0 shadow-sm">
                        <img src={book.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{book.title}</h4>
                        <p className="text-xs text-blue-700 font-medium">
                          {book.author} • {book.genre}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            book.stock > 10
                              ? 'bg-emerald-500'
                              : book.stock > 0
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          )}
                          style={{ width: `${Math.min(100, (book.stock / 50) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 uppercase">{book.stock} units</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-sm text-slate-900">Rs.{book.price.toFixed(2)}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-blue-600">
                      <StarIcon className="w-3 h-3 fill-current mr-1" />
                      <span className="text-xs font-bold text-slate-900">{book.rating.toFixed(1)}</span>
                      {book.reviewCount && book.reviewCount > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">({book.reviewCount})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="relative group inline-block">
                      <button className="p-2 text-slate-300 hover:text-blue-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-30 overflow-hidden text-[10px] font-bold uppercase tracking-widest">
                        <button
                          onClick={() => onEdit(book)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(book.id, book.title)}
                          className="w-full text-left px-4 py-3 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                  No matches found in the inventory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
    >
      <div className="flex items-center">{children}</div>
    </th>
  );
}

// ============================================================ USERS VIEW
function UsersView() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const reload = () => {
    setLoading(true);
    adminApi
      .users(search || undefined)
      .then(({ users }) => setUsers(users))
      .catch((e) => toast.error(e.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [search]);

  const changeRole = async (u: AdminUser, role: 'admin' | 'user') => {
    setBusy(u.id);
    try {
      await adminApi.updateUserRole(u.id, role);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      toast.success(`${u.email} is now ${role}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update role');
    } finally {
      setBusy(null);
    }
  };

  const removeUser = async (u: AdminUser) => {
    if (!confirm(`Permanently delete ${u.email}? Their orders will remain but become unattached.`)) return;
    setBusy(u.id);
    try {
      await adminApi.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success('User deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user');
    } finally {
      setBusy(null);
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const customerCount = users.length - adminCount;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatPill label="Total Members" value={users.length} icon={UsersIcon} tone="blue" />
        <StatPill label="Administrators" value={adminCount} icon={ShieldCheck} tone="violet" />
        <StatPill label="Customers" value={customerCount} icon={Mail} tone="emerald" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-medium italic">No users found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const initials = (u.displayName || u.email).slice(0, 2).toUpperCase();
              return (
                <div key={u.id} className="p-5 flex items-center gap-4 flex-wrap">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 truncate">{u.displayName || '—'}</p>
                      {u.role === 'admin' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Spend</p>
                    <p className="text-sm font-bold text-slate-900">
                      Rs.{u.totalSpent.toFixed(2)} <span className="text-slate-400 font-medium">· {u.orderCount} orders</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      disabled={busy === u.id || isSelf}
                      onChange={(e) => changeRole(u, e.target.value as 'admin' | 'user')}
                      className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500/30 outline-none disabled:opacity-50"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      onClick={() => removeUser(u)}
                      disabled={busy === u.id || isSelf}
                      title={isSelf ? "You can't delete yourself" : 'Delete user'}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: any;
  tone: 'blue' | 'violet' | 'emerald';
}) {
  const toneCls = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', toneCls)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// =========================================================== THEMES VIEW
function ThemesView() {
  const toast = useToast();
  const { settings, refresh } = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const presets: { name: string; primary: string; accent: string }[] = [
    { name: 'Cobalt', primary: '#2563eb', accent: '#0f172a' },
    { name: 'Emerald', primary: '#059669', accent: '#064e3b' },
    { name: 'Sunset', primary: '#ea580c', accent: '#7c2d12' },
    { name: 'Plum', primary: '#7c3aed', accent: '#3b0764' },
    { name: 'Rose', primary: '#e11d48', accent: '#4c0519' },
    { name: 'Ink', primary: '#0f172a', accent: '#1e293b' },
  ];

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const applyPreset = (p: { primary: string; accent: string }) =>
    setForm((f) => ({ ...f, primaryColor: p.primary, accentColor: p.accent }));

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.saveSettings(form);
      await refresh();
      toast.success('Theme saved — site updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr,420px] gap-6">
      {/* Editor */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Branding</p>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Site Name" value={form.siteName} onChange={(v) => update('siteName', v)} />
              <Field label="Tagline" value={form.tagline} onChange={(v) => update('tagline', v)} />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Color Presets</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {presets.map((p) => {
                const isActive = form.primaryColor.toLowerCase() === p.primary.toLowerCase();
                return (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className={cn(
                      'group relative rounded-xl p-3 border transition-all text-left',
                      isActive
                        ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex gap-1 mb-2">
                      <span className="w-6 h-6 rounded-md" style={{ background: p.primary }} />
                      <span className="w-6 h-6 rounded-md" style={{ background: p.accent }} />
                    </div>
                    <p className="text-xs font-bold text-slate-700">{p.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Custom Colors</p>
            <div className="grid md:grid-cols-2 gap-4">
              <ColorField label="Primary" value={form.primaryColor} onChange={(v) => update('primaryColor', v)} />
              <ColorField label="Accent" value={form.accentColor} onChange={(v) => update('accentColor', v)} />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Shipping Fees & Policies (Rs.)</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Inside Kathmandu" type="number" min="0" value={String(form.shippingKtm)} onChange={(v) => update('shippingKtm', Number(v))} />
              <Field label="Outside Valley" type="number" min="0" value={String(form.shippingOutside)} onChange={(v) => update('shippingOutside', Number(v))} />
              <Field label="Free Shipping Over" type="number" min="0" value={String(form.freeShippingThreshold)} onChange={(v) => update('freeShippingThreshold', Number(v))} />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Legal Pages (Markdown supported)</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Privacy Policy</label>
                <textarea
                  value={form.privacyContent}
                  onChange={(e) => update('privacyContent', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium h-32 resize-y"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Terms of Service</label>
                <textarea
                  value={form.termsContent}
                  onChange={(e) => update('termsContent', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium h-32 resize-y"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Footer Texts</p>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Security Badge Text" value={form.footerText1} onChange={(v) => update('footerText1', v)} />
              <Field label="Return Policy Text" value={form.footerText2} onChange={(v) => update('footerText2', v)} />
              <Field label="Shipping Info Text" value={form.footerText3} onChange={(v) => update('footerText3', v)} />
              <Field label="Company Name" value={form.footerCompany} onChange={(v) => update('footerCompany', v)} />
              <Field label="Privacy Link Text" value={form.footerLink1} onChange={(v) => update('footerLink1', v)} />
              <Field label="Terms Link Text" value={form.footerLink2} onChange={(v) => update('footerLink2', v)} />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Hero Image (optional URL)</p>
            <Field
              label="Hero Image URL"
              value={form.heroImage}
              onChange={(v) => update('heroImage', v)}
              placeholder="https://..."
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg active:scale-95 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Theme</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Preview</p>
        <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="h-12 border-b border-slate-200 flex items-center px-5">
            <span className="text-sm font-bold tracking-tighter uppercase" style={{ color: form.primaryColor }}>
              {(form.siteName.split(' ')[0] || form.siteName).toUpperCase()}
              <span className="text-slate-400 font-light">{form.siteName.slice((form.siteName.split(' ')[0] || '').length).trim() && ' ' + form.siteName.slice((form.siteName.split(' ')[0] || '').length).trim().toUpperCase()}</span>
            </span>
          </div>
          <div
            className="p-8"
            style={{
              background: `linear-gradient(135deg, ${form.primaryColor}10, ${form.accentColor}05)`,
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded inline-block mb-4"
              style={{ background: `${form.primaryColor}20`, color: form.primaryColor }}
            >
              Curated Reading
            </p>
            <h2
              className="text-3xl font-bold leading-tight tracking-tight mb-2"
              style={{ color: form.accentColor }}
            >
              {form.siteName}
            </h2>
            <p className="text-sm text-slate-500 mb-6">{form.tagline}</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow"
                style={{ background: form.primaryColor }}
              >
                Browse
              </button>
              <button
                className="px-4 py-2 rounded-lg text-xs font-bold border bg-white"
                style={{ borderColor: form.accentColor, color: form.accentColor }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Saving applies your theme to every visitor. The navbar logo, hero, and primary buttons read from these
          colors.
        </p>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-12 rounded-lg border border-slate-200 cursor-pointer bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2563eb"
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500/30 outline-none"
        />
      </div>
    </div>
  );
}

function AdminLoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // In development mode, skip geolocation requirement
      if (import.meta.env.DEV) {
        await signIn(email.trim(), password, { latitude: 0, longitude: 0, device: 'development' });
      } else {
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser. (Are you using HTTP instead of HTTPS?)');
        }
        const device = navigator.userAgent;
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        await signIn(email.trim(), password, { latitude: lat, longitude: lng, device });
      }
    } catch (err: any) {
      if (err.code === 1) setError('Location permission denied. Please enable it in your browser settings.');
      else if (err.code === 2) setError('Location unavailable. Make sure your device GPS is turned on.');
      else if (err.code === 3) setError('Location request timed out.');
      else setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Admin Portal</h2>
        <p className="text-sm text-center text-slate-500 mb-8">
          Secure login requires location and verified device.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          {error && (
            <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-xl border border-rose-100">
              {error}
            </div>
          )}
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-rose-600 transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Verify & Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
