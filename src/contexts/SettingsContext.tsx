import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface AppSettings {
  siteName: string;
  siteSubtitle: string;
  logoDataUrl: string | null;
  primaryHsl: string;
  secondaryHsl: string;
  backgroundHsl: string;
  fontFamily: string;
  editorBg: string;
}

const DEFAULTS: AppSettings = {
  siteName: 'Zebra Image Tools',
  siteSubtitle: 'Processamento de imagens para impressoras Zebra',
  logoDataUrl: null,
  primaryHsl: '190 95% 50%',
  secondaryHsl: '220 15% 20%',
  backgroundHsl: '220 20% 10%',
  fontFamily: 'Inter',
  editorBg: '#ffffff',
};

const STORAGE_KEY = 'zit_settings_v1';

interface Ctx {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', settings.primaryHsl);
    root.style.setProperty('--ring', settings.primaryHsl);
    root.style.setProperty('--sidebar-primary', settings.primaryHsl);
    root.style.setProperty('--sidebar-ring', settings.primaryHsl);
    root.style.setProperty('--secondary', settings.secondaryHsl);
    root.style.setProperty('--background', settings.backgroundHsl);
    document.body.style.fontFamily = `'${settings.fontFamily}', sans-serif`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<AppSettings>) =>
    setSettings((s) => ({ ...s, ...patch }));
  const reset = () => setSettings(DEFAULTS);

  return (
    <SettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider');
  return ctx;
};

// Helpers for hex<->hsl strings used by color inputs.
export const hexToHsl = (hex: string): string => {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const hslToHex = (hsl: string): string => {
  const [hStr, sStr, lStr] = hsl.split(' ');
  const h = parseFloat(hStr) / 360;
  const s = parseFloat(sStr) / 100;
  const l = parseFloat(lStr) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
