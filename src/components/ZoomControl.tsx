import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface ZoomControlProps {
  value: number; // percentage (25-400)
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export const ZoomControl = ({ value, onChange, min = 25, max = 400, label }: ZoomControlProps) => {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center gap-3 w-full">
      {label && <span className="text-xs text-muted-foreground shrink-0">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(clamp(value - 25))}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label="Diminuir zoom"
      >
        <ZoomOut size={16} />
      </button>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={5}
        onValueChange={(v) => onChange(v[0])}
        className="flex-1"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 25))}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label="Aumentar zoom"
      >
        <ZoomIn size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange(100)}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label="Resetar zoom"
      >
        <Maximize2 size={16} />
      </button>
      <span className="text-xs font-mono w-12 text-right text-muted-foreground">{value}%</span>
    </div>
  );
};
