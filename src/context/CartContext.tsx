import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Book } from '../types';
import { useToast } from './ToastContext';
import { readStorage, removeStorage, writeStorage } from '../lib/storage';

const STORAGE_KEY = 'booksellnp_cart';
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

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.author === 'string' &&
    typeof item.coverImage === 'string' &&
    Number.isFinite(item.price) &&
    Number.isFinite(item.quantity) &&
    Number(item.quantity) > 0
  );
}

function isCartItems(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.every(isCartItem);
}

function loadInitial(): CartItem[] {
  const current = readStorage<CartItem[] | null>(STORAGE_KEY, null, isCartItems);
  if (current) return current;

  const legacy = readStorage<CartItem[] | null>(LEGACY_KEY, null, isCartItems);
  if (!legacy) return [];

  writeStorage(STORAGE_KEY, legacy);
  removeStorage(LEGACY_KEY);
  return legacy;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitial);
  const toast = useToast();

  useEffect(() => {
    writeStorage(STORAGE_KEY, items);
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
        .filter((i) => i.quantity > 0),
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
