import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

const STORAGE_KEY = 'booksellnp_recently_viewed';
const MAX_ITEMS = 12;

interface RecentlyViewedContextType {
  recentIds: string[];
  addRecent: (bookId: string) => void;
  clearRecent: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

function isBookIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string' && id.length > 0);
}

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentIds, setRecentIds] = useState<string[]>(() => readStorage(STORAGE_KEY, [], isBookIdList));

  useEffect(() => {
    writeStorage(STORAGE_KEY, recentIds);
  }, [recentIds]);

  const addRecent = useCallback((bookId: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== bookId);
      return [bookId, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clearRecent = useCallback(() => setRecentIds([]), []);

  return (
    <RecentlyViewedContext.Provider value={{ recentIds, addRecent, clearRecent }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error('useRecentlyViewed must be used within RecentlyViewedProvider');
  return ctx;
}
