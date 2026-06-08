import { useState, useRef } from 'react';
import { Download, Grid3X3, Settings } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import {
  rasterImage,
  downloadCanvasAsImage,
  downloadFile,
  type Photometry,
  type Compression,
} from '@/utils/imageProcessing';
import { downloadCanvasAsTIFF } from '@/utils/tiff';

export const RasterConverter = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [processedData, setProcessedData] = useState<ImageData | null>(null);
  const [rawData, setRawData] = useState<Uint8Array | null>(null);
  const [photometry, setPhotometry] = useState<Photometry>('rgb-palette');
  const [compression, setCompression] = useState<Compression>('uncompressed');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageLoad = (data: ImageData) => {
    setImageData(data);
    if (originalCanvasRef.current) {
      const ctx = originalCanvasRef.current.getContext('2d');
      if (ctx) {
        originalCanvasRef.current.width = data.width;
        originalCanvasRef.current.height = data.height;
        ctx.putImageData(data, 0, 0);
      }
    }
    processImage(data, photometry, compression);
  };

  const processImage = (data: ImageData, photo: Photometry, comp: Compression) => {
    const result = rasterImage(data, {
      photometry: photo,
      compression: comp,
      width: data.width,
      height: data.height,
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

  const onPhotometryChange = (v: Photometry) => {
    setPhotometry(v);
    if (imageData) processImage(imageData, v, compression);
  };
  const onCompressionChange = (v: Compression) => {
    setCompression(v);
    if (imageData) processImage(imageData, photometry, v);
  };

  const handleDownloadImage = async () => {
    if (previewCanvasRef.current) await downloadCanvasAsImage(previewCanvasRef.current, `raster_${photometry}.png`);
  };
  const handleDownloadTIFF = () => {
    if (previewCanvasRef.current) downloadCanvasAsTIFF(previewCanvasRef.current, `raster_${photometry}.tif`);
  };
  const handleDownloadRaw = () => {
    if (rawData) {
      const ab = new ArrayBuffer(rawData.length);
      new Uint8Array(ab).set(rawData);
      downloadFile(new Blob([ab], { type: 'application/octet-stream' }), `raster_${photometry}.raw`, 'application/octet-stream');
    }
  };

  const photometryLabel: Record<Photometry, string> = {
    'uncompressed': 'Uncompressed (Não Comprimido)',
    'rgb-palette': 'RGB Palette',
    'rgb': 'RGB',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Grid3X3 className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Rasterização de Imagem</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Processe imagens com diferentes tipos de fotometria e compressão.
        </p>
        <ImageUploader onImageLoad={handleImageLoad} />
      </div>

      {imageData && (
        <div className="glass-panel rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="text-primary" size={20} />
            <h3 className="font-semibold">Configurações</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Tipo de Fotometria</label>
              <select
                value={photometry}
                onChange={(e) => onPhotometryChange(e.target.value as Photometry)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="rgb-palette" className="bg-white text-black">RGB Palette</option>
                <option value="rgb" className="bg-white text-black">RGB</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Compressão</label>
              <select
                value={compression}
                onChange={(e) => onCompressionChange(e.target.value as Compression)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="uncompressed" className="bg-white text-black">Uncompressed</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">{photometryLabel[photometry]}</h4>
            <p className="text-sm text-muted-foreground">
              {photometry === 'uncompressed' && 'Cada pixel é armazenado individualmente sem compressão.'}
              {photometry === 'rgb-palette' && 'Pixels indexados em uma paleta RGB. Eficiente com poucas cores.'}
              {photometry === 'rgb' && 'Armazenamento RGB completo (3 bytes/pixel) sem indexação.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm text-muted-foreground mb-3">Imagem Original</h4>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <canvas ref={originalCanvasRef} className="max-w-full max-h-64 object-contain rounded" />
              </div>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-3">Imagem Rasterizada</h4>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                <canvas ref={previewCanvasRef} className="max-w-full max-h-64 object-contain rounded" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <button onClick={handleDownloadImage} className="download-button">
              <Download size={20} /> Download Imagem PNG
            </button>
            <button onClick={handleDownloadRaw} className="tool-button flex items-center gap-2">
              <Download size={20} /> Download Dados RAW
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
                <div className="font-semibold">{photometryLabel[photometry]}</div>
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
