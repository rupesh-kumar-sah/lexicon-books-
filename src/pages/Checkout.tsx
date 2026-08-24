import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, InputHTMLAttributes } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useCart } from '../context/CartContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { AlertTriangle, ArrowLeft, CheckCircle2, DollarSign, Loader2, MapPin, Navigation, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const MAP_CONTAINER_STYLE = { width: '100%', height: '300px' };
const DEFAULT_CENTER = { lat: 27.7172, lng: 85.3240 };
type Coordinates = { lat: number; lng: number };
type ShippingLocation = 'ktm' | 'outside';

export default function Checkout() {
  const { settings } = useSiteSettings();
  const [shippingLocation, setShippingLocation] = useState<ShippingLocation>('ktm');
  const { items, total, clearCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    country: 'Nepal',
    locationCoords: null as Coordinates | null,
  });
  const [manualCoordinates, setManualCoordinates] = useState({ latitude: '', longitude: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      email: user.email,
      firstName: user.displayName.split(' ')[0] || prev.firstName,
      lastName: user.displayName.split(' ').slice(1).join(' ') || prev.lastName,
    }));
  }, [user]);

  const setDeliveryCoordinates = useCallback((locationCoords: Coordinates) => {
    setFormData((prev) => ({ ...prev, locationCoords }));
    setManualCoordinates({
      latitude: locationCoords.lat.toFixed(6),
      longitude: locationCoords.lng.toFixed(6),
    });
    setError(null);
  }, []);

  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    setDeliveryCoordinates({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }, [setDeliveryCoordinates]);

  const updateManualCoordinate = (axis: 'latitude' | 'longitude', value: string) => {
    setManualCoordinates((previous) => {
      const next = { ...previous, [axis]: value };
      const latitude = Number(next.latitude);
      const longitude = Number(next.longitude);
      const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
      setFormData((current) => ({ ...current, locationCoords: valid ? { lat: latitude, lng: longitude } : null }));
      return next;
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Location services are not supported by this browser. Enter your delivery coordinates manually.');
      return;
    }
    setIsGeolocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsGeolocating(false);
      },
      () => {
        setError('Unable to retrieve your location. Pin it on the map or enter the latitude and longitude manually.');
        setIsGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  const isFreeShipping = total >= settings.freeShippingThreshold;
  const shipping = total > 0 ? (isFreeShipping ? 0 : (shippingLocation === 'ktm' ? settings.shippingKtm : settings.shippingOutside)) : 0;
  const finalTotal = total + shipping;

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isProcessing || items.length === 0) return;
    setError(null);

    if (!formData.locationCoords) {
      setError('Pin your delivery location on the map or enter valid latitude and longitude before placing your order.');
      return;
    }

    const phoneRegex = /^9\d{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Enter a valid 10-digit Nepali mobile number beginning with 9.');
      return;
    }

    if (!user) {
      setError('Sign in or create an account before placing your order.');
      return;
    }

    setIsProcessing(true);
    try {
      const { orderId } = await orderApi.create({
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          author: item.author,
          coverImage: item.coverImage,
          price: item.price,
          quantity: item.quantity,
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
    } catch (requestError: any) {
      setError(requestError?.message || 'Checkout could not be completed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <section className="min-h-[60vh] bg-slate-50 px-4 py-20 text-center sm:px-8" aria-labelledby="empty-cart-heading">
        <h1 id="empty-cart-heading" className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <Link to="/catalog" className="mt-4 inline-flex text-sm font-bold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <section id="checkout" className="bg-slate-50 px-4 py-8 sm:px-8 lg:py-12" aria-labelledby="checkout-heading">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <form onSubmit={handleCheckout} className="min-w-0 space-y-8" noValidate={false}>
          <div>
            <Link
              to="/cart"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Return to cart
            </Link>
            <h1 id="checkout-heading" className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Checkout</h1>
          </div>

          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="shipping-heading">
            <h2 id="shipping-heading" className="text-xl font-bold tracking-tight text-slate-900">Shipping information</h2>
            <div className="space-y-4">
              <Field label="Email address" name="email" autoComplete="email" required type="email" value={formData.email} errorId={error ? 'checkout-error' : undefined} onChange={(value) => setFormData((current) => ({ ...current, email: value }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" name="first-name" autoComplete="given-name" required value={formData.firstName} errorId={error ? 'checkout-error' : undefined} onChange={(value) => setFormData((current) => ({ ...current, firstName: value }))} />
                <Field label="Last name" name="last-name" autoComplete="family-name" required value={formData.lastName} errorId={error ? 'checkout-error' : undefined} onChange={(value) => setFormData((current) => ({ ...current, lastName: value }))} />
              </div>
              <Field label="Phone number" name="phone" autoComplete="tel" inputMode="numeric" pattern="9[0-9]{9}" required type="tel" placeholder="98XXXXXXXX" value={formData.phone} errorId={error ? 'checkout-error' : undefined} onChange={(value) => setFormData((current) => ({ ...current, phone: value }))} />
              <Field label="Full delivery address" name="address" autoComplete="street-address" required placeholder="House number, street, and area" value={formData.address} errorId={error ? 'checkout-error' : undefined} onChange={(value) => setFormData((current) => ({ ...current, address: value }))} />

              <fieldset className="space-y-3 pt-2">
                <legend className="text-sm font-semibold text-slate-800">Delivery area for shipping fee</legend>
                <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
                  <button type="button" aria-pressed={shippingLocation === 'ktm'} onClick={() => setShippingLocation('ktm')} className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${shippingLocation === 'ktm' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-700 hover:bg-white'}`}>
                    Inside Kathmandu Valley
                  </button>
                  <button type="button" aria-pressed={shippingLocation === 'outside'} onClick={() => setShippingLocation('outside')} className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${shippingLocation === 'outside' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-700 hover:bg-white'}`}>
                    Outside Valley
                  </button>
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City or town" name="city" autoComplete="address-level2" required placeholder="Lalitpur" value={formData.city} errorId={error ? 'checkout-error' : undefined} onChange={(value) => setFormData((current) => ({ ...current, city: value }))} />
                <Field label="ZIP or area code" name="zip" autoComplete="postal-code" inputMode="numeric" required placeholder="44600" value={formData.zip} errorId={error ? 'checkout-error' : undefined} onChange={(value) => setFormData((current) => ({ ...current, zip: value }))} />
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="location-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="location-heading" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
                  <MapPin className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Delivery location <span className="text-rose-700" aria-label="required">*</span>
                </h2>
                <p className="mt-1 text-sm text-slate-600">Pin the exact delivery point using the map, location services, or manual coordinates.</p>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={isGeolocating}
                aria-busy={isGeolocating}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeolocating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Navigation className="w-4 h-4" aria-hidden="true" />}
                {isGeolocating ? 'Locating…' : 'Use my location'}
              </button>
            </div>

            {mapsApiKey ? (
              <ConfiguredDeliveryMap apiKey={mapsApiKey} locationCoords={formData.locationCoords} manualCoordinates={manualCoordinates} onMapClick={onMapClick} onManualCoordinateChange={updateManualCoordinate} />
            ) : (
              <LocationFallback reason="Google Maps is not configured for this deployment." locationCoords={formData.locationCoords} manualCoordinates={manualCoordinates} onManualCoordinateChange={updateManualCoordinate} />
            )}

            {formData.locationCoords ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-emerald-800">Location pinned: {formData.locationCoords.lat.toFixed(5)}, {formData.locationCoords.lng.toFixed(5)}</p>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-700">No location has been pinned yet.</p>
            )}
          </section>

          <div id="checkout-error" role="status" aria-live="polite" className="min-h-0">
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}
          </div>

          {!user && (
            <aside className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
              <p className="font-bold">Login required to complete checkout</p>
              <p className="mt-1 text-sm">Sign in or create an account before placing your order.</p>
              <button type="button" onClick={openAuthModal} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-700 px-5 py-3 text-sm font-bold text-white hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2">Login or sign up</button>
            </aside>
          )}

          <button
            type="submit"
            disabled={isProcessing || !user}
            aria-busy={isProcessing}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-base font-bold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            <span>{isProcessing ? 'Placing order…' : !user ? 'Login to checkout' : `Place order — Rs.${finalTotal.toFixed(2)}`}</span>
          </button>
        </form>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-labelledby="order-summary-heading">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
            <h2 id="order-summary-heading" className="text-xl font-bold tracking-tight text-slate-900">Order summary</h2>
            <div className="mt-6 space-y-5 pr-2 lg:max-h-[52vh] lg:overflow-y-auto">
              {items.map((item) => (
                <article key={item.id} className="flex gap-4">
                  <img src={item.coverImage} width={64} height={80} loading="lazy" decoding="async" className="h-20 w-16 shrink-0 rounded-lg bg-slate-100 object-cover" referrerPolicy="no-referrer" alt={`Cover of ${item.title}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs font-medium text-blue-800">by {item.author}</p>
                    <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Quantity: {item.quantity}</span>
                      <span className="text-slate-900">Rs.{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <dl className="mt-7 space-y-3 border-t border-slate-200 pt-6 text-sm">
              <div className="flex justify-between gap-4 text-slate-700"><dt>Subtotal</dt><dd className="font-bold text-slate-900">Rs.{total.toFixed(2)}</dd></div>
              <div className="flex justify-between gap-4 text-slate-700"><dt>Shipping</dt><dd className="font-bold text-slate-900">{isFreeShipping ? 'Complimentary' : `Rs.${shipping.toFixed(2)}`}</dd></div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5"><dt className="text-lg font-bold text-slate-900">Total due</dt><dd className="text-2xl font-bold text-slate-900">Rs.{finalTotal.toFixed(2)}</dd></div>
            </dl>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <DollarSign className="w-5 h-5 shrink-0 text-blue-700" aria-hidden="true" />
                <div><p className="text-sm font-semibold text-blue-900">Payment method</p><p className="text-xs text-slate-700">Cash on delivery</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-emerald-800">Secure checkout</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ConfiguredDeliveryMap({ apiKey, locationCoords, manualCoordinates, onMapClick, onManualCoordinateChange }: { apiKey: string; locationCoords: Coordinates | null; manualCoordinates: { latitude: string; longitude: string }; onMapClick: (event: google.maps.MapMouseEvent) => void; onManualCoordinateChange: (axis: 'latitude' | 'longitude', value: string) => void }) {
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey });

  if (loadError) {
    return <LocationFallback reason="Google Maps could not load. Check the deployment configuration or enter coordinates manually." locationCoords={locationCoords} manualCoordinates={manualCoordinates} onManualCoordinateChange={onManualCoordinateChange} />;
  }

  if (!isLoaded) {
    return <div className="flex h-[300px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-700"><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />Loading map…</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={locationCoords || DEFAULT_CENTER} zoom={locationCoords ? 16 : 12} onClick={onMapClick} options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControlOptions: { position: 3 } }}>
        {locationCoords && <Marker position={locationCoords} animation={2} />}
      </GoogleMap>
    </div>
  );
}

function LocationFallback({ reason, locationCoords, manualCoordinates, onManualCoordinateChange }: { reason: string; locationCoords: Coordinates | null; manualCoordinates: { latitude: string; longitude: string }; onManualCoordinateChange: (axis: 'latitude' | 'longitude', value: string) => void }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert">
      <div className="flex gap-3"><AlertTriangle className="mt-0.5 w-5 h-5 shrink-0 text-amber-800" aria-hidden="true" /><div><p className="font-bold text-amber-950">Map unavailable</p><p className="mt-1 text-sm leading-6 text-amber-900">{reason} You can continue by entering valid coordinates from a trusted map source or use your current location.</p></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Latitude" name="delivery-latitude" type="number" inputMode="decimal" step="any" value={manualCoordinates.latitude} onChange={(value) => onManualCoordinateChange('latitude', value)} />
        <Field label="Longitude" name="delivery-longitude" type="number" inputMode="decimal" step="any" value={manualCoordinates.longitude} onChange={(value) => onManualCoordinateChange('longitude', value)} />
      </div>
      {!locationCoords && <p className="mt-3 text-sm font-semibold text-amber-900">Both values are required before ordering.</p>}
      <button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"><RefreshCw className="w-4 h-4" aria-hidden="true" />Retry map</button>
    </div>
  );
}

function Field({ label, name, required, type = 'text', placeholder, value, onChange, autoComplete, inputMode, pattern, minLength, step, errorId }: { label: string; name: string; required?: boolean; type?: string; placeholder?: string; value: string; onChange: (value: string) => void; autoComplete?: string; inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']; pattern?: string; minLength?: number; step?: string; errorId?: string }) {
  const id = `checkout-${name}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{label}{required && <span className="ml-1 text-rose-700" aria-label="required">*</span>}</label>
      <input id={id} name={name} required={required} type={type} placeholder={placeholder} value={value} autoComplete={autoComplete} inputMode={inputMode} pattern={pattern} minLength={minLength} step={step} aria-invalid={Boolean(errorId)} aria-describedby={errorId} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30" />
    </div>
  );
}
