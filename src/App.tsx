import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import { currentAdminClientIsEligible } from './lib/adminRouteGuard';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Profile = lazy(() => import('./pages/Profile'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Admin = lazy(() => import('./pages/Admin'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Contact = lazy(() => import('./pages/Contact'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

function AdminRouteNotFound() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 text-slate-100 flex items-center justify-center">
      <section className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-[0.32em] text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">The requested page is unavailable.</p>
      </section>
    </main>
  );
}

function ProtectedAdminRoute() {
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void currentAdminClientIsEligible().then((result) => {
      if (active) setEligible(result);
    });
    return () => { active = false; };
  }, []);

  if (eligible === null) return <PageLoader />;
  return eligible ? <Admin /> : <AdminRouteNotFound />;
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Isolated Admin Route */}
          {import.meta.env.VITE_ADMIN_PATH && (
            <Route path={`${import.meta.env.VITE_ADMIN_PATH}/*`} element={<ProtectedAdminRoute />} />
          )}

          {/* Public App with Layout */}
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/book/:id" element={<BookDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/order-success" element={<OrderSuccess />} />
                  <Route path="/order/:id" element={<OrderDetail />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}
