import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploaderProps {
  onImageLoad: (imageData: ImageData, canvas: HTMLCanvasElement) => void;
  label?: string;
}

export const ImageUploader = ({ onImageLoad, label = "Arraste uma imagem ou clique para selecionar" }: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processImage = useCallback((file: File) => {
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
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setPreview(e.target?.result as string);
          onImageLoad(imageData, canvas);
        }
      };
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
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
            accept="image/*"
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
            <span className="text-xs">PNG, JPG, GIF, BMP</span>
          </div>
        </label>
      )}
    </div>
  );
};
