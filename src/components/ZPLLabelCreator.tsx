import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Trash2,
  Tag,
  Type,
  Barcode,
  QrCode,
  Square,
  Minus,
  FileText,
  FileImage,
  Image as ImageIcon,
  Printer,
  Copy,
} from 'lucide-react';
import { sendZPLToAgent } from '@/utils/zebraPrint';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  generateZPL,
  ZPLElement,
  fontOptions,
  barcodeOptions,
  dpiOptions,
  barcodeTypeToJsbarcode,
  previewFontOptions,
  getPreviewFontCss,
} from '@/utils/zplGenerator';
import { downloadFile, convertToBlackAndWhite, convertToGRF } from '@/utils/imageProcessing';
import { Slider } from '@/components/ui/slider';
import { DOTS_PER_MM } from '@/utils/units';
import { PresetManager } from '@/components/PresetManager';
import { loadSizes, mmToDots, type LabelSize, type LabelPreset } from '@/utils/labelPresets';

type Drag = { index: number; offsetX: number; offsetY: number } | null;
type ResizeDrag = { index: number; startW: number; startH: number; startX: number; startY: number } | null;
const HANDLE = 10;
const dotsToMm = (d: number) => +(d / DOTS_PER_MM).toFixed(1);



const renderBarcodeToCanvas = (
  el: Extract<ZPLElement, { type: 'barcode' }>,
): HTMLCanvasElement | null => {
  try {
    const c = document.createElement('canvas');
    JsBarcode(c, el.content || ' ', {
      format: barcodeTypeToJsbarcode(el.barcodeType),
      height: el.height,
      displayValue: el.humanReadable ?? true,
      margin: 0,
      width: el.moduleWidth ?? 2,
      fontSize: 14,
      background: 'transparent',
    });
    return c;
  } catch {
    return null;
  }
};

const renderQRToCanvas = async (
  el: Extract<ZPLElement, { type: 'qrcode' }>,
): Promise<HTMLCanvasElement | null> => {
  try {
    const c = document.createElement('canvas');
    await QRCode.toCanvas(c, el.content || ' ', {
      width: el.size * 20,
      margin: 0,
      errorCorrectionLevel: el.errorCorrection ?? 'M',
      color: { dark: '#000000ff', light: '#00000000' },
    });
    return c;
  } catch {
    return null;
  }
};

