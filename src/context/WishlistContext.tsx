import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { wishlistApi } from '../lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistContextType {
  wishlist: string[];
  toggleWishlist: (bookId: string, title?: string) => Promise<void>;
  isInWishlist: (bookId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, openAuthModal } = useAuth();
  const toast = useToast();
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setWishlist([]);
      return;
    }
    let cancelled = false;
    wishlistApi
      .ids()
      .then((res) => {
        if (!cancelled && res && Array.isArray(res.bookIds)) {
          setWishlist(res.bookIds);
        }
      })
      .catch((e) => console.error('wishlist load failed', e));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleWishlist = useCallback(
    async (bookId: string, title?: string) => {
      if (!user) {
        toast.info('Sign in to save books to your wishlist');
        openAuthModal();
        return;
      }
      const inList = wishlist.includes(bookId);
      // Optimistic update
      setWishlist((prev) => (inList ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
      try {
        if (inList) {
          await wishlistApi.remove(bookId);
          toast.info(title ? `Removed "${title}" from wishlist` : 'Removed from wishlist');
        } else {
          await wishlistApi.add(bookId);
          toast.success(title ? `Saved "${title}" to wishlist` : 'Saved to wishlist');
        }
      } catch (e: any) {
        // Roll back on failure
        setWishlist((prev) => (inList ? [...prev, bookId] : prev.filter((id) => id !== bookId)));
        toast.error(e?.message || 'Could not update wishlist');
      }
    },
    [user, wishlist, openAuthModal, toast]
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
