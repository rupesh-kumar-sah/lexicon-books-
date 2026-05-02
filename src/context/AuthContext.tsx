import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authApi, getToken, setToken } from '../lib/api';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, adminData?: { latitude: number; longitude: number; device: string }) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await authApi.me();
        if (!cancelled) setUser(user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, adminData?: { latitude: number; longitude: number; device: string }) => {
    const { token, user } = await authApi.login({ 
      email, 
      password, 
      latitude: adminData?.latitude,
      longitude: adminData?.longitude,
      device: adminData?.device
    });
    setToken(token);
    setUser(user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { token, user } = await authApi.signup({ email, password, displayName });
    setToken(token);
    setUser(user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin: user?.role === 'admin',
        authModalOpen,
        openAuthModal: () => setAuthModalOpen(true),
        closeAuthModal: () => setAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
