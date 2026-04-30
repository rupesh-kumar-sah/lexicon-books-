import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Book } from '../types';
import { useToast } from './ToastContext';

const STORAGE_KEY = 'lexiconn_cart';
const LEGACY_KEY = 'lumina_cart';

interface CartContextType {
  items: CartItem[];
  addToCart: (book: Book, quantity?: number) => void;
  removeFromCart: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function loadInitial(): CartItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    // migrate from old key
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
      return JSON.parse(legacy);
    }
    return [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitial);
  const toast = useToast();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (book: Book, quantity = 1) => {
    if (book.stock <= 0) {
      toast.error(`"${book.title}" is out of stock`);
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.id === book.id);
      const cap = book.stock;
      if (existing) {
        const next = Math.min(existing.quantity + quantity, cap);
        if (next === existing.quantity) {
          toast.info(`Cart is at the maximum available stock for "${book.title}"`);
          return prev;
        }
        toast.success(`Updated "${book.title}" in cart`);
        return prev.map((i) => (i.id === book.id ? { ...i, quantity: next } : i));
      }
      toast.success(`Added "${book.title}" to cart`);
      return [...prev, { ...book, quantity: Math.min(quantity, cap) }];
    });
  };

  const removeFromCart = (bookId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== bookId));
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === bookId ? { ...i, quantity: Math.max(0, quantity) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
