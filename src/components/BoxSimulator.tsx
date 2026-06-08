import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Tag as TagIcon, RotateCw, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { renderLabelaryPNG } from '@/utils/labelary';

type Surface = 'box' | 'bigbag' | 'drum' | 'bombona' | 'pallet';
type FaceName = 'front' | 'back' | 'left' | 'right' | 'top';

interface BoxState {
  surface: Surface;
  labelDataUrl: string | null;
  topLabelDataUrl: string | null;
  logoDataUrl: string | null;
  logoFace: FaceName;
  zpl: string;
  boxColor: string;
  drumColor: string;
  boxW: number;
  boxH: number;
  boxD: number;
  rotX: number;
  rotY: number;
  labelFace: FaceName;
  labelX: number;
  labelY: number;
  labelScale: number;
  labelRot: number;
  topLabelX: number;
  topLabelY: number;
  topLabelScale: number;
  logoX: number;
  logoY: number;
  logoScale: number;
  logoRot: number;
  lighting: number;
  palletRows: number;
  palletCols: number;
  palletLayers: number;
}

const STORAGE_KEY = 'zit_box_sim_v2';

const DEFAULT: BoxState = {
  surface: 'box',
  labelDataUrl: null,
  topLabelDataUrl: null,
  logoDataUrl: null,
  logoFace: 'front',
  zpl: '^XA^FO50,50^A0N,40,40^FDEXEMPLO^FS^XZ',
  boxColor: '#c8a064',
  drumColor: '#1f6feb',
  boxW: 340,
  boxH: 260,
  boxD: 210,
  rotX: -18,
  rotY: -28,
  labelFace: 'front',
  labelX: 50,
  labelY: 50,
  labelScale: 55,
  labelRot: 0,
  topLabelX: 50,
  topLabelY: 50,
  topLabelScale: 45,
  logoX: 20,
  logoY: 20,
  logoScale: 25,
  logoRot: 0,
  lighting: 35,
  palletRows: 2,
  palletCols: 2,
  palletLayers: 3,
};

const SURFACE_OPTIONS: { value: Surface; label: string }[] = [
  { value: 'box', label: 'Caixa de papelão' },
  { value: 'bigbag', label: 'Big Bag' },
  { value: 'drum', label: 'Tambor' },
  { value: 'bombona', label: 'Bombona (extrato café)' },
  { value: 'pallet', label: 'Paletização' },
];

