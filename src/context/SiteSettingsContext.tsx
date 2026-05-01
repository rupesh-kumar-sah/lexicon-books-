import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { adminApi } from '../lib/api';
import type { SiteSettings } from '../types';

const DEFAULTS: SiteSettings = {
  siteName: 'BookSellNP',
  tagline: 'Curated Selections for the Modern Mind.',
  primaryColor: '#2563eb',
  accentColor: '#0f172a',
  heroImage: '',
  shippingKtm: 100,
  shippingOutside: 150,
  freeShippingThreshold: 5000,
  footerText1: 'Secure SSL Checkout',
  footerText2: '30-Day Easy Returns',
  footerText3: 'Global Shipping Available',
  footerLink1: 'Privacy',
  footerLink2: 'Terms',
  footerCompany: 'BOOKSELLNP MEDIA GROUP',
  privacyContent: '# Privacy Policy\n\nYour privacy is important to us...',
  termsContent: '# Terms of Service\n\nBy using our service, you agree...',
  adminPin: '2063',
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
        // Always merge with DEFAULTS so missing DB fields never cause undefined errors
        const merged: SiteSettings = { ...DEFAULTS, ...s };
        setSettings(merged);
        applyToCssVars(merged);
        document.title = merged.siteName;
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
