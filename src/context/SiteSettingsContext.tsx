import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { adminApi } from '../lib/api';
import type { SiteSettings } from '../types';

const DEFAULTS: SiteSettings = {
  siteName: 'Lexiconn Books',
  tagline: 'Curated Selections for the Modern Mind.',
  primaryColor: '#2563eb',
  accentColor: '#0f172a',
  heroImage: '',
};

interface Ctx {
  settings: SiteSettings;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<Ctx>({ settings: DEFAULTS, refresh: async () => {} });

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

function applyToCssVars(s: SiteSettings) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', s.primaryColor);
  root.style.setProperty('--brand-accent', s.accentColor);
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const { settings: s } = await adminApi.getSettings();
      if (s) {
        setSettings(s);
        applyToCssVars(s);
        document.title = s.siteName;
      }
    } catch {
      // ignore — fall back to defaults
    }
  }, []);

  useEffect(() => {
    applyToCssVars(settings);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
