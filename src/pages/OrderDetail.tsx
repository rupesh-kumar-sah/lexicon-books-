import { useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Loader2,
  MapPin,
  Phone,
} from 'lucide-react';
import { orderApi } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: any; description: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock, description: 'We have received your order and will start preparing it shortly.' },
  processing: { label: 'Processing', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Package, description: 'Your books are being packed by our team.' },
  shipped: { label: 'Shipped', color: 'text-violet-700 bg-violet-50 border-violet-200', icon: Truck, description: 'Your order is on its way!' },
  delivered: { label: 'Delivered', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2, description: 'Your order has been delivered. Enjoy your reading!' },
  cancelled: { label: 'Cancelled', color: 'text-rose-700 bg-rose-50 border-rose-200', icon: XCircle, description: 'This order has been cancelled and any reserved stock has been returned.' },
};

const TIMELINE: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const { user, openAuthModal } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    orderApi
      .get(id)
      .then(({ order }) => setOrder(order))
      .catch((e) => toast.error(e.message || 'Could not load order'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const cancel = async () => {
    if (!id || !order) return;
    if (!confirm('Cancel this order? Stock will be returned to inventory.')) return;
    setCancelling(true);
    try {
      await orderApi.cancel(id);
      setOrder({ ...order, status: 'cancelled' });
      toast.success('Order cancelled');
    } catch (e: any) {
      toast.error(e.message || 'Could not cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-50 min-h-full py-32 text-center px-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Sign in to view this order</h2>
        <button
          onClick={openAuthModal}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-3 min-h-full bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-slate-50 min-h-full py-32 text-center px-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Order not found</h2>
        <button
          onClick={() => navigate('/profile')}
          className="text-blue-600 font-bold hover:underline"
        >
          Back to your account
        </button>
      </div>
    );
  }

  const meta = STATUS_META[order.status];
  const Icon = meta.icon;
  const currentStep = TIMELINE.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const canCancel = order.status === 'pending' || order.status === 'processing';

  return (
    <div className="bg-slate-50 min-h-full py-12">
      <div className="max-w-4xl mx-auto px-8">
        <Link
          to="/profile"
          className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to your account
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8"
        >
          <div className={cn('p-8 border-b border-slate-100 flex items-start justify-between gap-6 flex-wrap', isCancelled ? 'bg-rose-50/40' : 'bg-blue-50/30')}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </p>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                {meta.label}
              </h1>
              <p className="text-sm text-slate-500 max-w-md">{meta.description}</p>
            </div>
            <div className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border', meta.color)}>
              <Icon className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">{meta.label}</span>
            </div>
          </div>

          {!isCancelled && (
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between">
                {TIMELINE.map((s, i) => {
                  const reached = i <= currentStep;
                  const StepIcon = STATUS_META[s].icon;
                  return (
                    <div key={s} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                            reached
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
                              : 'bg-white text-slate-300 border-slate-200'
                          )}
                        >
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <p className={cn('mt-2 text-[10px] font-bold uppercase tracking-widest', reached ? 'text-blue-700' : 'text-slate-400')}>
                          {STATUS_META[s].label}
                        </p>
                      </div>
                      {i < TIMELINE.length - 1 && (
                        <div
                          className={cn(
                            'flex-1 h-0.5 mx-2 -mt-6 transition-colors',
                            i < currentStep ? 'bg-blue-600' : 'bg-slate-200'
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-8 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Shipping To
              </p>
              <p className="font-bold text-slate-900">{order.customerName}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{order.shippingAddress}</p>
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-3 h-3" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="p-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Payment Summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-900">Rs.{order.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className="font-bold text-slate-900">Rs.{order.shipping.toFixed(2)}</span></div>
                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-blue-700">Rs.{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {order.locationCoords && (
            <div className="p-8 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Pinned Delivery Location
              </p>
              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-inner">
                {loadError ? (
                  <div className="h-[220px] bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <MapPin className="w-7 h-7" />
                    <p className="text-xs font-medium">Map unavailable</p>
                  </div>
                ) : isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '220px' }}
                    center={order.locationCoords}
                    zoom={16}
                    options={{
                      disableDefaultUI: true,
                      draggable: false,
                      scrollwheel: false,
                      zoomControl: true,
                    }}
                  >
                    <Marker position={order.locationCoords} />
                  </GoogleMap>
                ) : (
                  <div className="h-[220px] bg-slate-100 flex items-center justify-center text-slate-400 text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading map...
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
                Coords: {order.locationCoords.lat.toFixed(5)}, {order.locationCoords.lng.toFixed(5)}
              </p>
            </div>
          )}
        </motion.div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Items ({order.items.length})
            </h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {order.items.map((it: any, i: number) => (
              <li key={i} className="p-6 flex items-center gap-4">
                <Link to={`/book/${it.id}`} className="shrink-0">
                  <img
                    src={it.coverImage}
                    alt=""
                    className="w-16 h-20 object-cover rounded border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/book/${it.id}`} className="font-bold text-slate-900 hover:text-blue-700 block truncate">
                    {it.title}
                  </Link>
                  <p className="text-sm text-slate-500">{it.author}</p>
                  <p className="text-xs text-slate-400 mt-1">Qty: {it.quantity}</p>
                </div>
                <p className="font-bold text-slate-900">Rs.{(Number(it.price) * Number(it.quantity)).toFixed(2)}</p>
              </li>
            ))}
          </ul>

          {canCancel && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={cancel}
                disabled={cancelling}
                className="px-6 py-3 border border-rose-200 text-rose-600 text-sm font-bold rounded-xl hover:bg-rose-50 transition-all disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
