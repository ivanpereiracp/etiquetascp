import { useEffect, useRef, useState } from 'react';
import { Download, FileCode, Settings, RotateCw, Save, Move, Printer } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { ImageGallery } from './ImageGallery';
import { ImageEditor, compositeOverlays, TextOverlay } from './ImageEditor';
import { ZoomControl } from './ZoomControl';
import {
  convertToGRF,
  convertToBlackAndWhite,
  downloadFile,
  downloadCanvasAsImage,
  clampToLabelSize,
  LABEL_MAX_WIDTH_PX,
  LABEL_MAX_HEIGHT_PX,
} from '@/utils/imageProcessing';
import { downloadCanvasAsTIFF } from '@/utils/tiff';
import { rotateImageData, Rotation } from '@/utils/rotation';
import { addGalleryItem, imageDataToDataUrl } from '@/utils/db';
import { Unit, fromPx, toPx } from '@/utils/units';
import { Slider } from '@/components/ui/slider';
import { sendZPLToAgent, wrapGRFForPrint } from '@/utils/zebraPrint';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';

export const GRFConverter = () => {
  const { settings } = useSettings();
  // Base image = original loaded (immutable for re-edit). Source = base + overlays composited.
  const [baseImage, setBaseImage] = useState<ImageData | null>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [sourceData, setSourceData] = useState<ImageData | null>(null);
  const [processedData, setProcessedData] = useState<ImageData | null>(null);
  const [grfContent, setGrfContent] = useState<string>('');
  const [threshold, setThreshold] = useState(128);
  const [imageName, setImageName] = useState('IMAGE');
  const [rotation, setRotation] = useState<Rotation>(0);
  const [zoom, setZoom] = useState(100);
  const [codeZoom, setCodeZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [unit, setUnit] = useState<Unit>('px');
  const [widthInput, setWidthInput] = useState<number>(0);
  const [heightInput, setHeightInput] = useState<number>(0);
  const [galleryKey, setGalleryKey] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const runPipeline = (src: ImageData, opts?: { width?: number; height?: number }) => {
    const rotated = rotateImageData(src, rotation);
    let resized = rotated;
    const w = opts?.width ?? rotated.width;
    const h = opts?.height ?? rotated.height;
    if (w !== rotated.width || h !== rotated.height) {
      const tmp = document.createElement('canvas');
      tmp.width = rotated.width;
      tmp.height = rotated.height;
      tmp.getContext('2d')!.putImageData(rotated, 0, 0);
      const out = document.createElement('canvas');
      out.width = Math.max(1, w);
      out.height = Math.max(1, h);
      const octx = out.getContext('2d')!;
      octx.imageSmoothingEnabled = false;
      octx.fillStyle = '#fff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(tmp, 0, 0, out.width, out.height);
      resized = octx.getImageData(0, 0, out.width, out.height);
    }
    const clamped = clampToLabelSize(resized, LABEL_MAX_WIDTH_PX, LABEL_MAX_HEIGHT_PX);
    const bw = convertToBlackAndWhite(clamped, threshold);
    setProcessedData(bw);
    setGrfContent(convertToGRF(bw, imageName.toUpperCase().replace(/\s/g, '_')));

    if (previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (ctx) {
        previewCanvasRef.current.width = bw.width;
        previewCanvasRef.current.height = bw.height;
        ctx.putImageData(bw, 0, 0);
      }
    }
  };

  // Re-composite overlays whenever they (or the base) change, then re-run pipeline.
  useEffect(() => {
    if (!baseImage) return;
    const composited = overlays.length ? compositeOverlays(baseImage, overlays) : baseImage;
    setSourceData(composited);
    runPipeline(composited, { width: toPx(widthInput, unit), height: toPx(heightInput, unit) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseImage, overlays]);

  useEffect(() => {
    if (sourceData) runPipeline(sourceData, { width: toPx(widthInput, unit), height: toPx(heightInput, unit) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, threshold, imageName]);

  const handleImageLoad = async (data: ImageData) => {
    setBaseImage(data);
    setOverlays([]);
    const rotated = rotateImageData(data, rotation);
    setWidthInput(fromPx(rotated.width, unit));
    setHeightInput(fromPx(rotated.height, unit));

    try {
      await addGalleryItem({
        id: `${Date.now()}`,
        name: imageName || 'IMAGE',
        createdAt: Date.now(),
        width: data.width,
        height: data.height,
        dataUrl: imageDataToDataUrl(data),
      });
      setGalleryKey((k) => k + 1);
    } catch (e) {
      console.error('gallery save failed', e);
    }
  };

  const handleUnitChange = (u: Unit) => {
    if (!sourceData) { setUnit(u); return; }
    const rotated = rotateImageData(sourceData, rotation);
    // Convert current px size to new unit display
    const currentPxW = toPx(widthInput, unit) || rotated.width;
    const currentPxH = toPx(heightInput, unit) || rotated.height;
    setUnit(u);
    setWidthInput(fromPx(currentPxW, u));
    setHeightInput(fromPx(currentPxH, u));
  };

  const applyDimensions = () => {
    if (!sourceData) return;
    runPipeline(sourceData, { width: toPx(widthInput, unit), height: toPx(heightInput, unit) });
  };

  const handleDownloadGRF = () => {
    if (grfContent) downloadFile(grfContent, `${imageName}.grf`, 'text/plain');
  };
  const handleDownloadPreview = async () => {
    if (previewCanvasRef.current) await downloadCanvasAsImage(previewCanvasRef.current, `${imageName}_preview.png`);
  };
  const handleDownloadPreviewTIFF = () => {
    if (previewCanvasRef.current) downloadCanvasAsTIFF(previewCanvasRef.current, `${imageName}_preview.tif`);
  };
  const resetPan = () => { setPanX(0); setPanY(0); };

  const onPreviewMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, baseX: panX, baseY: panY };
  };
  const onPreviewMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    setPanX(dragRef.current.baseX + (e.clientX - dragRef.current.startX));
    setPanY(dragRef.current.baseY + (e.clientY - dragRef.current.startY));
  };
  const endDrag = () => { dragRef.current.active = false; };

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
        <ImageUploader onImageLoad={(d) => handleImageLoad(d)} />
      </div>

      <ImageGallery onPick={(d, name) => { setImageName(name.replace(/\.[^.]+$/, '').toUpperCase() || 'IMAGE'); handleImageLoad(d); }} refreshKey={galleryKey} />

      {sourceData && (
        <>
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
                  onChange={(e) => setImageName(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="IMAGE"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Limiar de Preto/Branco: {threshold}</label>
                <Slider value={[threshold]} onValueChange={(v) => setThreshold(v[0])} min={0} max={255} step={1} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                  <RotateCw size={14} /> Rotação
                </label>
                <select
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value) as Rotation)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-black font-medium"
                >
                  <option value={0}>0°</option>
                  <option value={90}>90°</option>
                  <option value={180}>180°</option>
                  <option value={270}>270°</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Unidade</label>
                <select
                  value={unit}
                  onChange={(e) => handleUnitChange(e.target.value as Unit)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-black font-medium"
                >
                  <option value="px">Pixels</option>
                  <option value="mm">Milímetros</option>
                  <option value="cm">Centímetros</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Largura ({unit})</label>
                  <input
                    type="number"
                    value={widthInput}
                    onChange={(e) => setWidthInput(+e.target.value || 0)}
                    onBlur={applyDimensions}
                    className="w-full bg-input border border-border rounded px-2 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Altura ({unit})</label>
                  <input
                    type="number"
                    value={heightInput}
                    onChange={(e) => setHeightInput(+e.target.value || 0)}
                    onBlur={applyDimensions}
                    className="w-full bg-input border border-border rounded px-2 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <ZoomControl value={zoom} onChange={setZoom} label="Zoom preview" />
                <button onClick={resetPan} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <Move size={12} /> Reposicionar preview (arraste para mover)
                </button>
              </div>
              <div>
                <ZoomControl value={codeZoom} onChange={setCodeZoom} label="Zoom código" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-muted-foreground mb-3">Preview Processado</h4>
                <div
                  className="bg-white rounded-lg p-8 flex items-center justify-center min-h-[240px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={onPreviewMouseDown}
                  onMouseMove={onPreviewMouseMove}
                  onMouseUp={endDrag}
                  onMouseLeave={endDrag}
                >
                  <canvas
                    ref={previewCanvasRef}
                    style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom / 100})`, transformOrigin: 'center center' }}
                    className="object-contain pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm text-muted-foreground mb-3">Código GRF</h4>
                <div className="bg-muted rounded-lg p-4 h-[240px] overflow-auto">
                  <pre className="font-mono text-foreground break-all whitespace-pre-wrap" style={{ fontSize: `${(12 * codeZoom) / 100}px`, lineHeight: 1.4 }}>
                    {grfContent.substring(0, 1500)}
                    {grfContent.length > 1500 && '...'}
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
              <button onClick={handleDownloadPreviewTIFF} className="tool-button flex items-center gap-2">
                <Download size={20} />
                Download Preview TIF
              </button>
              <button
                onClick={async () => {
                  if (!grfContent) return;
                  if (!settings.printerEndpoint) {
                    toast.error('Configure a URL do agente Zebra em Configurações.');
                    return;
                  }
                  try {
                    const safe = imageName.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 8) || 'IMAGE';
                    const zpl = wrapGRFForPrint(grfContent, safe);
                    await sendZPLToAgent(zpl, { endpoint: settings.printerEndpoint, printerName: settings.printerName });
                    toast.success('Etiqueta enviada para a impressora Zebra.');
                  } catch (e: any) {
                    toast.error(e?.message || 'Falha ao imprimir.');
                  }
                }}
                className="tool-button flex items-center gap-2"
                title="Envia a imagem (não o texto GRF) para a Zebra, como o SAP faz"
              >
                <Printer size={20} /> Imprimir na Zebra
              </button>
              <button
                onClick={async () => {
                  if (!sourceData) return;
                  await addGalleryItem({
                    id: `${Date.now()}`,
                    name: imageName,
                    createdAt: Date.now(),
                    width: sourceData.width,
                    height: sourceData.height,
                    dataUrl: imageDataToDataUrl(sourceData),
                  });
                  setGalleryKey((k) => k + 1);
                }}
                className="tool-button flex items-center gap-2"
              >
                <Save size={20} /> Salvar na galeria
              </button>
            </div>

            {processedData && (
              <div className="text-sm text-muted-foreground">
                Dimensões finais: {processedData.width} x {processedData.height} pixels
              </div>
            )}
          </div>

          <ImageEditor source={baseImage} overlays={overlays} onOverlaysChange={setOverlays} />
        </>
      )}
    </div>
  );
};
