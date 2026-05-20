import { useState } from 'react';
import { Type, Check } from 'lucide-react';

interface ImageEditorProps {
  source: ImageData;
  onApply: (newData: ImageData) => void;
}

export const ImageEditor = ({ source, onApply }: ImageEditorProps) => {
  const [text, setText] = useState('');
  const [x, setX] = useState(20);
  const [y, setY] = useState(40);
  const [size, setSize] = useState(32);
  const [color, setColor] = useState<'black' | 'white'>('black');

  const apply = () => {
    if (!text) return;
    const c = document.createElement('canvas');
    c.width = source.width;
    c.height = source.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(source, 0, 0);
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
    onApply(ctx.getImageData(0, 0, source.width, source.height));
  };

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Type size={16} className="text-primary" />
        <h4 className="font-semibold text-sm">Editor: adicionar texto</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Texto</label>
          <input value={text} onChange={(e) => setText(e.target.value)}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">X (px)</label>
          <input type="number" value={x} onChange={(e) => setX(+e.target.value || 0)}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Y (px)</label>
          <input type="number" value={y} onChange={(e) => setY(+e.target.value || 0)}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tamanho</label>
          <input type="number" value={size} onChange={(e) => setSize(+e.target.value || 12)}
            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Cor</label>
          <select value={color} onChange={(e) => setColor(e.target.value as 'black' | 'white')}
            className="w-full bg-white text-black border border-border rounded px-2 py-1.5 text-sm">
            <option value="black">Preto</option>
            <option value="white">Branco</option>
          </select>
        </div>
        <button onClick={apply} disabled={!text}
          className="download-button md:col-span-1 disabled:opacity-50 disabled:cursor-not-allowed">
          <Check size={16} /> Aplicar
        </button>
      </div>
    </div>
  );
};
