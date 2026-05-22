// Labelary public preview API helpers (no auth required).
// Docs: http://labelary.com/service.html

export type LabelaryDpmm = 6 | 8 | 12 | 24;
export type LabelaryRotation = 0 | 90 | 180 | 270;

export interface LabelaryParams {
  zpl: string;
  dpmm?: LabelaryDpmm; // dots/mm (203dpi = 8)
  widthInches?: number;
  heightInches?: number;
  index?: number;
  rotation?: LabelaryRotation;
}

export const dpiToDpmm = (dpi: number): LabelaryDpmm => {
  if (dpi >= 600) return 24;
  if (dpi >= 300) return 12;
  if (dpi >= 203) return 8;
  return 6;
};

export const renderLabelaryPNG = async (params: LabelaryParams): Promise<string> => {
  const dpmm = params.dpmm ?? 8;
  const w = (params.widthInches ?? 4).toFixed(2);
  const h = (params.heightInches ?? 6).toFixed(2);
  const idx = params.index ?? 0;
  const rot = params.rotation ?? 0;
  const url = `https://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${w}x${h}/${idx}/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'image/png', 'X-Rotation': String(rot) },
    body: params.zpl,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Labelary ${res.status}: ${txt || res.statusText}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const buildLabelaryViewerUrl = (zpl: string): string => {
  // Labelary viewer accepts ZPL via URL fragment
  return `https://labelary.com/viewer.html?zpl=${encodeURIComponent(zpl)}`;
};
