import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X, Link as LinkIcon, ZoomIn } from 'lucide-react';
import UTIF from 'utif';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImageLoad: (imageData: ImageData, canvas: HTMLCanvasElement) => void;
  label?: string;
}

export const ImageUploader = ({ onImageLoad, label = "Arraste uma imagem ou clique para selecionar" }: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState('');
  const [lastCanvas, setLastCanvas] = useState<HTMLCanvasElement | null>(null);

  const emitFromCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setPreview(canvas.toDataURL('image/png'));
    setLastCanvas(canvas);
    onImageLoad(imageData, canvas);
  }, [onImageLoad]);

  const loadFromUrl = useCallback(async () => {
    if (!url.trim()) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Não foi possível carregar a imagem da URL.'));
        img.src = url.trim();
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      emitFromCanvas(canvas);
      toast.success(`Imagem carregada (${img.naturalWidth}×${img.naturalHeight}px).`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar URL.');
    }
  }, [url, emitFromCanvas]);

  const upscale2x = useCallback(() => {
    if (!lastCanvas) return;
    const c = document.createElement('canvas');
    c.width = lastCanvas.width * 2;
    c.height = lastCanvas.height * 2;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(lastCanvas, 0, 0, c.width, c.height);
    emitFromCanvas(c);
    toast.success(`Upscaled para ${c.width}×${c.height}px.`);
  }, [lastCanvas, emitFromCanvas]);

  const processTiff = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const ifds = UTIF.decode(buffer);
        UTIF.decodeImage(buffer, ifds[0]);
        const rgba = UTIF.toRGBA8(ifds[0]);
        const canvas = document.createElement('canvas');
        canvas.width = ifds[0].width;
        canvas.height = ifds[0].height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = new ImageData(new Uint8ClampedArray(rgba), canvas.width, canvas.height);
          ctx.putImageData(imageData, 0, 0);
          emitFromCanvas(canvas);
        }
      } catch (err) {
        console.error('Failed to decode TIFF', err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [emitFromCanvas]);

  const processImage = useCallback((file: File) => {
    const isTiff = /\.(tif|tiff)$/i.test(file.name) || file.type === 'image/tiff';
    if (isTiff) {
      processTiff(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          emitFromCanvas(canvas);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [emitFromCanvas, processTiff]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const clearImage = () => {
    setPreview(null);
  };

  return (
    <div className="w-full">
      {preview ? (
        <div className="relative group">
          <div className="glass-panel rounded-lg p-4 glow-border">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-w-full max-h-64 mx-auto rounded object-contain"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground 
                         rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <label
          className={`upload-zone flex flex-col items-center justify-center p-8 
                      ${isDragging ? 'border-primary bg-primary/10' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*,.tif,.tiff,image/tiff"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            {isDragging ? (
              <ImageIcon size={48} className="text-primary animate-pulse" />
            ) : (
              <Upload size={48} />
            )}
            <span className="text-sm text-center">{label}</span>
            <span className="text-xs">PNG, JPG, GIF, BMP, TIF/TIFF</span>
          </div>
        </label>
      )}
    </div>
  );
};
