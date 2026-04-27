import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { wishlistApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlist: string[];
  toggleWishlist: (bookId: string) => Promise<void>;
  isInWishlist: (bookId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, openAuthModal } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setWishlist([]);
      return;
    }
    let cancelled = false;
    wishlistApi
      .ids()
      .then(({ bookIds }) => {
        if (!cancelled) setWishlist(bookIds);
      })
      .catch((e) => console.error('wishlist load failed', e));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleWishlist = useCallback(
    async (bookId: string) => {
      if (!user) {
        openAuthModal();
        return;
      }
      const inList = wishlist.includes(bookId);
      // Optimistic update
      setWishlist((prev) => (inList ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
      try {
        if (inList) await wishlistApi.remove(bookId);
        else await wishlistApi.add(bookId);
      } catch (e) {
        // Roll back on failure
        setWishlist((prev) => (inList ? [...prev, bookId] : prev.filter((id) => id !== bookId)));
        console.error('wishlist toggle failed', e);
      }
    },
    [user, wishlist, openAuthModal]
  );

  const isInWishlist = (bookId: string) => wishlist.includes(bookId);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
