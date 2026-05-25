import { useEffect, useState } from 'react';
import { Type, Check, Trash2, RotateCw, Pencil, Plus } from 'lucide-react';

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: 'black' | 'white';
  rotation: number; // degrees
}

interface ImageEditorProps {
  source: ImageData | null;
  overlays: TextOverlay[];
  onOverlaysChange: (next: TextOverlay[]) => void;
}

export const ImageEditor = ({ source, overlays, onOverlaysChange }: ImageEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TextOverlay>({
    id: '', text: '', x: 20, y: 40, size: 32, color: 'black', rotation: 0,
  });

  useEffect(() => {
    if (editingId) {
      const ex = overlays.find((o) => o.id === editingId);
      if (ex) setDraft(ex);
    }
  }, [editingId, overlays]);

  const startNew = () => {
    setEditingId(null);
    setDraft({ id: '', text: '', x: 20, y: 40, size: 32, color: 'black', rotation: 0 });
  };

  const commit = () => {
    if (!draft.text) return;
    if (editingId) {
      onOverlaysChange(overlays.map((o) => (o.id === editingId ? { ...draft, id: editingId } : o)));
    } else {
      onOverlaysChange([...overlays, { ...draft, id: `${Date.now()}` }]);
    }
    startNew();
  };

  const removeOverlay = (id: string) => {
    onOverlaysChange(overlays.filter((o) => o.id !== id));
    if (editingId === id) startNew();
  };

  const rotate90 = (id: string) => {
    onOverlaysChange(overlays.map((o) => (o.id === id ? { ...o, rotation: (o.rotation + 90) % 360 } : o)));
  };

  return (
    <div className="glass-panel rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Type size={16} className="text-primary" />
        <h4 className="font-semibold text-sm">Editor: textos personalizados</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Texto</label>
          <input value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">X (px)</label>
          <input type="number" value={draft.x} onChange={(e) => setDraft({ ...draft, x: +e.target.value || 0 })}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Y (px)</label>
          <input type="number" value={draft.y} onChange={(e) => setDraft({ ...draft, y: +e.target.value || 0 })}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tam</label>
          <input type="number" value={draft.size} onChange={(e) => setDraft({ ...draft, size: +e.target.value || 12 })}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Rot°</label>
          <input type="number" value={draft.rotation} onChange={(e) => setDraft({ ...draft, rotation: +e.target.value || 0 })}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs text-muted-foreground">Cor</label>
          <select value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value as 'black' | 'white' })}
            className="w-full bg-white text-black border border-border rounded px-2 py-1.5 text-sm">
            <option value="black">Preto</option>
            <option value="white">Branco</option>
          </select>
        </div>
        <button onClick={commit} disabled={!draft.text || !source}
          className="download-button md:col-span-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {editingId ? <><Check size={16} /> Salvar alterações</> : <><Plus size={16} /> Adicionar texto</>}
        </button>
        {editingId && (
          <button onClick={startNew} className="tool-button md:col-span-1 text-sm">Cancelar</button>
        )}
      </div>

      {overlays.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs uppercase tracking-wide text-muted-foreground">Textos adicionados</h5>
          <ul className="space-y-2">
            {overlays.map((o) => (
              <li key={o.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded border ${editingId === o.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}`}>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium truncate">{o.text}</div>
                  <div className="text-xs text-muted-foreground">
                    pos ({o.x}, {o.y}) · tam {o.size} · rot {o.rotation}° · {o.color === 'black' ? 'preto' : 'branco'}
                  </div>
                </div>
                <button onClick={() => rotate90(o.id)} title="Rotacionar 90°"
                  className="p-1.5 rounded hover:bg-muted text-foreground"><RotateCw size={14} /></button>
                <button onClick={() => setEditingId(o.id)} title="Editar"
                  className="p-1.5 rounded hover:bg-muted text-foreground"><Pencil size={14} /></button>
                <button onClick={() => removeOverlay(o.id)} title="Excluir"
                  className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Helper used by parent to composite overlays onto the base image.
export const compositeOverlays = (base: ImageData, overlays: TextOverlay[]): ImageData => {
  const c = document.createElement('canvas');
  c.width = base.width;
  c.height = base.height;
  const ctx = c.getContext('2d')!;
  ctx.putImageData(base, 0, 0);
  for (const o of overlays) {
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.rotation) ctx.rotate((o.rotation * Math.PI) / 180);
    ctx.fillStyle = o.color;
    ctx.font = `bold ${o.size}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(o.text, 0, 0);
    ctx.restore();
  }
  return ctx.getImageData(0, 0, base.width, base.height);
};
