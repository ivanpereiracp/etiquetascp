import { useEffect, useRef, useState } from 'react';
import { Save, FolderOpen, Download, Upload, Trash2, Plus, X } from 'lucide-react';
import {
  loadPresets, upsertPreset, deletePreset,
  loadSizes, addCustomSize, deleteCustomSize,
  downloadBundle, importBundleFromFile,
  mmToDots,
  type LabelPreset, type LabelSize,
} from '@/utils/labelPresets';
import { toast } from 'sonner';

interface Props {
  current: {
    widthDots: number; heightDots: number; dpi: number;
    bgColor: string; elements: any[];
  };
  onLoadPreset: (p: LabelPreset) => void;
  onPickSize: (s: LabelSize) => void;
}

export const PresetManager: React.FC<Props> = ({ current, onLoadPreset, onPickSize }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'presets' | 'sizes'>('presets');
  const [presets, setPresets] = useState<LabelPreset[]>([]);
  const [sizes, setSizes] = useState<LabelSize[]>([]);
  const [presetName, setPresetName] = useState('');
  const [sizeName, setSizeName] = useState('');
  const [sizeW, setSizeW] = useState(100);
  const [sizeH, setSizeH] = useState(150);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setPresets(loadPresets()); setSizes(loadSizes()); }
  }, [open]);

  const handleSavePreset = () => {
    if (!presetName.trim()) { toast.error('Informe um nome para o preset.'); return; }
    const now = Date.now();
    const p: LabelPreset = {
      id: `p-${now.toString(36)}`,
      name: presetName.trim(),
      createdAt: now, updatedAt: now,
      widthDots: current.widthDots,
      heightDots: current.heightDots,
      dpi: current.dpi,
      bgColor: current.bgColor,
      elements: current.elements,
    };
    setPresets(upsertPreset(p));
    setPresetName('');
    toast.success('Preset salvo!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const r = await importBundleFromFile(f);
      setPresets(loadPresets()); setSizes(loadSizes());
      toast.success(`Importado: ${r.presets} presets, ${r.sizes} tamanhos.`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleAddSize = () => {
    if (!sizeName.trim() || sizeW <= 0 || sizeH <= 0) { toast.error('Preencha nome e dimensões.'); return; }
    addCustomSize({ name: sizeName.trim(), widthMm: sizeW, heightMm: sizeH });
    setSizes(loadSizes());
    setSizeName('');
    toast.success('Tamanho adicionado.');
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="tool-button flex items-center gap-2">
        <FolderOpen size={16} /> Presets & Tamanhos
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-lg">Gerenciar presets e tamanhos</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded"><X size={18} /></button>
            </div>

            <div className="flex border-b border-border">
              <button onClick={() => setTab('presets')} className={`px-4 py-2 ${tab === 'presets' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>Presets de etiqueta</button>
              <button onClick={() => setTab('sizes')} className={`px-4 py-2 ${tab === 'sizes' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>Tamanhos</button>
              <div className="ml-auto flex gap-2 p-2">
                <button onClick={() => downloadBundle()} className="tool-button text-xs flex items-center gap-1"><Download size={12} /> Exportar</button>
                <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
                <button onClick={() => fileRef.current?.click()} className="tool-button text-xs flex items-center gap-1"><Upload size={12} /> Importar</button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto">
              {tab === 'presets' && (
                <>
                  <div className="flex gap-2 mb-4">
                    <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Nome do preset (ex: Material A)" className="flex-1 px-3 py-2 rounded bg-input border border-border" />
                    <button onClick={handleSavePreset} className="download-button"><Save size={16} /> Salvar atual</button>
                  </div>
                  {presets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum preset salvo ainda.</p>
                  ) : (
                    <ul className="space-y-2">
                      {presets.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 p-3 rounded border border-border bg-muted/30">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.widthDots}×{p.heightDots} dots · {p.dpi} dpi · {p.elements.length} itens · {new Date(p.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { onLoadPreset(p); setOpen(false); toast.success('Preset carregado.'); }} className="tool-button text-xs">Carregar</button>
                            <button onClick={() => { setPresets(deletePreset(p.id)); }} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 size={14} /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {tab === 'sizes' && (
                <>
                  <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 mb-4">
                    <input value={sizeName} onChange={(e) => setSizeName(e.target.value)} placeholder="Nome (ex: Bag 100×201)" className="px-3 py-2 rounded bg-input border border-border" />
                    <input type="number" value={sizeW} onChange={(e) => setSizeW(+e.target.value)} placeholder="L mm" className="px-2 py-2 rounded bg-input border border-border" />
                    <input type="number" value={sizeH} onChange={(e) => setSizeH(+e.target.value)} placeholder="A mm" className="px-2 py-2 rounded bg-input border border-border" />
                    <button onClick={handleAddSize} className="download-button"><Plus size={14} /></button>
                  </div>
                  <ul className="space-y-2">
                    {sizes.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 p-3 rounded border border-border bg-muted/30">
                        <div>
                          <div className="font-medium">{s.name} {s.builtin && <span className="text-xs text-muted-foreground">(padrão)</span>}</div>
                          <div className="text-xs text-muted-foreground">{s.widthMm}×{s.heightMm} mm · @203dpi ≈ {mmToDots(s.widthMm, 203)}×{mmToDots(s.heightMm, 203)} dots</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { onPickSize(s); setOpen(false); }} className="tool-button text-xs">Usar</button>
                          {!s.builtin && (
                            <button onClick={() => setSizes(deleteCustomSize(s.id))} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
