import { useState, useRef } from 'react';
import { Download, Contrast, Settings } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { convertToBlackAndWhite, downloadCanvasAsImage } from '@/utils/imageProcessing';
import { Slider } from '@/components/ui/slider';

export const BlackWhiteConverter = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [processedData, setProcessedData] = useState<ImageData | null>(null);
  const [threshold, setThreshold] = useState(128);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageLoad = (data: ImageData, canvas: HTMLCanvasElement) => {
    setImageData(data);
    
    // Show original
    if (originalCanvasRef.current) {
      const ctx = originalCanvasRef.current.getContext('2d');
      if (ctx) {
        originalCanvasRef.current.width = data.width;
        originalCanvasRef.current.height = data.height;
        ctx.putImageData(data, 0, 0);
      }
    }
    
    processImage(data, threshold);
  };

  const processImage = (data: ImageData, thresh: number) => {
    const bwData = convertToBlackAndWhite(data, thresh);
    setProcessedData(bwData);
    
    if (previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (ctx) {
        previewCanvasRef.current.width = bwData.width;
        previewCanvasRef.current.height = bwData.height;
        ctx.putImageData(bwData, 0, 0);
      }
    }
  };

  const handleThresholdChange = (value: number[]) => {
    const newThreshold = value[0];
    setThreshold(newThreshold);
    if (imageData) {
      processImage(imageData, newThreshold);
    }
  };

  const handleDownload = async () => {
    if (previewCanvasRef.current) {
      await downloadCanvasAsImage(previewCanvasRef.current, 'imagem_preto_branco.png');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Contrast className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Conversor Preto e Branco</h2>
        </div>
        
        <p className="text-muted-foreground text-sm mb-6">
          Converta imagens para preto e branco puro, sem tons de cinza. 
          Ideal para impressão em impressoras térmicas.
        </p>

        <ImageUploader onImageLoad={handleImageLoad} />
      </div>

      {imageData && (
        <div className="glass-panel rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="text-primary" size={20} />
            <h3 className="font-semibold">Ajuste de Limiar</h3>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">
              Limiar: {threshold} (0 = mais branco, 255 = mais preto)
            </label>
            <Slider
              value={[threshold]}
              onValueChange={handleThresholdChange}
              min={0}
              max={255}
              step={1}
              className="w-full"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm text-muted-foreground mb-3">Imagem Original</h4>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <canvas 
                  ref={originalCanvasRef} 
                  className="max-w-full max-h-64 object-contain rounded"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm text-muted-foreground mb-3">Resultado Preto e Branco</h4>
              <div className="bg-white rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <canvas 
                  ref={previewCanvasRef} 
                  className="max-w-full max-h-64 object-contain"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <button onClick={handleDownload} className="download-button">
              <Download size={20} />
              Download PNG
            </button>

            {processedData && (
              <span className="text-sm text-muted-foreground">
                Dimensões: {processedData.width} x {processedData.height} pixels
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
