import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Tag as TagIcon, RotateCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { renderLabelaryPNG } from '@/utils/labelary';

interface BoxState {
  labelDataUrl: string | null;
  zpl: string;
  boxColor: string;
  boxW: number; // px on screen
  boxH: number;
  boxD: number;
  rotX: number; // perspective
  rotY: number;
  labelX: number; // % position on front face
  labelY: number;
  labelScale: number; // % of face width
  labelRot: number;
  lighting: number; // 0..100
}

const STORAGE_KEY = 'zit_box_sim_v1';

const DEFAULT: BoxState = {
  labelDataUrl: null,
  zpl: '^XA^FO50,50^A0N,40,40^FDEXEMPLO^FS^XZ',
  boxColor: '#c8a064',
  boxW: 360,
  boxH: 280,
  boxD: 220,
  rotX: -18,
  rotY: -28,
  labelX: 50,
  labelY: 50,
  labelScale: 55,
  labelRot: 0,
  lighting: 35,
};

export const BoxSimulator = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<BoxState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT;
  });
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const update = <K extends keyof BoxState>(k: K, v: BoxState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const handleUpload = (f: File) => {
    const r = new FileReader();
    r.onload = () => update('labelDataUrl', String(r.result));
    r.readAsDataURL(f);
  };

  const handleRenderZPL = async () => {
    if (!state.zpl.trim()) return;
    setLoading(true);
    try {
      const url = await renderLabelaryPNG({ zpl: state.zpl, dpmm: 8, widthInches: 4, heightInches: 3 });
      const res = await fetch(url);
      const blob = await res.blob();
      const r = new FileReader();
      r.onload = () => update('labelDataUrl', String(r.result));
      r.readAsDataURL(blob);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao renderizar');
    } finally {
      setLoading(false);
    }
  };

  const exportPNG = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'box-simulation.png';
      a.click();
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + (e?.message || ''));
    }
  };

  const { boxW, boxH, boxD, rotX, rotY, boxColor, labelX, labelY, labelScale, labelRot, labelDataUrl, lighting } = state;

  const cardboard = `repeating-linear-gradient(45deg, ${boxColor} 0 6px, ${shade(boxColor, -8)} 6px 12px)`;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-5 bg-card/40 backdrop-blur p-4 rounded-lg border border-border/50">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <TagIcon size={18} /> {t('box.title')}
        </h2>

        <div className="space-y-2">
          <Label>{t('box.labelSource')}</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} className="mr-1" /> {t('box.uploadImage')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </div>
          <textarea
            value={state.zpl}
            onChange={(e) => update('zpl', e.target.value)}
            placeholder="^XA...^XZ"
            className="w-full h-24 text-xs font-mono p-2 rounded border bg-background"
          />
          <Button size="sm" onClick={handleRenderZPL} disabled={loading} className="w-full">
            {loading ? '...' : t('box.renderZpl')}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>{t('box.boxColor')}</Label>
          <Input type="color" value={boxColor} onChange={(e) => update('boxColor', e.target.value)} className="h-10 w-full" />
        </div>

        <Slide label={`${t('box.width')}: ${boxW}px`} value={boxW} min={120} max={600} onChange={(v) => update('boxW', v)} />
        <Slide label={`${t('box.height')}: ${boxH}px`} value={boxH} min={120} max={500} onChange={(v) => update('boxH', v)} />
        <Slide label={`${t('box.depth')}: ${boxD}px`} value={boxD} min={60} max={500} onChange={(v) => update('boxD', v)} />
        <Slide label={`${t('box.rotX')}: ${rotX}°`} value={rotX} min={-60} max={60} onChange={(v) => update('rotX', v)} />
        <Slide label={`${t('box.rotY')}: ${rotY}°`} value={rotY} min={-90} max={90} onChange={(v) => update('rotY', v)} />
        <Slide label={`${t('box.lighting')}: ${lighting}%`} value={lighting} min={0} max={80} onChange={(v) => update('lighting', v)} />

        <hr className="border-border/50" />

        <Slide label={`${t('box.labelX')}: ${labelX}%`} value={labelX} min={0} max={100} onChange={(v) => update('labelX', v)} />
        <Slide label={`${t('box.labelY')}: ${labelY}%`} value={labelY} min={0} max={100} onChange={(v) => update('labelY', v)} />
        <Slide label={`${t('box.labelScale')}: ${labelScale}%`} value={labelScale} min={10} max={100} onChange={(v) => update('labelScale', v)} />
        <Slide label={`${t('box.labelRot')}: ${labelRot}°`} value={labelRot} min={-180} max={180} onChange={(v) => update('labelRot', v)} />

        <Button variant="outline" className="w-full" onClick={exportPNG}>
          <Download size={14} className="mr-1" /> {t('box.exportPng')}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setState(DEFAULT)}>
          <RotateCw size={14} className="mr-1" /> {t('box.reset')}
        </Button>
      </aside>

      <div className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border border-border/50 min-h-[500px] flex items-center justify-center overflow-hidden">
        <div
          ref={stageRef}
          style={{ perspective: '1400px' }}
          className="w-full h-full min-h-[500px] flex items-center justify-center p-8"
        >
          <div
            style={{
              width: boxW,
              height: boxH,
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
              position: 'relative',
              transition: 'transform 0.2s',
            }}
          >
            {/* Front face */}
            <Face style={{ width: boxW, height: boxH, transform: `translateZ(${boxD / 2}px)`, background: cardboard }} shade={lighting * 0.2}>
              {labelDataUrl && (
                <img
                  src={labelDataUrl}
                  alt="label"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: `${labelX}%`,
                    top: `${labelY}%`,
                    width: `${labelScale}%`,
                    transform: `translate(-50%, -50%) rotate(${labelRot}deg)`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    background: 'white',
                  }}
                />
              )}
            </Face>
            {/* Back */}
            <Face style={{ width: boxW, height: boxH, transform: `translateZ(-${boxD / 2}px) rotateY(180deg)`, background: cardboard }} shade={lighting} />
            {/* Right */}
            <Face style={{ width: boxD, height: boxH, transform: `translateX(${boxW - boxD / 2}px) rotateY(90deg)`, background: cardboard }} shade={lighting * 0.5} />
            {/* Left */}
            <Face style={{ width: boxD, height: boxH, transform: `translateX(-${boxD / 2}px) rotateY(-90deg)`, background: cardboard }} shade={lighting * 0.6} />
            {/* Top */}
            <Face style={{ width: boxW, height: boxD, transform: `translateY(-${boxD / 2}px) rotateX(90deg)`, background: cardboard }} shade={lighting * 0.1} />
            {/* Bottom */}
            <Face style={{ width: boxW, height: boxD, transform: `translateY(${boxH - boxD / 2}px) rotateX(-90deg)`, background: cardboard }} shade={lighting * 0.8} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Face: React.FC<{ style: React.CSSProperties; shade?: number; children?: React.ReactNode }> = ({ style, shade = 0, children }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      backfaceVisibility: 'hidden',
      boxShadow: 'inset 0 0 60px rgba(0,0,0,0.15)',
      ...style,
    }}
  >
    <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${shade / 100})` }} />
    {children}
  </div>
);

const Slide: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> = ({
  label, value, min, max, onChange,
}) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
  </div>
);

function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0xff) + percent;
  let b = (num & 0xff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
