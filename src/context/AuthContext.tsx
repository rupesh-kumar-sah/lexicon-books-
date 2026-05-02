import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authApi, getToken, setToken } from '../lib/api';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, verifyAdmin?: boolean) => Promise<void>;
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

  const signIn = useCallback(async (email: string, password: string, verifyAdmin?: boolean) => {
    let lat: number | undefined;
    let lng: number | undefined;
    let device: string | undefined;

    if (verifyAdmin) {
      device = navigator.userAgent;
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser. (Are you using HTTP instead of HTTPS?)');
      }
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e: any) {
        let msg = 'Failed to get location.';
        if (e.code === 1) msg = 'Location permission denied. Please enable it in your browser settings (Site Settings -> Location).';
        else if (e.code === 2) msg = 'Location unavailable. Make sure your device GPS is turned on.';
        else if (e.code === 3) msg = 'Location request timed out.';
        else if (e.message) msg = e.message;
        throw new Error(msg);
      }
    }

    const { token, user } = await authApi.login({ 
      email, 
      password, 
      latitude: lat,
      longitude: lng,
      device
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
