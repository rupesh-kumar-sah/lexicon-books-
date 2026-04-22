import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlist: string[];
  toggleWishlist: (bookId: string) => Promise<void>;
  isInWishlist: (bookId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setWishlist([]);
      return;
    }

    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const unsubscribe = onSnapshot(wishlistRef, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setWishlist(ids);
    }, (error) => {
      console.error("Firestore Wishlist error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleWishlist = async (bookId: string) => {
    if (!user) return;

    const bookRef = doc(db, 'users', user.uid, 'wishlist', bookId);
    
    if (wishlist.includes(bookId)) {
      await deleteDoc(bookRef);
    } else {
      await setDoc(bookRef, { addedAt: Date.now() });
    }
  };

  const isInWishlist = (bookId: string) => wishlist.includes(bookId);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
