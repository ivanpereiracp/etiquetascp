import { useState, useRef } from 'react';
import { Download, Grid3X3, Settings } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { rasterImage, downloadCanvasAsImage, downloadFile } from '@/utils/imageProcessing';

export const RasterConverter = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [processedData, setProcessedData] = useState<ImageData | null>(null);
  const [rawData, setRawData] = useState<Uint8Array | null>(null);
  const [photometry, setPhotometry] = useState<'uncompressed' | 'rgb-palette'>('uncompressed');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageLoad = (data: ImageData, canvas: HTMLCanvasElement) => {
    setImageData(data);
    
    if (originalCanvasRef.current) {
      const ctx = originalCanvasRef.current.getContext('2d');
      if (ctx) {
        originalCanvasRef.current.width = data.width;
        originalCanvasRef.current.height = data.height;
        ctx.putImageData(data, 0, 0);
      }
    }
    
    processImage(data, photometry);
  };

  const processImage = (data: ImageData, photo: 'uncompressed' | 'rgb-palette') => {
    const result = rasterImage(data, {
      photometry: photo,
      width: data.width,
      height: data.height
    });
    
    setProcessedData(result.imageData);
    setRawData(result.rawData);
    
    if (previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (ctx) {
        previewCanvasRef.current.width = result.imageData.width;
        previewCanvasRef.current.height = result.imageData.height;
        ctx.putImageData(result.imageData, 0, 0);
      }
    }
  };

  const handlePhotometryChange = (value: 'uncompressed' | 'rgb-palette') => {
    setPhotometry(value);
    if (imageData) {
      processImage(imageData, value);
    }
  };

  const handleDownloadImage = async () => {
    if (previewCanvasRef.current) {
      await downloadCanvasAsImage(previewCanvasRef.current, `raster_${photometry}.png`);
    }
  };

  const handleDownloadRaw = () => {
    if (rawData) {
      const arrayBuffer = new ArrayBuffer(rawData.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(rawData);
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      downloadFile(blob, `raster_${photometry}.raw`, 'application/octet-stream');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Grid3X3 className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Rasterização de Imagem</h2>
        </div>
        
        <p className="text-muted-foreground text-sm mb-6">
          Processe imagens com diferentes tipos de fotometria para uso em sistemas de impressão.
        </p>

        <ImageUploader onImageLoad={handleImageLoad} />
      </div>

      {imageData && (
        <div className="glass-panel rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="text-primary" size={20} />
            <h3 className="font-semibold">Configurações de Fotometria</h3>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Tipo de Fotometria</label>
            <select
              value={photometry}
              onChange={(e) => handlePhotometryChange(e.target.value as 'uncompressed' | 'rgb-palette')}
              className="w-full md:w-64 px-4 py-2 rounded-lg border border-border 
                         bg-white text-black font-medium
                         focus:outline-none focus:ring-2 focus:ring-primary
                         cursor-pointer"
            >
              <option value="uncompressed" className="bg-white text-black">
                Uncompressed (Não Comprimido)
              </option>
              <option value="rgb-palette" className="bg-white text-black">
                RGB Palette
              </option>
            </select>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">
              {photometry === 'uncompressed' ? 'Modo Uncompressed' : 'Modo RGB Palette'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {photometry === 'uncompressed' 
                ? 'Cada pixel é armazenado individualmente sem compressão. Resulta em arquivos maiores, mas sem perda de qualidade.'
                : 'Pixels são indexados em uma paleta de cores RGB. Mais eficiente para imagens com poucas cores únicas.'}
            </p>
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
              <h4 className="text-sm text-muted-foreground mb-3">Imagem Rasterizada</h4>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <canvas 
                  ref={previewCanvasRef} 
                  className="max-w-full max-h-64 object-contain rounded"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <button onClick={handleDownloadImage} className="download-button">
              <Download size={20} />
              Download Imagem PNG
            </button>
            <button onClick={handleDownloadRaw} className="tool-button flex items-center gap-2">
              <Download size={20} />
              Download Dados RAW
            </button>
          </div>

          {processedData && rawData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Largura</div>
                <div className="font-semibold">{processedData.width}px</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Altura</div>
                <div className="font-semibold">{processedData.height}px</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Fotometria</div>
                <div className="font-semibold capitalize">{photometry.replace('-', ' ')}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-muted-foreground">Tamanho RAW</div>
                <div className="font-semibold">{(rawData.length / 1024).toFixed(2)} KB</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
