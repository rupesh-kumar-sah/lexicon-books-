import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CartProvider } from './context/CartContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { WishlistProvider } from './context/WishlistContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext.tsx';
import { SiteSettingsProvider } from './context/SiteSettingsContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <SiteSettingsProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <RecentlyViewedProvider>
                <App />
              </RecentlyViewedProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </SiteSettingsProvider>
    </ToastProvider>
  </StrictMode>
);
