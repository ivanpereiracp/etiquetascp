/**
 * Label presets + custom sizes — persistidos em localStorage e exportáveis/importáveis via JSON.
 * Permite levar configurações de um PC para outro.
 */
import type { ZPLElement } from '@/utils/zplGenerator';

export interface LabelSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  builtin?: boolean;
}

export interface LabelPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  widthDots: number;
  heightDots: number;
  dpi: number;
  bgColor: string;
  elements: ZPLElement[];
  notes?: string;
}

export interface PresetBundle {
  version: 1;
  exportedAt: string;
  presets: LabelPreset[];
  sizes: LabelSize[];
}

const PRESETS_KEY = 'zit_label_presets_v1';
const SIZES_KEY = 'zit_label_sizes_v1';

export const BUILTIN_SIZES: LabelSize[] = [
  { id: 'sz-100x201', name: '100 × 201 mm (mais usada)', widthMm: 100, heightMm: 201, builtin: true },
  { id: 'sz-100x150', name: '100 × 150 mm', widthMm: 100, heightMm: 150, builtin: true },
  { id: 'sz-100x50',  name: '100 × 50 mm',  widthMm: 100, heightMm: 50,  builtin: true },
  { id: 'sz-80x40',   name: '80 × 40 mm',   widthMm: 80,  heightMm: 40,  builtin: true },
  { id: 'sz-50x30',   name: '50 × 30 mm',   widthMm: 50,  heightMm: 30,  builtin: true },
];

/* ----------------- Presets ----------------- */
export const loadPresets = (): LabelPreset[] => {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? (JSON.parse(raw) as LabelPreset[]) : [];
  } catch { return []; }
};
export const savePresets = (list: LabelPreset[]) => {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
};
export const upsertPreset = (p: LabelPreset) => {
  const list = loadPresets();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p; else list.push(p);
  savePresets(list);
  return list;
};
export const deletePreset = (id: string) => {
  const list = loadPresets().filter((x) => x.id !== id);
  savePresets(list);
  return list;
};

/* ----------------- Tamanhos ----------------- */
export const loadSizes = (): LabelSize[] => {
  try {
    const raw = localStorage.getItem(SIZES_KEY);
    const custom = raw ? (JSON.parse(raw) as LabelSize[]) : [];
    return [...BUILTIN_SIZES, ...custom.filter((s) => !s.builtin)];
  } catch { return BUILTIN_SIZES; }
};
export const saveCustomSizes = (sizes: LabelSize[]) => {
  const custom = sizes.filter((s) => !s.builtin);
  localStorage.setItem(SIZES_KEY, JSON.stringify(custom));
};
export const addCustomSize = (s: Omit<LabelSize, 'id' | 'builtin'>) => {
  const all = loadSizes();
  const next: LabelSize = { ...s, id: `sz-${Date.now().toString(36)}` };
  saveCustomSizes([...all, next]);
  return next;
};
export const deleteCustomSize = (id: string) => {
  const all = loadSizes().filter((s) => s.id !== id || s.builtin);
  saveCustomSizes(all);
  return all;
};

/* ----------------- Export / Import ----------------- */
export const exportBundle = (): PresetBundle => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  presets: loadPresets(),
  sizes: loadSizes().filter((s) => !s.builtin),
});

export const downloadBundle = (filename = 'etiquetas.zitlabel.json') => {
  const bundle = exportBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const importBundleFromFile = async (file: File): Promise<{ presets: number; sizes: number }> => {
  const text = await file.text();
  const data = JSON.parse(text) as PresetBundle;
  if (!data || data.version !== 1) throw new Error('Arquivo inválido ou versão não suportada.');
  // Merge presets (id único — substitui)
  const existing = loadPresets();
  const map = new Map(existing.map((p) => [p.id, p]));
  (data.presets || []).forEach((p) => map.set(p.id, p));
  savePresets([...map.values()]);
  // Merge sizes customizados
  const existingSizes = loadSizes().filter((s) => !s.builtin);
  const sizeMap = new Map(existingSizes.map((s) => [s.id, s]));
  (data.sizes || []).filter((s) => !s.builtin).forEach((s) => sizeMap.set(s.id, s));
  saveCustomSizes([...sizeMap.values()]);
  return { presets: (data.presets || []).length, sizes: (data.sizes || []).length };
};

export const mmToDots = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);
export const dotsToMm = (dots: number, dpi: number) => +((dots / dpi) * 25.4).toFixed(1);