const FACE_OPTIONS: { value: FaceName; label: string }[] = [
  { value: 'front', label: 'Frente' },
  { value: 'back', label: 'Trás' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
  { value: 'top', label: 'Topo' },
];

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
  const labelFileRef = useRef<HTMLInputElement>(null);
  const topLabelFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const update = <K extends keyof BoxState>(k: K, v: BoxState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const loadAs = (f: File, key: 'labelDataUrl' | 'topLabelDataUrl' | 'logoDataUrl') => {
    const r = new FileReader();
    r.onload = () => update(key, String(r.result));
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
      a.download = `${state.surface}-simulation.png`;
      a.click();
    } catch (e: any) {
      toast.error('Erro ao exportar: ' + (e?.message || ''));
    }
  };

  const { surface } = state;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4 bg-card/40 backdrop-blur p-4 rounded-lg border border-border/50 max-h-[85vh] overflow-y-auto">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <TagIcon size={18} /> Simulador de embalagem
        </h2>

        <div className="space-y-2">
          <Label>Tipo de embalagem</Label>
          <Select value={surface} onValueChange={(v) => update('surface', v as Surface)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SURFACE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Etiqueta principal */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label className="font-semibold">Etiqueta principal</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => labelFileRef.current?.click()}>
              <Upload size={14} className="mr-1" /> Imagem
            </Button>
            <input ref={labelFileRef} type="file" accept="image/*" hidden
              onChange={(e) => e.target.files?.[0] && loadAs(e.target.files[0], 'labelDataUrl')} />
            {state.labelDataUrl && (
              <Button variant="ghost" size="sm" onClick={() => update('labelDataUrl', null)}>Remover</Button>
            )}
          </div>
          <textarea value={state.zpl} onChange={(e) => update('zpl', e.target.value)}
            placeholder="^XA...^XZ" className="w-full h-20 text-xs font-mono p-2 rounded border bg-background" />
          <Button size="sm" onClick={handleRenderZPL} disabled={loading} className="w-full">
            {loading ? '...' : 'Renderizar ZPL'}
          </Button>

          {surface === 'box' && (
            <div className="space-y-2">
              <Label className="text-xs">Face da etiqueta</Label>
              <Select value={state.labelFace} onValueChange={(v) => update('labelFace', v as FaceName)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <Slide label={`Pos X: ${state.labelX}%`} value={state.labelX} min={0} max={100} onChange={(v) => update('labelX', v)} />
          <Slide label={`Pos Y: ${state.labelY}%`} value={state.labelY} min={0} max={100} onChange={(v) => update('labelY', v)} />
          <Slide label={`Tamanho: ${state.labelScale}%`} value={state.labelScale} min={10} max={100} onChange={(v) => update('labelScale', v)} />
          <Slide label={`Rotação: ${state.labelRot}°`} value={state.labelRot} min={-180} max={180} onChange={(v) => update('labelRot', v)} />
        </div>

        {/* Etiqueta no topo (somente caixa) */}
        {surface === 'box' && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="font-semibold">Etiqueta no topo</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => topLabelFileRef.current?.click()}>
                <Upload size={14} className="mr-1" /> Imagem topo
              </Button>
              <input ref={topLabelFileRef} type="file" accept="image/*" hidden
                onChange={(e) => e.target.files?.[0] && loadAs(e.target.files[0], 'topLabelDataUrl')} />
              {state.topLabelDataUrl && (
                <Button variant="ghost" size="sm" onClick={() => update('topLabelDataUrl', null)}>Remover</Button>
              )}
            </div>
            {state.topLabelDataUrl && (
              <>
                <Slide label={`Pos X topo: ${state.topLabelX}%`} value={state.topLabelX} min={0} max={100} onChange={(v) => update('topLabelX', v)} />
                <Slide label={`Pos Y topo: ${state.topLabelY}%`} value={state.topLabelY} min={0} max={100} onChange={(v) => update('topLabelY', v)} />
                <Slide label={`Tamanho topo: ${state.topLabelScale}%`} value={state.topLabelScale} min={10} max={100} onChange={(v) => update('topLabelScale', v)} />
              </>
            )}
          </div>
        )}

        {/* Logo */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label className="font-semibold flex items-center gap-1"><ImageIcon size={14} /> Logo</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => logoFileRef.current?.click()}>
              <Upload size={14} className="mr-1" /> Logo
            </Button>
            <input ref={logoFileRef} type="file" accept="image/*" hidden
              onChange={(e) => e.target.files?.[0] && loadAs(e.target.files[0], 'logoDataUrl')} />
            {state.logoDataUrl && (
              <Button variant="ghost" size="sm" onClick={() => update('logoDataUrl', null)}>Remover</Button>
            )}
          </div>
          {state.logoDataUrl && (
            <>
              {surface === 'box' && (
                <div className="space-y-1">
                  <Label className="text-xs">Face do logo</Label>
                  <Select value={state.logoFace} onValueChange={(v) => update('logoFace', v as FaceName)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FACE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Slide label={`Logo X: ${state.logoX}%`} value={state.logoX} min={0} max={100} onChange={(v) => update('logoX', v)} />
              <Slide label={`Logo Y: ${state.logoY}%`} value={state.logoY} min={0} max={100} onChange={(v) => update('logoY', v)} />
              <Slide label={`Logo tamanho: ${state.logoScale}%`} value={state.logoScale} min={5} max={80} onChange={(v) => update('logoScale', v)} />
              <Slide label={`Logo rotação: ${state.logoRot}°`} value={state.logoRot} min={-180} max={180} onChange={(v) => update('logoRot', v)} />
            </>
          )}
        </div>

        {/* Cores e dimensões */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label>Cor da caixa/big bag</Label>
          <Input type="color" value={state.boxColor} onChange={(e) => update('boxColor', e.target.value)} className="h-10 w-full" />
          {(surface === 'drum' || surface === 'bombona') && (
            <>
              <Label>Cor do tambor/bombona</Label>
              <Input type="color" value={state.drumColor} onChange={(e) => update('drumColor', e.target.value)} className="h-10 w-full" />
            </>
          )}
          <Slide label={`Largura: ${state.boxW}px`} value={state.boxW} min={120} max={600} onChange={(v) => update('boxW', v)} />
          <Slide label={`Altura: ${state.boxH}px`} value={state.boxH} min={120} max={500} onChange={(v) => update('boxH', v)} />
          {surface === 'box' && (
            <Slide label={`Profundidade: ${state.boxD}px`} value={state.boxD} min={60} max={500} onChange={(v) => update('boxD', v)} />
          )}
          <Slide label={`Inclinação X: ${state.rotX}°`} value={state.rotX} min={-60} max={60} onChange={(v) => update('rotX', v)} />
          <Slide label={`Rotação Y: ${state.rotY}°`} value={state.rotY} min={-90} max={90} onChange={(v) => update('rotY', v)} />
          <Slide label={`Iluminação: ${state.lighting}%`} value={state.lighting} min={0} max={80} onChange={(v) => update('lighting', v)} />
        </div>

        {/* Pallet */}
        {surface === 'pallet' && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="font-semibold">Paletização</Label>
            <Slide label={`Colunas: ${state.palletCols}`} value={state.palletCols} min={1} max={5} onChange={(v) => update('palletCols', v)} />
            <Slide label={`Linhas: ${state.palletRows}`} value={state.palletRows} min={1} max={5} onChange={(v) => update('palletRows', v)} />
            <Slide label={`Camadas: ${state.palletLayers}`} value={state.palletLayers} min={1} max={6} onChange={(v) => update('palletLayers', v)} />
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={exportPNG}>
          <Download size={14} className="mr-1" /> Exportar PNG
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setState(DEFAULT)}>
          <RotateCw size={14} className="mr-1" /> Restaurar
        </Button>
      </aside>

      <div className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border border-border/50 min-h-[500px] flex items-center justify-center overflow-hidden">
        <div ref={stageRef} style={{ perspective: '1600px' }}
          className="w-full h-full min-h-[500px] flex items-center justify-center p-8">
          {surface === 'box' && <BoxScene s={state} />}
          {surface === 'bigbag' && <BigBagScene s={state} />}
          {surface === 'drum' && <DrumScene s={state} kind="drum" />}
          {surface === 'bombona' && <DrumScene s={state} kind="bombona" />}
          {surface === 'pallet' && <PalletScene s={state} />}
        </div>
      </div>
    </div>
  );
};

/* =====================  SCENES  ===================== */

const BoxScene: React.FC<{ s: BoxState }> = ({ s }) => {
  const { boxW, boxH, boxD, rotX, rotY, boxColor, lighting } = s;
  const cardboard = `repeating-linear-gradient(45deg, ${boxColor} 0 6px, ${shade(boxColor, -10)} 6px 12px)`;
  const faceMap: Record<FaceName, React.CSSProperties> = {
    front: { width: boxW, height: boxH, transform: `translateZ(${boxD / 2}px)` },
    back: { width: boxW, height: boxH, transform: `translateZ(-${boxD / 2}px) rotateY(180deg)` },
    right: { width: boxD, height: boxH, transform: `translateX(${boxW - boxD / 2}px) rotateY(90deg)` },
    left: { width: boxD, height: boxH, transform: `translateX(-${boxD / 2}px) rotateY(-90deg)` },
    top: { width: boxW, height: boxD, transform: `translateY(-${boxD / 2}px) rotateX(90deg)` },
  };

  const renderOverlay = (face: FaceName) => (
    <>
      {s.labelFace === face && s.labelDataUrl && (
        <Overlay src={s.labelDataUrl} x={s.labelX} y={s.labelY} scale={s.labelScale} rot={s.labelRot} bg="white" />
      )}
      {face === 'top' && s.topLabelDataUrl && (
        <Overlay src={s.topLabelDataUrl} x={s.topLabelX} y={s.topLabelY} scale={s.topLabelScale} rot={0} bg="white" />
      )}
      {s.logoFace === face && s.logoDataUrl && (
        <Overlay src={s.logoDataUrl} x={s.logoX} y={s.logoY} scale={s.logoScale} rot={s.logoRot} bg="transparent" />
      )}
    </>
  );

  return (
    <div style={{
      width: boxW, height: boxH, transformStyle: 'preserve-3d',
      transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
      position: 'relative', transition: 'transform 0.2s',
    }}>
      <Face style={{ ...faceMap.front, background: cardboard }} shade={lighting * 0.2}>{renderOverlay('front')}</Face>
      <Face style={{ ...faceMap.back, background: cardboard }} shade={lighting}>{renderOverlay('back')}</Face>
      <Face style={{ ...faceMap.right, background: cardboard }} shade={lighting * 0.5}>{renderOverlay('right')}</Face>
      <Face style={{ ...faceMap.left, background: cardboard }} shade={lighting * 0.6}>{renderOverlay('left')}</Face>
      <Face style={{ ...faceMap.top, background: cardboard }} shade={lighting * 0.1}>{renderOverlay('top')}</Face>
      <Face style={{ width: boxW, height: boxD, transform: `translateY(${boxH - boxD / 2}px) rotateX(-90deg)`, background: cardboard }} shade={lighting * 0.8} />
    </div>
  );
};

const BigBagScene: React.FC<{ s: BoxState }> = ({ s }) => {
  const { boxW, boxH, boxColor, lighting, rotY } = s;
  const w = boxW; const h = boxH;
  return (
    <div style={{ transform: `rotateY(${rotY * 0.3}deg)`, transformStyle: 'preserve-3d' }}>
      <svg width={w} height={h + 80} viewBox={`0 0 ${w} ${h + 80}`}>
        <defs>
          <linearGradient id="bg1" x1="0" x2="1">
            <stop offset="0" stopColor={shade(boxColor, 20)} />
            <stop offset="0.5" stopColor={boxColor} />
            <stop offset="1" stopColor={shade(boxColor, -25)} />
          </linearGradient>
        </defs>
        {/* alças */}
        <path d={`M${w * 0.2} 40 Q${w * 0.3} 0 ${w * 0.4} 40`} stroke={shade(boxColor, -30)} strokeWidth="6" fill="none" />
        <path d={`M${w * 0.6} 40 Q${w * 0.7} 0 ${w * 0.8} 40`} stroke={shade(boxColor, -30)} strokeWidth="6" fill="none" />
        {/* corpo (bag bulging) */}
        <path d={`M20 40 Q-10 ${h * 0.6} 30 ${h + 50} L${w - 30} ${h + 50} Q${w + 10} ${h * 0.6} ${w - 20} 40 Z`}
          fill="url(#bg1)" stroke={shade(boxColor, -30)} strokeWidth="1.5" />
        {/* sombra */}
        <ellipse cx={w / 2} cy={h + 65} rx={w / 2.2} ry="10" fill="rgba(0,0,0,0.25)" />
        {/* iluminação */}
        <rect x="20" y="40" width={w - 40} height={h + 10} fill={`rgba(0,0,0,${lighting / 250})`} />
      </svg>
      <SvgOverlay s={s} containerW={w} containerH={h + 80} centerY={(h + 80) / 2 + 10} maxW={w * 0.8} />
    </div>
  );
};

const DrumScene: React.FC<{ s: BoxState; kind: 'drum' | 'bombona' }> = ({ s, kind }) => {
  const { boxW, boxH, drumColor, lighting, rotY } = s;
  const w = boxW; const h = boxH;
  const isB = kind === 'bombona';
  return (
    <div style={{ transform: `rotateY(${rotY * 0.2}deg)` }}>
      <svg width={w} height={h + 60} viewBox={`0 0 ${w} ${h + 60}`}>
        <defs>
          <linearGradient id="dr1" x1="0" x2="1">
            <stop offset="0" stopColor={shade(drumColor, -20)} />
            <stop offset="0.3" stopColor={shade(drumColor, 25)} />
            <stop offset="0.7" stopColor={drumColor} />
            <stop offset="1" stopColor={shade(drumColor, -35)} />
          </linearGradient>
        </defs>
        {isB ? (
          <>
            {/* bombona: corpo arredondado com alça e gargalo */}
            <rect x={w * 0.4} y="5" width={w * 0.2} height="22" rx="3" fill={shade(drumColor, -20)} />
            <rect x="20" y="30" width={w - 40} height={h} rx="20" fill="url(#dr1)" stroke={shade(drumColor, -40)} />
            <path d={`M${w - 40} 60 q30 10 0 50`} stroke={shade(drumColor, -30)} strokeWidth="8" fill="none" />
          </>
        ) : (
          <>
            {/* tambor: cilindro com aros */}
            <ellipse cx={w / 2} cy="25" rx={w / 2 - 10} ry="14" fill={shade(drumColor, 30)} stroke={shade(drumColor, -40)} />
            <rect x="10" y="25" width={w - 20} height={h} fill="url(#dr1)" />
            <ellipse cx={w / 2} cy={h + 25} rx={w / 2 - 10} ry="14" fill={shade(drumColor, -30)} stroke={shade(drumColor, -50)} />
            <rect x="10" y={h * 0.25 + 25} width={w - 20} height="6" fill={shade(drumColor, -30)} opacity="0.7" />
            <rect x="10" y={h * 0.7 + 25} width={w - 20} height="6" fill={shade(drumColor, -30)} opacity="0.7" />
          </>
        )}
        {/* sombra chão */}
        <ellipse cx={w / 2} cy={h + 45} rx={w / 2.4} ry="8" fill="rgba(0,0,0,0.3)" />
        {/* iluminação */}
        <rect x="10" y="25" width={w - 20} height={h} fill={`rgba(0,0,0,${lighting / 280})`} />
      </svg>
      <SvgOverlay s={s} containerW={w} containerH={h + 60} centerY={(h + 60) / 2 + 5} maxW={w * 0.75} />
    </div>
  );
};

const PalletScene: React.FC<{ s: BoxState }> = ({ s }) => {
  const { palletRows, palletCols, palletLayers, rotX, rotY, boxColor, lighting } = s;
  const unit = 80;
  const totalW = palletCols * unit;
  const totalD = palletRows * unit;
  const cardboard = `repeating-linear-gradient(45deg, ${boxColor} 0 4px, ${shade(boxColor, -10)} 4px 8px)`;

  const boxes: React.ReactNode[] = [];
  for (let layer = 0; layer < palletLayers; layer++) {
    for (let r = 0; r < palletRows; r++) {
      for (let c = 0; c < palletCols; c++) {
        const isOuter = (layer === palletLayers - 1) && r === 0 && c === 0;
        const showLabel = s.labelDataUrl && layer === palletLayers - 1;
        const tx = c * unit - totalW / 2 + unit / 2;
        const ty = -layer * unit - unit / 2;
        const tz = r * unit - totalD / 2 + unit / 2;
        boxes.push(
          <div key={`${layer}-${r}-${c}`} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: unit, height: unit, marginLeft: -unit / 2, marginTop: -unit / 2,
            transformStyle: 'preserve-3d',
            transform: `translate3d(${tx}px,${ty}px,${tz}px)`,
          }}>
            <MiniBox size={unit} background={cardboard} shadeAmt={lighting} label={showLabel && c === palletCols - 1 ? s.labelDataUrl! : null} />
          </div>
        );
        void isOuter;
      }
    }
  }

  // Palete de madeira simples
  const palletThickness = 18;
  return (
    <div style={{ transformStyle: 'preserve-3d', transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`, width: totalW, height: totalD }}>
      <div style={{ position: 'relative', width: totalW, height: 1, transformStyle: 'preserve-3d' }}>
        {boxes}
        {/* palete topo */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: totalW + 30, height: totalD + 30,
          marginLeft: -(totalW + 30) / 2, marginTop: -(totalD + 30) / 2,
          background: 'repeating-linear-gradient(90deg, #8b5a2b 0 14px, #6b4220 14px 18px)',
          transform: `translateY(${palletThickness / 2}px) rotateX(90deg)`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }} />
        {/* palete base */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: totalW + 30, height: totalD + 30,
          marginLeft: -(totalW + 30) / 2, marginTop: -(totalD + 30) / 2,
          background: '#5a3a1c',
          transform: `translateY(${palletThickness * 1.5}px) rotateX(90deg)`,
        }} />
      </div>
    </div>
  );
};

const MiniBox: React.FC<{ size: number; background: string; shadeAmt: number; label: string | null }> = ({ size, background, shadeAmt, label }) => {
  const half = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, transformStyle: 'preserve-3d' }}>
      <Face style={{ width: size, height: size, transform: `translateZ(${half}px)`, background }} shade={shadeAmt * 0.2}>
        {label && <Overlay src={label} x={50} y={50} scale={80} rot={0} bg="white" />}
      </Face>
      <Face style={{ width: size, height: size, transform: `translateZ(-${half}px) rotateY(180deg)`, background }} shade={shadeAmt} />
      <Face style={{ width: size, height: size, transform: `translateX(${half}px) rotateY(90deg)`, background }} shade={shadeAmt * 0.5} />
      <Face style={{ width: size, height: size, transform: `translateX(-${half}px) rotateY(-90deg)`, background }} shade={shadeAmt * 0.5} />
      <Face style={{ width: size, height: size, transform: `translateY(-${half}px) rotateX(90deg)`, background }} shade={shadeAmt * 0.1} />
      <Face style={{ width: size, height: size, transform: `translateY(${half}px) rotateX(-90deg)`, background }} shade={shadeAmt * 0.8} />
    </div>
  );
};

/* =====================  HELPERS  ===================== */

const Face: React.FC<{ style: React.CSSProperties; shade?: number; children?: React.ReactNode }> = ({ style, shade = 0, children }) => (
  <div style={{
    position: 'absolute', left: 0, top: 0, backfaceVisibility: 'hidden',
    boxShadow: 'inset 0 0 60px rgba(0,0,0,0.18)', overflow: 'hidden', ...style,
  }}>
    <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${shade / 100})`, pointerEvents: 'none' }} />
    {children}
  </div>
);

const Overlay: React.FC<{ src: string; x: number; y: number; scale: number; rot: number; bg: string }> = ({ src, x, y, scale, rot, bg }) => (
  <img src={src} alt="" draggable={false} style={{
    position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${scale}%`,
    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
    boxShadow: bg !== 'transparent' ? '0 2px 6px rgba(0,0,0,0.25)' : 'none',
    background: bg, pointerEvents: 'none',
  }} />
);

const SvgOverlay: React.FC<{ s: BoxState; containerW: number; containerH: number; centerY: number; maxW: number }> = ({ s, containerW, maxW }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    {s.labelDataUrl && (
      <img src={s.labelDataUrl} alt="" style={{
        position: 'absolute', left: `${s.labelX}%`, top: `${s.labelY}%`,
        width: `${(s.labelScale / 100) * maxW}px`,
        transform: `translate(-50%, -50%) rotate(${s.labelRot}deg)`,
        background: 'white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }} />
    )}
    {s.logoDataUrl && (
      <img src={s.logoDataUrl} alt="" style={{
        position: 'absolute', left: `${s.logoX}%`, top: `${s.logoY}%`,
        width: `${(s.logoScale / 100) * maxW}px`,
        transform: `translate(-50%, -50%) rotate(${s.logoRot}deg)`,
      }} />
    )}
    {void containerW}
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
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
