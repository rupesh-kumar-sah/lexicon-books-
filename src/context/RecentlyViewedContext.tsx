import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lexiconn_recently_viewed';
const MAX_ITEMS = 12;

interface RecentlyViewedContextType {
  recentIds: string[];
  addRecent: (bookId: string) => void;
  clearRecent: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentIds));
    } catch {}
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
