import { useState, useRef } from 'react';
import { Download, FileCode, Settings } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { convertToGRF, convertToBlackAndWhite, downloadFile, downloadCanvasAsImage, clampToLabelSize, LABEL_MAX_WIDTH_PX, LABEL_MAX_HEIGHT_PX } from '@/utils/imageProcessing';
import { Slider } from '@/components/ui/slider';

export const GRFConverter = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [processedData, setProcessedData] = useState<ImageData | null>(null);
  const [grfContent, setGrfContent] = useState<string>('');
  const [threshold, setThreshold] = useState(128);
  const [imageName, setImageName] = useState('IMAGE');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageLoad = (data: ImageData, canvas: HTMLCanvasElement) => {
    setImageData(data);
    processImage(data, threshold);
  };

  const processImage = (data: ImageData, thresh: number) => {
    // Convert to black and white
    const bwData = convertToBlackAndWhite(data, thresh);
    setProcessedData(bwData);
    
    // Generate GRF
    const grf = convertToGRF(bwData, imageName.toUpperCase().replace(/\s/g, '_'));
    setGrfContent(grf);
    
    // Update preview canvas
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

  const handleDownloadGRF = () => {
    if (grfContent) {
      downloadFile(grfContent, `${imageName}.grf`, 'text/plain');
    }
  };

  const handleDownloadPreview = async () => {
    if (previewCanvasRef.current) {
      await downloadCanvasAsImage(previewCanvasRef.current, `${imageName}_preview.png`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileCode className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Conversor GRF para Zebra</h2>
        </div>
        
        <p className="text-muted-foreground text-sm mb-6">
          Converta imagens para o formato .GRF compatível com impressoras Zebra ZPL.
        </p>

        <ImageUploader onImageLoad={handleImageLoad} />
      </div>

      {imageData && (
        <div className="glass-panel rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="text-primary" size={20} />
            <h3 className="font-semibold">Configurações</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Nome da Imagem</label>
              <input
                type="text"
                value={imageName}
                onChange={(e) => {
                  setImageName(e.target.value);
                  if (imageData) processImage(imageData, threshold);
                }}
                className="w-full bg-input border border-border rounded-lg px-4 py-2 
                           focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="IMAGE"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">
                Limiar de Preto/Branco: {threshold}
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
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm text-muted-foreground mb-3">Preview Processado</h4>
              <div className="bg-white rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <canvas 
                  ref={previewCanvasRef} 
                  className="max-w-full max-h-48 object-contain"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm text-muted-foreground mb-3">Código GRF</h4>
              <div className="bg-muted rounded-lg p-4 h-[200px] overflow-auto">
                <pre className="text-xs font-mono text-foreground break-all whitespace-pre-wrap">
                  {grfContent.substring(0, 500)}
                  {grfContent.length > 500 && '...'}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button onClick={handleDownloadGRF} className="download-button">
              <Download size={20} />
              Download .GRF
            </button>
            <button onClick={handleDownloadPreview} className="tool-button flex items-center gap-2">
              <Download size={20} />
              Download Preview PNG
            </button>
          </div>

          {processedData && (
            <div className="text-sm text-muted-foreground">
              Dimensões: {processedData.width} x {processedData.height} pixels
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
