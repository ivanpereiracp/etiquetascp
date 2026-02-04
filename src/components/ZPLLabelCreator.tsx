import { useState, useRef, useCallback } from 'react';
import { Download, Plus, Trash2, Tag, Type, Barcode, QrCode, Square, Minus, Image as ImageIcon, FileText, FileImage } from 'lucide-react';
import { generateZPL, ZPLElement, fontOptions, barcodeOptions, dpiOptions } from '@/utils/zplGenerator';
import { downloadFile } from '@/utils/imageProcessing';
import { Slider } from '@/components/ui/slider';

export const ZPLLabelCreator = () => {
  const [labelWidth, setLabelWidth] = useState(400);
  const [labelHeight, setLabelHeight] = useState(300);
  const [dpi, setDpi] = useState(203);
  const [elements, setElements] = useState<ZPLElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [zplCode, setZplCode] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addElement = (type: ZPLElement['type']) => {
    let newElement: ZPLElement;
    
    switch (type) {
      case 'text':
        newElement = { type: 'text', x: 50, y: 50, font: '0', fontSize: 30, content: 'Texto' };
        break;
      case 'barcode':
        newElement = { type: 'barcode', x: 50, y: 100, barcodeType: 'C', height: 80, content: '1234567890' };
        break;
      case 'qrcode':
        newElement = { type: 'qrcode', x: 50, y: 100, size: 5, content: 'https://example.com' };
        break;
      case 'line':
        newElement = { type: 'line', x: 50, y: 50, width: 200, height: 2 };
        break;
      case 'box':
        newElement = { type: 'box', x: 50, y: 50, width: 150, height: 100, borderWidth: 2 };
        break;
      default:
        return;
    }
    
    setElements([...elements, newElement]);
    setSelectedElement(elements.length);
  };

  const updateElement = (index: number, updates: Partial<ZPLElement>) => {
    const newElements = [...elements];
    newElements[index] = { ...newElements[index], ...updates } as ZPLElement;
    setElements(newElements);
  };

  const removeElement = (index: number) => {
    setElements(elements.filter((_, i) => i !== index));
    setSelectedElement(null);
  };

  const generateCode = useCallback(() => {
    const zpl = generateZPL({
      width: labelWidth,
      height: labelHeight,
      dpi,
      elements
    });
    setZplCode(zpl);
  }, [labelWidth, labelHeight, dpi, elements]);

  const downloadZPL = () => {
    generateCode();
    if (zplCode) {
      downloadFile(zplCode, 'etiqueta.zpl', 'text/plain');
    } else {
      const code = generateZPL({ width: labelWidth, height: labelHeight, dpi, elements });
      downloadFile(code, 'etiqueta.zpl', 'text/plain');
    }
  };

  const downloadPNG = async () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'etiqueta.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const downloadPDF = async () => {
    // Create a simple PDF with the canvas image
    if (canvasRef.current) {
      const imgData = canvasRef.current.toDataURL('image/png');
      
      // Create a basic PDF structure
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${labelWidth} ${labelHeight}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
q ${labelWidth} 0 0 ${labelHeight} 0 0 cm /Im0 Do Q
endstream
endobj
5 0 obj
<< /Type /XObject /Subtype /Image /Width ${labelWidth} /Height ${labelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 0 >>
stream
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;
      
      // For a proper PDF, we'd use a library like jsPDF
      // This is a simplified approach - download the image instead
      const link = document.createElement('a');
      link.download = 'etiqueta.pdf';
      
      // Convert canvas to PDF-compatible format
      const canvas = canvasRef.current;
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a simple HTML to PDF approach
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head><title>Etiqueta ZPL</title></head>
                <body style="margin:0;padding:20px;">
                  <img src="${imgData}" style="max-width:100%;" />
                  <script>window.onload = function() { window.print(); }</script>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        }
      }, 'image/png');
    }
  };

  // Draw preview
  const drawPreview = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear and set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, labelWidth, labelHeight);
    
    // Draw elements
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    
    for (const element of elements) {
      switch (element.type) {
        case 'text':
          ctx.font = `${element.fontSize}px Arial`;
          ctx.fillText(element.content, element.x, element.y + element.fontSize);
          break;
          
        case 'barcode':
          // Draw simple barcode representation
          ctx.fillRect(element.x, element.y, 2, element.height);
          for (let i = 0; i < element.content.length * 3; i++) {
            if (i % 2 === 0) {
              ctx.fillRect(element.x + i * 3, element.y, 2, element.height);
            }
          }
          ctx.font = '12px Arial';
          ctx.fillText(element.content, element.x, element.y + element.height + 15);
          break;
          
        case 'qrcode':
          // Draw QR code placeholder
          const qrSize = element.size * 20;
          ctx.strokeRect(element.x, element.y, qrSize, qrSize);
          ctx.font = '10px Arial';
          ctx.fillText('QR', element.x + qrSize/2 - 8, element.y + qrSize/2 + 4);
          break;
          
        case 'line':
          ctx.fillRect(element.x, element.y, element.width, element.height);
          break;
          
        case 'box':
          ctx.lineWidth = element.borderWidth;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
          break;
      }
    }
  }, [elements, labelWidth, labelHeight]);

  // Redraw when elements change
  useState(() => {
    drawPreview();
  });

  // Update preview when elements change
  if (canvasRef.current) {
    drawPreview();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Tag className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Criador de Etiquetas ZPL</h2>
        </div>
        
        <p className="text-muted-foreground text-sm mb-6">
          Crie etiquetas com código ZPL para impressoras Zebra. Adicione textos, códigos de barras, QR codes e mais.
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
              max={600}
              step={10}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">DPI</label>
            <select
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-border 
                         bg-white text-black font-medium
                         focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {dpiOptions.map(opt => (
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
              className="border border-gray-300 shadow-lg"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={downloadZPL} className="download-button">
              <FileText size={18} />
              Salvar ZPL
            </button>
            <button onClick={downloadPNG} className="tool-button flex items-center gap-2">
              <FileImage size={18} />
              Salvar PNG
            </button>
            <button onClick={downloadPDF} className="tool-button flex items-center gap-2">
              <Download size={18} />
              Salvar PDF
            </button>
          </div>
        </div>

        {/* Elements List & Editor */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="font-semibold mb-4">Elementos ({elements.length})</h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {elements.map((element, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border cursor-pointer transition-all
                           ${selectedElement === index 
                             ? 'border-primary bg-primary/10' 
                             : 'border-border bg-muted/50 hover:border-primary/50'}`}
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
                    onClick={(e) => { e.stopPropagation(); removeElement(index); }}
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
                              {fontOptions.map(f => (
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
                              onChange={(e) => updateElement(index, { fontSize: Number(e.target.value) })}
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
                              onChange={(e) => updateElement(index, { barcodeType: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-white text-black border border-border"
                            >
                              {barcodeOptions.map(b => (
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
                              onChange={(e) => updateElement(index, { height: Number(e.target.value) })}
                              className="w-full px-2 py-1 rounded bg-input border border-border"
                            />
                          </div>
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
                        <div>
                          <label className="text-muted-foreground">Tamanho (1-10)</label>
                          <input
                            type="number"
                            value={element.size}
                            min={1}
                            max={10}
                            onChange={(e) => updateElement(index, { size: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded bg-input border border-border"
                          />
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
                            onChange={(e) => updateElement(index, { width: Number(e.target.value) })}
                            className="w-full px-2 py-1 rounded bg-input border border-border"
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground">Altura</label>
                          <input
                            type="number"
                            value={element.height}
                            onChange={(e) => updateElement(index, { height: Number(e.target.value) })}
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
                          onChange={(e) => updateElement(index, { borderWidth: Number(e.target.value) })}
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
