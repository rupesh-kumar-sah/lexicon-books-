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
  Archive,
  Phone,
  MapPin,
  RefreshCw,
  ExternalLink,
  Copy,
  ChevronDown,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Fingerprint,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
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
import { adminApi, authApi, bookApi } from '../lib/api';
import { cn } from '../lib/utils';
import { GENRES } from '../constants';
import { AdminOrder, AdminStats, AdminUser, Book, OrderStatus, SiteSettings, ContactMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useNavigate, Link } from 'react-router-dom';

type Tab = 'dashboard' | 'inventory' | 'orders' | 'users' | 'messages' | 'settings';

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
  const openDuplicate = (b: Book) => {
    setSelectedBook({ ...b, title: `${b.title} (Copy)`, isbn: '', stock: 0 });
    setModalMode('add');
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
      messages: 'Messages',
      settings: 'Site Settings',
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 overflow-x-auto lg:overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Management</p>
          <nav className="flex lg:block gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
            {[
              { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Analytics' },
              { id: 'inventory' as Tab, icon: BookIcon, label: 'Inventory' },
              { id: 'orders' as Tab, icon: ShoppingBag, label: 'Orders' },
              { id: 'users' as Tab, icon: UsersIcon, label: 'Users' },
              { id: 'messages' as Tab, icon: Mail, label: 'Messages' },
              { id: 'settings' as Tab, icon: Settings, label: 'Site Settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'shrink-0 lg:w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition-all',
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

        <div className="hidden lg:block mt-auto p-8 border-t border-slate-100 space-y-2">

          <button type="button" onClick={() => setActiveTab('settings')} className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="admin-main-content flex-1 min-w-0 p-4 sm:p-6 lg:p-12 overflow-y-auto relative">
        <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8 lg:mb-12">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-slate-900 tracking-tight">
              {titles[activeTab]}
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Manage your BookSellNP storefront.
            </p>
          </div>
          {activeTab === 'inventory' && (
            <button
              onClick={openAdd}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-900 text-white px-5 sm:px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Book</span>
            </button>
          )}
        </header>

        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'inventory' && <InventoryView key={refreshKey} onAdd={openAdd} onEdit={openEdit} onDuplicate={openDuplicate} />}
        {activeTab === 'orders' && <OrdersView />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'messages' && <MessagesView />}
        {activeTab === 'settings' && <><ThemesView /><AdminPasskeyPanel /></>}

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


const ADMIN_MAP_CENTER = { lat: 27.7172, lng: 85.324 };

type Coordinates = { lat: number; lng: number };

function normalizeLocationCoords(raw: unknown): Coordinates | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

const ORDER_STATUS_META: Record<OrderStatus, { label: string; icon: any; tone: string }> = {
  pending: { label: 'Pending', icon: Clock, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  processing: { label: 'Processing', icon: Package, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  shipped: { label: 'Shipped', icon: Truck, tone: 'text-violet-700 bg-violet-50 border-violet-200' },
  delivered: { label: 'Delivered', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
};


function DashboardView({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
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
    { label: 'Total Revenue', value: `Rs.${stats.totalRevenue.toFixed(2)}`, helper: 'Review all orders', icon: DollarSign, accent: 'emerald', tab: 'orders' as Tab },
    { label: 'Orders', value: stats.totalOrders, helper: 'Open order management', icon: ShoppingBag, accent: 'blue', tab: 'orders' as Tab },
    { label: 'Customers', value: stats.totalUsers, helper: 'Open user management', icon: UsersIcon, accent: 'violet', tab: 'users' as Tab },
    { label: 'Catalog', value: stats.totalBooks, helper: 'Open inventory controls', icon: BookIcon, accent: 'amber', tab: 'inventory' as Tab },
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
          <button type="button" key={c.label} onClick={() => onNavigate(c.tab)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
            <div className="flex items-start justify-between mb-4">
              <div className={cn('p-2.5 rounded-xl', accentMap[c.accent])}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{c.label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{c.value}</p>
            <p className="text-xs text-slate-400 mt-2">{c.helper}</p>
          </button>
        ))}
      </div>

      {stats.lowStockCount > 0 && (
        <div className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-900">Low stock alert</p>
            <p className="text-sm text-amber-800">
              {stats.lowStockCount} {stats.lowStockCount === 1 ? 'title has' : 'titles have'} 5 or fewer copies remaining.
            </p>
          </div>
          <button type="button" onClick={() => onNavigate('inventory')} className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2">Open Inventory</button>
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
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const mapsApiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useJsApiLoader({
    id: 'admin-google-map-script',
    googleMapsApiKey: mapsApiKey,
  });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await adminApi.orders({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        limit: 200,
      });
      if (res && Array.isArray(res.orders)) {
        setOrders(res.orders.map((order: AdminOrder) => ({
          ...order,
          locationCoords: normalizeLocationCoords(order.locationCoords),
        })));
        setLastRefreshed(Date.now());
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, [statusFilter, search]);

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
      if (expanded === id) setExpanded(null);
      toast.success('Order deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setUpdating(null);
    }
  };

  const copyOrderId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success('Full order ID copied');
    } catch {
      toast.error('Could not copy order ID');
    }
  };

  const statusOptions: (OrderStatus | 'all')[] = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
    return counts;
  }, {});
  const totalVisibleValue = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Visible orders</p>
          <p className="text-2xl font-bold mt-1">{orders.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Rs.{totalVisibleValue.toFixed(2)} value</p>
        </div>
        {(['pending', 'processing', 'shipped', 'delivered'] as OrderStatus[]).map((status) => {
          const meta = ORDER_STATUS_META[status];
          const Icon = meta.icon;
          return (
            <div key={status} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{meta.label}</p>
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{statusCounts[status] || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1">Current filter</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col xl:flex-row gap-4 items-stretch xl:items-center">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Search by email, name, phone, address, or order ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
          />
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
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
        <button
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <p>{lastRefreshed ? `Updated ${new Date(lastRefreshed).toLocaleTimeString()}` : 'Waiting for order data'}</p>
        <p>Open an order to view customer, payment, items, coordinates, and map</p>
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
            {orders.map((o) => {
              const meta = ORDER_STATUS_META[o.status];
              const StatusIcon = meta.icon;
              const isOpen = expanded === o.id;
              return (
                <div key={o.id} className={cn('p-5 md:p-6 transition-colors', isOpen && 'bg-blue-50/20')}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className={cn('mt-0.5 w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', meta.tone)}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900">{o.customerName || o.customerEmail}</p>
                          <div className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border', STATUS_COLORS[o.status])}>
                            {o.status}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          #{o.id.slice(0, 8).toUpperCase()} · {o.customerEmail} · {new Date(o.createdAt).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] font-semibold text-slate-500 flex-wrap">
                          <span>{o.items.length} {o.items.length === 1 ? 'item' : 'items'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{o.locationCoords ? 'Pinned location' : 'No location pin'}</span>
                          <span className="text-slate-300">•</span>
                          <span>{o.customerPhone || 'No phone'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">Rs.{o.total.toFixed(2)}</p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">Order total</p>
                      </div>
                      <select
                        value={o.status}
                        disabled={updating === o.id}
                        onChange={(e) => void updateStatus(o.id, e.target.value as OrderStatus)}
                        className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500/30 outline-none disabled:opacity-50"
                        aria-label={`Update status for order ${o.id}`}
                      >
                        {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setExpanded(isOpen ? null : o.id)}
                        className={cn('inline-flex items-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors', isOpen ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50')}
                      >
                        {isOpen ? 'Hide details' : 'View details'}
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
                      </button>
                      <button
                        onClick={() => void removeOrder(o.id)}
                        disabled={updating === o.id}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-50"
                        title="Delete order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 pt-5 border-t border-slate-200 space-y-5">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order reference</p>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{o.id}</code>
                                <button onClick={() => void copyOrderId(o.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Copy full order ID"><Copy className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <a
                              href={`mailto:${o.customerEmail}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                            >
                              <Mail className="w-3.5 h-3.5" /> Contact customer
                            </a>
                          </div>

                          {o.status === 'cancelled' && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2">
                              <Trash2 className="w-4 h-4" />
                              This order has been cancelled and reserved stock has been returned.
                            </div>
                          )}

                          <div className="grid lg:grid-cols-3 gap-5">
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Customer & delivery</p>
                              <p className="font-bold text-slate-900 text-sm">{o.customerName || 'Unnamed customer'}</p>
                              <a href={`mailto:${o.customerEmail}`} className="text-xs text-blue-600 hover:underline break-all">{o.customerEmail}</a>
                              <p className="text-xs text-slate-600 leading-relaxed mt-3">{o.shippingAddress || 'No shipping address provided'}</p>
                              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mt-3">
                                <Phone className="w-3.5 h-3.5" />
                                {o.customerPhone || 'No phone provided'}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-tighter">Placed on {new Date(o.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Payment summary</p>
                              <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-900">Rs.{o.subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className="font-bold text-slate-900">Rs.{o.shipping.toFixed(2)}</span></div>
                                <div className="flex justify-between pt-3 border-t border-slate-200"><span className="font-bold text-slate-900">Total</span><span className="font-bold text-blue-700">Rs.{o.total.toFixed(2)}</span></div>
                              </div>
                              <div className={cn('mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest', meta.tone)}>
                                <StatusIcon className="w-3.5 h-3.5" /> {meta.label}
                              </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Items ({o.items.length})</p>
                              <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {o.items.map((it: any, i: number) => (
                                  <li key={i} className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100">
                                    <img src={it.coverImage} alt="" className="w-8 h-11 object-cover rounded border border-slate-100" referrerPolicy="no-referrer" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-slate-900 text-xs truncate">{it.title}</p>
                                      <p className="text-[10px] text-slate-400 truncate">{it.author}</p>
                                      <div className="flex justify-between items-center mt-1"><span className="text-[10px] font-bold text-slate-500">Qty: {it.quantity}</span><span className="text-xs font-bold text-blue-700">Rs.{(it.price * it.quantity).toFixed(2)}</span></div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="p-5 flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delivery location</p>
                                <p className="text-sm font-bold text-slate-900 mt-1">{o.locationCoords ? 'Interactive customer pin' : 'No coordinate captured'}</p>
                                {o.locationCoords && <p className="text-[11px] text-slate-500 mt-1">{o.locationCoords.lat.toFixed(5)}, {o.locationCoords.lng.toFixed(5)}</p>}
                              </div>
                              {o.locationCoords && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${o.locationCoords.lat},${o.locationCoords.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-blue-700 hover:bg-blue-50"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Open directions
                                </a>
                              )}
                            </div>
                            {o.locationCoords ? (
                              mapsLoadError || !mapsApiKey ? (
                                <div className="h-64 bg-slate-200 flex flex-col items-center justify-center text-slate-500 gap-2">
                                  <MapPin className="w-8 h-8" />
                                  <p className="text-xs font-bold">Interactive map unavailable</p>
                                  <p className="text-[11px]">Use the coordinates or open directions above.</p>
                                </div>
                              ) : mapsLoaded ? (
                                <GoogleMap
                                  mapContainerStyle={{ width: '100%', height: '260px' }}
                                  center={o.locationCoords}
                                  zoom={16}
                                  options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false }}
                                >
                                  <Marker position={o.locationCoords} title={`Delivery for ${o.customerName || o.customerEmail}`} />
                                </GoogleMap>
                              ) : (
                                <div className="h-64 bg-slate-200 flex items-center justify-center text-slate-500 text-xs gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading interactive map...</div>
                              )
                            ) : (
                              <div className="h-36 flex flex-col items-center justify-center text-slate-400 gap-2"><MapPin className="w-7 h-7" /><p className="text-xs font-medium">This order has no saved location pin.</p></div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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

function InventoryView({ onAdd, onEdit, onDuplicate }: { key?: React.Key | string | number; onAdd: () => void; onEdit: (book: Book) => void; onDuplicate: (book: Book) => void }) {
  const toast = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustingBookId, setAdjustingBookId] = useState<string | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
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
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingBookId(id);
    try {
      await bookApi.remove(id);
      setBooks((current) => current.filter((book) => book.id !== id));
      toast.success(`Removed "${title}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete book.');
    } finally {
      setDeletingBookId(null);
    }
  };

  const adjustStock = async (book: Book, delta: number) => {
    setAdjustingBookId(book.id);
    try {
      const { book: updated } = await bookApi.adjustStock(book.id, delta);
      setBooks((current) => current.map((item) => item.id === book.id ? { ...item, stock: updated.stock } : item));
      toast.success(`${delta > 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} unit${Math.abs(delta) === 1 ? '' : 's'} for "${book.title}"`);
    } catch (err: any) {
      toast.error(err.message || 'Unable to adjust stock.');
    } finally {
      setAdjustingBookId(null);
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
      <div className="p-4 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
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
        <div className="flex w-full sm:w-auto items-center justify-between gap-3">
          <p className="text-sm text-slate-600 font-medium">
            {filtered.length} of {books.length} titles
          </p>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Add book
          </button>
        </div>
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
                      <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <button
                          type="button"
                          aria-label={`Remove one unit of ${book.title}`}
                          disabled={adjustingBookId === book.id || book.stock === 0}
                          onClick={() => adjustStock(book, -1)}
                          className="h-7 w-7 text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          aria-label={`Add one unit of ${book.title}`}
                          disabled={adjustingBookId === book.id}
                          onClick={() => adjustStock(book, 1)}
                          className="h-7 w-7 border-l border-slate-200 text-sm font-bold text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
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
                  <td className="px-4 sm:px-8 py-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(book)}
                        disabled={deletingBookId === book.id}
                        className="min-h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(book)}
                        disabled={deletingBookId === book.id}
                        className="min-h-9 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2 disabled:opacity-60"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(book.id, book.title)}
                        disabled={deletingBookId === book.id}
                        className="min-h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2 disabled:opacity-60"
                      >
                        {deletingBookId === book.id ? 'Deleting…' : 'Delete'}
                      </button>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 shadow-sm space-y-6">
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

function MessagesView() {
  const toast = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<ContactMessage['status'] | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const reload = () => {
    setLoading(true);
    adminApi.messages({ status, search: search || undefined })
      .then(({ messages: rows }) => setMessages(rows))
      .catch((error) => toast.error(error.message || 'Failed to load messages'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [status, search]);

  const changeStatus = async (message: ContactMessage, nextStatus: ContactMessage['status']) => {
    setBusy(message.id);
    try {
      await adminApi.updateMessageStatus(message.id, nextStatus);
      if (status !== 'all' && status !== nextStatus) {
        setMessages((previous) => previous.filter((item) => item.id !== message.id));
      } else {
        setMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, status: nextStatus, updatedAt: Date.now() } : item));
      }
      toast.success(nextStatus === 'archived' ? 'Message archived' : `Message marked ${nextStatus}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update message');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (message: ContactMessage) => {
    if (!confirm(`Delete the message from ${message.email}? This cannot be undone.`)) return;
    setBusy(message.id);
    try {
      await adminApi.deleteMessage(message.id);
      setMessages((previous) => previous.filter((item) => item.id !== message.id));
      toast.success('Message deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    } finally {
      setBusy(null);
    }
  };

  const unreadCount = messages.filter((message) => message.status === 'unread').length;
  const statusClasses: Record<ContactMessage['status'], string> = {
    unread: 'bg-blue-50 text-blue-700 border-blue-200',
    read: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatPill label="Visible" value={messages.length} icon={Mail} tone="blue" />
        <StatPill label="Unread" value={unreadCount} icon={Mail} tone="violet" />
        <StatPill label="Read" value={messages.filter((message) => message.status === 'read').length} icon={CheckCircle2} tone="emerald" />
        <StatPill label="Archived" value={messages.filter((message) => message.status === 'archived').length} icon={Archive} tone="violet" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
          <div className="relative">
            <input
              type="search"
              placeholder="Search name, email, subject, or message..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Message status">
            {(['all', 'unread', 'read', 'archived'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={cn('shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold capitalize transition-colors', status === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900')}
                role="tab"
                aria-selected={status === option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3"><Loader2 className="w-6 h-6 animate-spin" />Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 sm:p-16 text-center text-slate-400 font-medium italic">No messages match this filter.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {messages.map((message) => (
              <article key={message.id} className={cn('p-4 sm:p-6 transition-colors', message.status === 'unread' ? 'bg-blue-50/30' : 'hover:bg-slate-50/60')}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', message.status === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 truncate">{message.subject || 'No subject'}</h3>
                          <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider', statusClasses[message.status])}>{message.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{message.name} · <a href={`mailto:${message.email}`} className="text-blue-700 hover:underline">{message.email}</a></p>
                      </div>
                      <time className="text-[11px] text-slate-400 shrink-0" dateTime={new Date(message.createdAt).toISOString()}>{new Date(message.createdAt).toLocaleString()}</time>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.status !== 'read' && <button disabled={busy === message.id} onClick={() => changeStatus(message, 'read')} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 disabled:opacity-50">Mark read</button>}
                      {message.status !== 'unread' && <button disabled={busy === message.id} onClick={() => changeStatus(message, 'unread')} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 disabled:opacity-50">Mark unread</button>}
                      {message.status !== 'archived' && <button disabled={busy === message.id} onClick={() => changeStatus(message, 'archived')} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 disabled:opacity-50">Archive</button>}
                      <button disabled={busy === message.id} onClick={() => remove(message)} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 disabled:opacity-50">Delete</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function collectAdminLoginSignals() {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser. Please use Chrome over HTTPS.');
  }

  let device = navigator.userAgent;
  const userAgentData = (navigator as Navigator & {
    userAgentData?: {
      platform?: string;
      model?: string;
      getHighEntropyValues?: (hints: string[]) => Promise<{ platform?: string; model?: string }>;
    };
  }).userAgentData;
  if (userAgentData?.getHighEntropyValues) {
    try {
      const hints = await userAgentData.getHighEntropyValues(['platform', 'model']);
      if (hints.platform) device += ` ${hints.platform}`;
      if (hints.model) device += ` ${hints.model}`;
    } catch {
      // Continue with the standard User-Agent when Client Hints are unavailable.
    }
  } else if (userAgentData?.platform || userAgentData?.model) {
    device += ` ${userAgentData.platform || ''} ${userAgentData.model || ''}`;
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude, device };
}

function AdminPasskeyPanel() {
  const [enrolled, setEnrolled] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authApi.passkeyStatus().then((status) => {
      if (!cancelled) {
        setEnrolled(status.enrolled);
        setCount(status.count);
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const enrollFaceLock = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (!browserSupportsWebAuthn()) throw new Error('This browser or device does not support biometric passkeys.');
      const { challengeId, options } = await authApi.passkeyRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });
      const result = await authApi.passkeyRegistrationVerify(challengeId, response);
      setEnrolled(result.verified);
      setCount((current) => current + 1);
      setMessage(result.message);
    } catch (err: any) {
      setError(err?.message || 'Face lock enrollment was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <Fingerprint className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold">Face lock / passkey</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Enroll Windows Hello on this Dell laptop. Chrome may use face recognition, fingerprint, or the device PIN; the server stores only the public credential key.
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            {enrolled ? `${count} passkey${count === 1 ? '' : 's'} enrolled` : 'No passkey enrolled'}
          </p>
        </div>
        <button
          type="button"
          onClick={enrollFaceLock}
          disabled={loading || !browserSupportsWebAuthn()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
          {enrolled ? 'Enroll another passkey' : 'Set up face lock'}
        </button>
      </div>
      {message && <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </section>
  );
}

function AdminLoginForm() {
  const { signIn, signInWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faceLockLoading, setFaceLockLoading] = useState(false);
  const [firewallTestMode, setFirewallTestMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    if (email.trim().length > 50) {
      setError('Email addresses are limited to 50 characters.');
      return;
    }
    if (!resetMode && password.length > 32) {
      setError('Passwords are limited to 32 characters.');
      return;
    }
    setLoading(true);
    try {
      if (resetMode) {
        await authApi.requestPasswordReset(email.trim());
        setResetMessage('If an admin account exists for that email, a one-time reset code will be sent shortly.');
        return;
      }
      const signals = await collectAdminLoginSignals();
      await signIn(email.trim(), password, signals);
    } catch (err: any) {
      if (err.code === 1) setError('Location permission denied. Please enable it in your browser settings.');
      else if (err.code === 2) setError('Location unavailable. Make sure your device GPS is turned on.');
      else if (err.code === 3) setError('Location request timed out.');
      else setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLockLogin = async () => {
    setError(null);
    setResetMessage(null);
    setFaceLockLoading(true);
    try {
      if (!browserSupportsWebAuthn()) throw new Error('This browser or device does not support biometric passkeys.');
      if (!email.trim()) throw new Error('Enter the admin email before using face lock.');
      const { challengeId, options } = await authApi.passkeyLoginOptions(email.trim());
      const response = await startAuthentication({ optionsJSON: options });
      const signals = await collectAdminLoginSignals();
      const result = await authApi.passkeyLoginVerify({ email: email.trim(), challengeId, response, ...signals });
      signInWithToken(result.token, result.user);
    } catch (err: any) {
      if (err?.code === 1) setError('Location permission denied. Please enable it in your browser settings.');
      else if (err?.code === 2) setError('Location unavailable. Make sure your device GPS is turned on.');
      else if (err?.code === 3) setError('Location request timed out.');
      else setError(err?.message || 'Face lock login was cancelled or failed.');
    } finally {
      setFaceLockLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-900 p-4 flex items-center justify-center">
      <div className="relative z-0 w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Admin Portal</h2>
        <p className="text-sm text-center text-slate-500 mb-8">
          Secure login requires location, Windows Chrome, and your enrolled Windows Hello passkey.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {resetMode ? (
            <>
              <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">Request a one-time reset code for the admin email. Admin access still requires Windows Chrome, location verification, and the enrolled Windows Hello passkey after the password is changed.</p>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Admin email</label>
                <input
                  required
                  type="email"
                  value={email}
                  maxLength={50}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-w-0 mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              {resetMessage && <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl border border-emerald-100">{resetMessage}</div>}
              {error && <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-xl border border-rose-100">{error}</div>}
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-rose-600 transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Admin Reset Code
              </button>
              <button type="button" onClick={() => { setResetMode(false); setResetMessage(null); setError(null); }} className="w-full text-sm font-bold text-slate-600 hover:text-rose-600">Back to Admin Sign In</button>
            </>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  maxLength={50}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-w-0 mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  maxLength={32}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-w-0 mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <p className="-mt-2 text-xs text-slate-400">Maximum 32 characters.</p>
              <div className="text-right">
                <button type="button" onClick={() => { setResetMode(true); setResetMessage(null); setError(null); }} className="text-sm font-bold text-rose-600 hover:underline">Forgot admin password?</button>
              </div>
              {error && (
                <div role="alert" className="break-words bg-rose-50 text-rose-600 text-sm p-3 rounded-xl border border-rose-100">
                  {error}
                </div>
              )}
              <button
                disabled={loading || faceLockLoading}
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-rose-600 transition-colors shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & Sign In
              </button>
              <button
                type="button"
                onClick={handleFaceLockLogin}
                disabled={loading || faceLockLoading || !browserSupportsWebAuthn()}
                className="w-full border border-rose-200 bg-rose-50 text-rose-700 font-bold py-3.5 rounded-xl hover:bg-rose-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {faceLockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                Use Face Lock / Passkey
              </button>
              <p className="text-center text-xs text-slate-400">Uses Windows Hello or your enrolled platform passkey.</p>
              <button
                type="button"
                onClick={() => setFirewallTestMode(true)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                Test Firewall Overlay
              </button>
            </>
          )}
        </form>
      </div>
      {(firewallTestMode || loading || faceLockLoading) && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-md" role="alert" aria-live="assertive">
          <section className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-slate-950 p-6 text-center shadow-2xl shadow-black/50">
            <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
            <h3 className="mt-4 text-lg font-bold text-white">Security verification active</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {firewallTestMode && !loading && !faceLockLoading
                ? 'Firewall overlay test mode is active. This visual layer does not replace server-side authorization.'
                : 'Admin credentials and device verification are being processed securely.'}
            </p>
            {firewallTestMode && !loading && !faceLockLoading && (
              <button
                type="button"
                onClick={() => setFirewallTestMode(false)}
                className="mt-5 rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-white hover:border-rose-400 hover:bg-rose-500/10"
              >
                Dismiss test
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
