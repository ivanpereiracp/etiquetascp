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
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  generateZPL,
  ZPLElement,
  fontOptions,
  barcodeOptions,
  dpiOptions,
  barcodeTypeToJsbarcode,
} from '@/utils/zplGenerator';
import { downloadFile, convertToBlackAndWhite, convertToGRF } from '@/utils/imageProcessing';
import { Slider } from '@/components/ui/slider';
import { DOTS_PER_MM } from '@/utils/units';

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
    });
    return c;
  } catch {
    return null;
  }
};

export const ZPLLabelCreator = () => {
  const { t } = useTranslation();
  const [labelWidth, setLabelWidth] = useState(400);
  const [labelHeight, setLabelHeight] = useState(300);
  const [dpi, setDpi] = useState(203);
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
        if (Array.isArray(s.elements)) setElements(s.elements);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('zit_zpl_state_v1', JSON.stringify({ labelWidth, labelHeight, dpi, elements }));
  }, [labelWidth, labelHeight, dpi, elements]);


  const addElement = (type: ZPLElement['type']) => {
    let newElement: ZPLElement;
    switch (type) {
      case 'text':
        newElement = { type: 'text', x: 50, y: 50, font: '0', fontSize: 30, content: 'Texto' };
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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, labelWidth, labelHeight);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    const bboxes: { x: number; y: number; w: number; h: number }[] = [];

    for (const element of elements) {
      let bbox = { x: element.x, y: element.y, w: 20, h: 20 };
      switch (element.type) {
        case 'text': {
          ctx.font = `${element.fontSize}px Arial`;
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
      }
      bboxes.push(bbox);
    }

    bboxesRef.current = bboxes;

    // Selection outline
    if (selectedElement !== null && bboxes[selectedElement]) {
      const b = bboxes[selectedElement];
      ctx.save();
      ctx.strokeStyle = 'hsl(200 100% 45%)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.restore();
    }
  }, [elements, labelWidth, labelHeight, selectedElement]);

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

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    const bboxes = bboxesRef.current;
    let hit = -1;
    for (let i = bboxes.length - 1; i >= 0; i--) {
      const b = bboxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        hit = i;
        break;
      }
    }
    if (hit >= 0) {
      setSelectedElement(hit);
      dragRef.current = {
        index: hit,
        offsetX: x - elements[hit].x,
        offsetY: y - elements[hit].y,
      };
    } else {
      setSelectedElement(null);
    }
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const { x, y } = getCanvasPos(e);
    const d = dragRef.current;
    updateElement(d.index, {
      x: Math.max(0, Math.round(x - d.offsetX)),
      y: Math.max(0, Math.round(y - d.offsetY)),
    });
  };

  const onCanvasMouseUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Tag className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Criador de Etiquetas ZPL</h2>
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          Arraste elementos no preview, use as setas do teclado (Shift = 10px) para ajuste fino.
          Delete remove o elemento selecionado.
        </p>

        {/* Label Settings */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Largura (dots): {labelWidth}</label>
            <Slider
              value={[labelWidth]}
              onValueChange={(v) => setLabelWidth(v[0])}
              min={100}
              max={800}
              step={10}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Altura (dots): {labelHeight}</label>
            <Slider
              value={[labelHeight]}
              onValueChange={(v) => setLabelHeight(v[0])}
              min={100}
              max={1700}
              step={10}
            />
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
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-semibold mb-4">Preview da Etiqueta</h3>
          <div className="bg-white rounded-lg p-4 flex items-center justify-center overflow-auto">
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