export const ZPLLabelCreator = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [labelWidth, setLabelWidth] = useState(400);
  const [labelHeight, setLabelHeight] = useState(300);
  const [dpi, setDpi] = useState(203);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [elements, setElements] = useState<ZPLElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [zplCode, setZplCode] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag>(null);
  const resizeRef = useRef<ResizeDrag>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Persist editor state
  useEffect(() => {
    const raw = localStorage.getItem('zit_zpl_state_v1');
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (s.labelWidth) setLabelWidth(s.labelWidth);
        if (s.labelHeight) setLabelHeight(s.labelHeight);
        if (s.dpi) setDpi(s.dpi);
        if (s.bgColor) setBgColor(s.bgColor);
        if (Array.isArray(s.elements)) setElements(s.elements);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(
      'zit_zpl_state_v1',
      JSON.stringify({ labelWidth, labelHeight, dpi, bgColor, elements }),
    );
  }, [labelWidth, labelHeight, dpi, bgColor, elements]);


  const addElement = (type: ZPLElement['type']) => {
    let newElement: ZPLElement;
    switch (type) {
      case 'text':
        newElement = { type: 'text', x: 50, y: 50, font: '0', fontSize: 30, content: 'Texto', previewFont: 'latin' };
        break;
      case 'barcode':
        newElement = {
          type: 'barcode',
          x: 50,
          y: 100,
          barcodeType: 'C',
          height: 80,
          content: '1234567890',
          humanReadable: true,
          moduleWidth: 2,
        };
        break;
      case 'qrcode':
        newElement = {
          type: 'qrcode',
          x: 50,
          y: 100,
          size: 5,
          content: 'https://example.com',
          errorCorrection: 'M',
        };
        break;
      case 'line':
        newElement = { type: 'line', x: 50, y: 50, width: 200, height: 2 };
        break;
      case 'box':
        newElement = { type: 'box', x: 50, y: 50, width: 150, height: 100, borderWidth: 2 };
        break;
      case 'image':
        // open file picker; element will be added in handler
        imageInputRef.current?.click();
        return;
      default:
        return;
    }
    setElements((prev) => {
      const next = [...prev, newElement];
      setSelectedElement(next.length - 1);
      return next;
    });
  };

  const updateElement = (index: number, updates: Partial<ZPLElement>) => {
    setElements((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates } as ZPLElement;
      return next;
    });
  };

  const removeElement = (index: number) => {
    setElements((prev) => prev.filter((_, i) => i !== index));
    setSelectedElement(null);
  };

  const generateCode = useCallback(() => {
    const zpl = generateZPL({ width: labelWidth, height: labelHeight, dpi, elements });
    setZplCode(zpl);
  }, [labelWidth, labelHeight, dpi, elements]);

  const downloadZPL = () => {
    const code = generateZPL({ width: labelWidth, height: labelHeight, dpi, elements });
    setZplCode(code);
    downloadFile(code, 'etiqueta.zpl', 'text/plain');
  };

  const downloadPNG = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'etiqueta.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const downloadPDF = () => {
    if (!canvasRef.current) return;
    const imgData = canvasRef.current.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        `<html><head><title>Etiqueta ZPL</title></head><body style="margin:0;padding:20px;"><img src="${imgData}" style="max-width:100%;" /><script>window.onload=function(){window.print();}</script></body></html>`,
      );
      printWindow.document.close();
    }
  };

  // Bounding boxes for hit-testing (computed each draw)
  const bboxesRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);

  const drawPreview = useCallback(async () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, labelWidth, labelHeight);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    const bboxes: { x: number; y: number; w: number; h: number }[] = [];

    for (const element of elements) {
      let bbox = { x: element.x, y: element.y, w: 20, h: 20 };
      switch (element.type) {
        case 'text': {
          ctx.font = `${element.fontSize}px ${getPreviewFontCss(element.previewFont)}`;
          const metrics = ctx.measureText(element.content);
          ctx.fillText(element.content, element.x, element.y + element.fontSize);
          bbox = { x: element.x, y: element.y, w: metrics.width, h: element.fontSize + 4 };
          break;
        }
        case 'barcode': {
          const bc = renderBarcodeToCanvas(element);
          if (bc) {
            ctx.drawImage(bc, element.x, element.y);
            bbox = { x: element.x, y: element.y, w: bc.width, h: bc.height };
          } else {
            ctx.strokeRect(element.x, element.y, 120, element.height);
            bbox = { x: element.x, y: element.y, w: 120, h: element.height };
          }
          break;
        }
        case 'qrcode': {
          const qr = await renderQRToCanvas(element);
          if (qr) {
            ctx.drawImage(qr, element.x, element.y);
            bbox = { x: element.x, y: element.y, w: qr.width, h: qr.height };
          } else {
            const s = element.size * 20;
            ctx.strokeRect(element.x, element.y, s, s);
            bbox = { x: element.x, y: element.y, w: s, h: s };
          }
          break;
        }
        case 'line':
          ctx.fillRect(element.x, element.y, element.width, element.height);
          bbox = { x: element.x, y: element.y, w: element.width, h: element.height };
          break;
        case 'box':
          ctx.lineWidth = element.borderWidth;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
          bbox = { x: element.x, y: element.y, w: element.width, h: element.height };
          break;
        case 'image': {
          let img = imageCacheRef.current.get(element.imageDataUrl);
          if (!img) {
            img = new Image();
            img.src = element.imageDataUrl;
            imageCacheRef.current.set(element.imageDataUrl, img);
            await new Promise<void>((res) => {
              img!.onload = () => res();
              img!.onerror = () => res();
            });
          }
          if (img.complete && img.naturalWidth) {
            ctx.drawImage(img, element.x, element.y, element.width, element.height);
          } else {
            ctx.strokeRect(element.x, element.y, element.width, element.height);
          }
          bbox = { x: element.x, y: element.y, w: element.width, h: element.height };
          break;
        }
      }
      bboxes.push(bbox);
    }

    bboxesRef.current = bboxes;

    // Selection outline + resize handle
    if (selectedElement !== null && bboxes[selectedElement]) {
      const b = bboxes[selectedElement];
      ctx.save();
      ctx.strokeStyle = 'hsl(200 100% 45%)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.setLineDash([]);
      // bottom-right resize handle
      ctx.fillStyle = 'hsl(200 100% 45%)';
      ctx.fillRect(b.x + b.w - HANDLE / 2, b.y + b.h - HANDLE / 2, HANDLE, HANDLE);
      ctx.restore();
    }
  }, [elements, labelWidth, labelHeight, selectedElement, bgColor]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Keyboard movement
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedElement === null) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const step = e.shiftKey ? 10 : 1;
      const el = elements[selectedElement];
      if (!el) return;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeElement(selectedElement);
        return;
      } else return;
      e.preventDefault();
      updateElement(selectedElement, { x: el.x + dx, y: el.y + dy });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedElement, elements]);

  // Canvas mouse — drag to move
  const getCanvasPos = (e: React.MouseEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const sx = c.width / rect.width;
    const sy = c.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const getResizableSize = (el: ZPLElement): { w: number; h: number } | null => {
    if (el.type === 'image' || el.type === 'box' || el.type === 'line') return { w: el.width, h: el.height };
    if (el.type === 'barcode') return { w: 0, h: el.height };
    if (el.type === 'qrcode') return { w: el.size, h: el.size };
    if (el.type === 'text') return { w: 0, h: el.fontSize };
    return null;
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    const bboxes = bboxesRef.current;

    // Resize handle hit-test (only on selected element)
    if (selectedElement !== null && bboxes[selectedElement]) {
      const b = bboxes[selectedElement];
      const hx = b.x + b.w;
      const hy = b.y + b.h;
      if (Math.abs(x - hx) <= HANDLE && Math.abs(y - hy) <= HANDLE) {
        const el = elements[selectedElement];
        resizeRef.current = { index: selectedElement, startW: b.w, startH: b.h, startX: el.x, startY: el.y };
        return;
      }
    }

    let hit = -1;
    for (let i = bboxes.length - 1; i >= 0; i--) {
      const b = bboxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { hit = i; break; }
    }
    if (hit >= 0) {
      setSelectedElement(hit);
      dragRef.current = { index: hit, offsetX: x - elements[hit].x, offsetY: y - elements[hit].y };
    } else {
      setSelectedElement(null);
    }
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    if (resizeRef.current) {
      const r = resizeRef.current;
      const el = elements[r.index];
      if (!el) return;
      const newW = Math.max(8, Math.round(x - r.startX));
      const newH = Math.max(8, Math.round(y - r.startY));
      if (el.type === 'image' || el.type === 'box') {
        updateElement(r.index, { width: newW, height: newH });
      } else if (el.type === 'line') {
        updateElement(r.index, { width: newW, height: Math.max(1, newH) });
      } else if (el.type === 'qrcode') {
        updateElement(r.index, { size: Math.max(2, Math.round(newW / 20)) });
      } else if (el.type === 'barcode') {
        updateElement(r.index, { height: newH });
      } else if (el.type === 'text') {
        updateElement(r.index, { fontSize: Math.max(8, newH) });
      }
      return;
    }
    if (!dragRef.current) return;
    const d = dragRef.current;
    updateElement(d.index, {
      x: Math.max(0, Math.round(x - d.offsetX)),
      y: Math.max(0, Math.round(y - d.offsetY)),
    });
  };

  const onCanvasMouseUp = () => {
    dragRef.current = null;
    resizeRef.current = null;
  };

  const handleImageFile = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((res) => { img.onload = () => res(); });
    const maxW = Math.min(img.naturalWidth, Math.round(labelWidth * 0.6));
    const ratio = maxW / img.naturalWidth;
    const w = Math.max(20, maxW);
    const h = Math.max(20, Math.round(img.naturalHeight * ratio));
    // Build GRF inline so the exported ZPL contains a printable raster.
    // NOTE: Não preenchemos com branco — elementos têm fundo transparente para combinar com qualquer cor de etiqueta.
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d')!;
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(img, 0, 0, w, h);
    const idata = tctx.getImageData(0, 0, w, h);
    const bw = convertToBlackAndWhite(idata, 128);
    const grfName = `IMG${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const grf = convertToGRF(bw, grfName);
    setElements((prev) => {
      const next: ZPLElement[] = [
        ...prev,
        { type: 'image', x: 50, y: 50, width: w, height: h, imageDataUrl: dataUrl, grfData: grf, grfName },
      ];
      setSelectedElement(next.length - 1);
      return next;
    });
  };

  const handleLoadPreset = (p: LabelPreset) => {
    setLabelWidth(p.widthDots);
    setLabelHeight(p.heightDots);
    setDpi(p.dpi);
    setBgColor(p.bgColor);
    setElements(p.elements);
    setSelectedElement(null);
  };

  const handlePickSize = (s: LabelSize) => {
    setLabelWidth(mmToDots(s.widthMm, dpi));
    setLabelHeight(mmToDots(s.heightMm, dpi));
    toast.success(`Tamanho aplicado: ${s.name}`);
  };

  const copyZPL = async () => {
    const code = generateZPL({ width: labelWidth, height: labelHeight, dpi, elements });
    setZplCode(code);
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Código ZPL copiado!');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const sizes = loadSizes();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Tag className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Criador de Etiquetas ZPL</h2>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <select
              onChange={(e) => {
                const s = sizes.find((x) => x.id === e.target.value);
                if (s) handlePickSize(s);
                e.target.value = '';
              }}
              defaultValue=""
              className="px-3 py-2 rounded-lg border border-border bg-white text-black text-sm"
              title="Aplicar tamanho predefinido"
            >
              <option value="" className="bg-white text-black">Tamanhos…</option>
              {sizes.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-black">
                  {s.name}
                </option>
              ))}
            </select>
            <PresetManager
              current={{ widthDots: labelWidth, heightDots: labelHeight, dpi, bgColor, elements }}
              onLoadPreset={handleLoadPreset}
              onPickSize={handlePickSize}
            />
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          Arraste elementos no preview, use as setas do teclado (Shift = 10px) para ajuste fino.
          Delete remove o elemento selecionado. Elementos têm fundo transparente para combinar com qualquer cor de etiqueta.
        </p>


        {/* Label Settings */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Largura: {labelWidth} dots ({dotsToMm(labelWidth)} mm)
            </label>
            <Slider value={[labelWidth]} onValueChange={(v) => setLabelWidth(v[0])} min={100} max={1200} step={8} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Altura: {labelHeight} dots ({dotsToMm(labelHeight)} mm)
            </label>
            <Slider value={[labelHeight]} onValueChange={(v) => setLabelHeight(v[0])} min={100} max={2400} step={8} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">DPI</label>
            <select
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {dpiOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white text-black">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Background color for preview testing */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-muted-foreground">Cor de fundo (preview):</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="h-9 w-14 rounded border border-border cursor-pointer bg-transparent"
            title="Cor de fundo da etiqueta (apenas preview)"
          />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="px-2 py-1 rounded bg-input border border-border text-sm w-28 font-mono"
          />
          <button
            type="button"
            onClick={() => setBgColor('#ffffff')}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Restaurar branco
          </button>
        </div>

        {/* Add Element Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => addElement('text')} className="tool-button flex items-center gap-2">
            <Type size={16} /> Texto
          </button>
          <button onClick={() => addElement('barcode')} className="tool-button flex items-center gap-2">
            <Barcode size={16} /> Código de Barras
          </button>
          <button onClick={() => addElement('qrcode')} className="tool-button flex items-center gap-2">
            <QrCode size={16} /> QR Code
          </button>
          <button onClick={() => addElement('box')} className="tool-button flex items-center gap-2">
            <Square size={16} /> Caixa
          </button>
          <button onClick={() => addElement('line')} className="tool-button flex items-center gap-2">
            <Minus size={16} /> Linha
          </button>
          <button onClick={() => addElement('image')} className="tool-button flex items-center gap-2">
            <ImageIcon size={16} /> Imagem
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageFile(f);
              if (e.target) e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-semibold mb-4">Preview da Etiqueta</h3>
          <div
            className="rounded-lg p-4 flex items-center justify-center overflow-auto"
            style={{ backgroundColor: bgColor }}
          >
            <canvas
              ref={canvasRef}
              width={labelWidth}
              height={labelHeight}
              onMouseDown={onCanvasMouseDown}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
              className="border border-gray-300 shadow-lg cursor-move select-none"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={downloadZPL} className="download-button">
              <FileText size={18} /> Salvar ZPL
            </button>
            <button onClick={downloadPNG} className="tool-button flex items-center gap-2">
              <FileImage size={18} /> Salvar PNG
            </button>
            <button onClick={downloadPDF} className="tool-button flex items-center gap-2">
              <Download size={18} /> Salvar PDF
            </button>
            <button
              onClick={async () => {
                if (!settings.printerEndpoint) {
                  toast.error('Configure a URL do agente Zebra em Configurações.');
                  return;
                }
                try {
                  const zpl = generateZPL({ width: labelWidth, height: labelHeight, dpi, elements });
                  await sendZPLToAgent(zpl, { endpoint: settings.printerEndpoint, printerName: settings.printerName });
                  toast.success('Etiqueta enviada para a impressora Zebra.');
                } catch (e: any) {
                  toast.error(e?.message || 'Falha ao imprimir.');
                }
              }}
              className="tool-button flex items-center gap-2"
            >
              <Printer size={18} /> Imprimir na Zebra
            </button>
          </div>
        </div>

        {/* Elements List & Editor */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-semibold mb-4">Elementos ({elements.length})</h3>

          <div className="space-y-3 max-h-[28rem] overflow-y-auto">
            {elements.map((element, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedElement === index
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/50 hover:border-primary/50'
                }`}
                onClick={() => setSelectedElement(index)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium capitalize flex items-center gap-2">
                    {element.type === 'text' && <Type size={16} />}
                    {element.type === 'barcode' && <Barcode size={16} />}
                    {element.type === 'qrcode' && <QrCode size={16} />}
                    {element.type === 'box' && <Square size={16} />}
                    {element.type === 'line' && <Minus size={16} />}
                    {element.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeElement(index);
                    }}
                    className="p-1 text-destructive hover:bg-destructive/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {selectedElement === index && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-muted-foreground">X</label>
                        <input
                          type="number"
                          value={element.x}
                          onChange={(e) => updateElement(index, { x: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded bg-input border border-border"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground">Y</label>
                        <input
                          type="number"
                          value={element.y}
                          onChange={(e) => updateElement(index, { y: Number(e.target.value) })}
                          className="w-full px-2 py-1 rounded bg-input border border-border"
                        />
                      </div>
                    </div>

                    {element.type === 'text' && (
                      <>
                        <div>
                          <label className="text-muted-foreground">Conteúdo</label>
                          <input
                            type="text"
                            value={element.content}
                            onChange={(e) => updateElement(index, { content: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-input border border-border"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-muted-foreground">Fonte</label>
                            <select
                              value={element.font}
                              onChange={(e) => updateElement(index, { font: e.target.value })}
                              className="w-full px-2 py-1 rounded select-dark border border-border"
                            >
                              {fontOptions.map((f) => (
                                <option key={f.value} value={f.value} className="select-dark">
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-muted-foreground">Tamanho</label>
                            <input
                              type="number"
                              value={element.fontSize}
                              onChange={(e) =>
                                updateElement(index, { fontSize: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 rounded bg-input border border-border"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Fonte de preview (idioma)</label>
                          <select
                            value={element.previewFont ?? 'latin'}
                            onChange={(e) => updateElement(index, { previewFont: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-white text-black border border-border"
                          >
                            {previewFontOptions.map((f) => (
                              <option key={f.value} value={f.value} className="bg-white text-black">
                                {f.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Define a fonte usada apenas no preview (japonês, chinês, árabe, russo, etc.).
                            A impressão Zebra usa a fonte selecionada acima.
                          </p>
                        </div>
                      </>
                    )}

                    {element.type === 'barcode' && (
                      <>
                        <div>
                          <label className="text-muted-foreground">Conteúdo</label>
                          <input
                            type="text"
                            value={element.content}
                            onChange={(e) => updateElement(index, { content: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-input border border-border"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-muted-foreground">Tipo</label>
                            <select
                              value={element.barcodeType}
                              onChange={(e) =>
                                updateElement(index, { barcodeType: e.target.value })
                              }
                              className="w-full px-2 py-1 rounded bg-white text-black border border-border"
                            >
                              {barcodeOptions.map((b) => (
                                <option key={b.value} value={b.value} className="bg-white text-black">
                                  {b.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-muted-foreground">Altura</label>
                            <input
                              type="number"
                              value={element.height}
                              onChange={(e) =>
                                updateElement(index, { height: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 rounded bg-input border border-border"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <label className="text-muted-foreground">Espessura módulo</label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={element.moduleWidth ?? 2}
                              onChange={(e) =>
                                updateElement(index, { moduleWidth: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 rounded bg-input border border-border"
                            />
                          </div>
                          <label className="flex items-center gap-2 mt-5">
                            <input
                              type="checkbox"
                              checked={element.humanReadable ?? true}
                              onChange={(e) =>
                                updateElement(index, { humanReadable: e.target.checked })
                              }
                            />
                            <span className="text-muted-foreground">Mostrar texto</span>
                          </label>
                        </div>
                      </>
                    )}

                    {element.type === 'qrcode' && (
                      <>
                        <div>
                          <label className="text-muted-foreground">Conteúdo</label>
                          <input
                            type="text"
                            value={element.content}
                            onChange={(e) => updateElement(index, { content: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-input border border-border"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-muted-foreground">Tamanho (1-10)</label>
                            <input
                              type="number"
                              value={element.size}
                              min={1}
                              max={10}
                              onChange={(e) =>
                                updateElement(index, { size: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1 rounded bg-input border border-border"
                            />
                          </div>
                          <div>
                            <label className="text-muted-foreground">Correção de erro</label>
                            <select
                              value={element.errorCorrection ?? 'M'}
                              onChange={(e) =>
                                updateElement(index, {
                                  errorCorrection: e.target.value as 'L' | 'M' | 'Q' | 'H',
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-white text-black border border-border"
                            >
                              <option value="L">L (7%)</option>
                              <option value="M">M (15%)</option>
                              <option value="Q">Q (25%)</option>
                              <option value="H">H (30%)</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {(element.type === 'box' || element.type === 'line') && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-muted-foreground">Largura</label>
                          <input
                            type="number"
                            value={element.width}
                            onChange={(e) =>
                              updateElement(index, { width: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1 rounded bg-input border border-border"
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground">Altura</label>
                          <input
                            type="number"
                            value={element.height}
                            onChange={(e) =>
                              updateElement(index, { height: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1 rounded bg-input border border-border"
                          />
                        </div>
                      </div>
                    )}

                    {element.type === 'box' && (
                      <div>
                        <label className="text-muted-foreground">Espessura da Borda</label>
                        <input
                          type="number"
                          value={element.borderWidth}
                          onChange={(e) =>
                            updateElement(index, { borderWidth: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1 rounded bg-input border border-border"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {elements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Tag size={48} className="mx-auto mb-3 opacity-50" />
                <p>Nenhum elemento adicionado</p>
                <p className="text-sm">Use os botões acima para adicionar elementos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ZPL Code Preview */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Código ZPL</h3>
          <button onClick={generateCode} className="tool-button">
            Gerar Código
          </button>
        </div>
        <pre className="bg-muted rounded-lg p-4 overflow-auto max-h-64 font-mono text-sm">
          {zplCode || generateZPL({ width: labelWidth, height: labelHeight, dpi, elements })}
        </pre>
      </div>
    </div>
  );
};
