import React from 'react';
import { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useCart } from '../context/CartContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { ShieldCheck, ArrowLeft, MapPin, Navigation, Loader2, CheckCircle2, DollarSign, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '300px',
};

const DEFAULT_CENTER = { lat: 27.7172, lng: 85.3240 }; // Default to Kathmandu

export default function Checkout() {
  const { settings } = useSiteSettings();
  const [shippingLocation, setShippingLocation] = useState<'ktm' | 'outside'>('ktm');
  const { items, total, clearCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    country: 'Nepal',
    locationCoords: null as { lat: number; lng: number } | null,
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email,
        firstName: user.displayName.split(' ')[0] || prev.firstName,
        lastName: user.displayName.split(' ').slice(1).join(' ') || prev.lastName,
      }));
    }
  }, [user]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setFormData((prev) => ({
        ...prev,
        locationCoords: { lat: e.latLng!.lat(), lng: e.latLng!.lng() },
      }));
    }
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          locationCoords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        }));
        setIsGeolocating(false);
      },
      () => {
        setError('Unable to retrieve your location. Please pin it on the map.');
        setIsGeolocating(false);
      }
    );
  };

  const isFreeShipping = total >= settings.freeShippingThreshold;
  const shipping = total > 0 ? (isFreeShipping ? 0 : (shippingLocation === 'ktm' ? settings.shippingKtm : settings.shippingOutside)) : 0;
  const finalTotal = total + shipping;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsProcessing(true);
    setError(null);
    
    // Mandatory Location Check
    if (!formData.locationCoords) {
      setError('COMPULSORY: Please pin your exact delivery location on the map to proceed with your order.');
      setIsProcessing(false);
      return;
    }

    // Phone Validation (Nepali 10-digit mobile)
    const phoneRegex = /^9\d{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid 10-digit Nepali mobile number (starting with 9).');
      setIsProcessing(false);
      return;
    }

    if (!user) {
      setError('You must be logged in to complete your purchase.');
      setIsProcessing(false);
      return;
    }

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
        customer: {
          ...formData,
          email: user.email,
          firstName: formData.firstName || user.displayName.split(' ')[0] || '',
          lastName: formData.lastName || user.displayName.split(' ').slice(1).join(' ') || '',
        },
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

          {/* Shipping Info */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shipping Information</h2>
            <div className="space-y-4">
              <Field label="Email Address" required type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} />
                <Field label="Last Name" required value={formData.lastName} onChange={(v) => setFormData({ ...formData, lastName: v })} />
              </div>
              <Field label="Phone Number" required type="tel" placeholder="98XXXXXXXX" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />
              <Field label="Full Delivery Address" required placeholder="e.g. House No, Street Name, Area" value={formData.address} onChange={(v) => setFormData({ ...formData, address: v })} />
              
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Delivery Location (for shipping fee)</label>
                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShippingLocation('ktm')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${shippingLocation === 'ktm' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Inside Kathmandu Valley
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingLocation('outside')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${shippingLocation === 'outside' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Outside Valley
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City / Town" required placeholder="e.g. Lalitpur" value={formData.city} onChange={(v) => setFormData({ ...formData, city: v })} />
                <Field label="ZIP / Area Code" required placeholder="e.g. 44600" value={formData.zip} onChange={(v) => setFormData({ ...formData, zip: v })} />
              </div>
            </div>
          </section>

          {/* Delivery Location Map */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Delivery Location <span className="text-rose-500 font-bold ml-1">*</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Tap the map or use your current location to pin the exact delivery point.
                </p>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={isGeolocating}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {isGeolocating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {isGeolocating ? 'Locating...' : 'Use My Location'}
              </button>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-xl shadow-inner">
              {loadError ? (
                <div className="h-[300px] bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <MapPin className="w-8 h-8" />
                  <p className="text-sm font-medium">Could not load Google Maps.</p>
                  <p className="text-xs">Check your API key configuration.</p>
                </div>
              ) : isLoaded ? (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={formData.locationCoords || DEFAULT_CENTER}
                  zoom={formData.locationCoords ? 16 : 12}
                  onClick={onMapClick}
                  options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControlOptions: { position: 3 },
                  }}
                >
                  {formData.locationCoords && (
                    <Marker
                      position={formData.locationCoords}
                      animation={2} // DROP animation
                    />
                  )}
                </GoogleMap>
              ) : (
                <div className="h-[300px] bg-slate-100 flex items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Loading Map...</span>
                </div>
              )}
            </div>

            {formData.locationCoords ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                  Location pinned: {formData.locationCoords.lat.toFixed(5)}, {formData.locationCoords.lng.toFixed(5)}
                </p>
              </div>
            ) : (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                No location pinned yet — tap the map or click "Use My Location"
              </p>
            )}
          </section>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {(!user && (
            <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-rose-700">
              <p className="font-bold">Login required to complete checkout.</p>
              <p className="text-sm text-rose-600 mt-1">Please sign in or create an account before placing your order.</p>
              <button
                type="button"
                onClick={openAuthModal}
                className="mt-4 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-all"
              >
                Login or Sign Up
              </button>
            </div>
          )) || null}

          <button
            type="submit"
            disabled={isProcessing || !user}
            className="w-full flex items-center justify-center space-x-3 bg-blue-600 text-white px-8 py-5 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <span>{isProcessing ? 'Processing...' : !user ? 'Login to checkout' : `Place Order — Rs.${finalTotal.toFixed(2)}`}</span>
          </button>
        </form>

        {/* Order Summary */}
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
                      <span className="text-slate-900">Rs.{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-100 mb-8">
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">Rs.{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Shipping</span>
                <span className="font-bold text-slate-900">{isFreeShipping ? 'Complimentary' : `Rs.${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                <span className="text-lg font-bold text-slate-900">Total Due</span>
                <span className="text-3xl font-bold text-slate-900">Rs.{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <DollarSign className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-blue-700">
                    Payment Method
                  </p>
                  <p className="text-xs font-bold text-slate-900">Cash on Delivery (COD)</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
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
  placeholder,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 text-sm"
      />
    </div>
  );
}
