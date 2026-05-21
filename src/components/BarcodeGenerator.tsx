import { useEffect, useRef, useState } from 'react';
import { Barcode as BarcodeIcon, Download, FileImage, FileText } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  barcodeOptions,
  barcodeTypeToJsbarcode,
  generateBarcodeZPL,
  generateQRCodeZPL,
} from '@/utils/zplGenerator';
import { downloadFile } from '@/utils/imageProcessing';

type Mode = 'barcode' | 'qrcode';

export const BarcodeGenerator = () => {
  const [mode, setMode] = useState<Mode>('barcode');
  const [content, setContent] = useState('1234567890');
  const [barcodeType, setBarcodeType] = useState('C');
  const [height, setHeight] = useState(100);
  const [moduleWidth, setModuleWidth] = useState(2);
  const [humanReadable, setHumanReadable] = useState(true);
  const [qrSize, setQrSize] = useState(8);
  const [qrEC, setQrEC] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setError(null);
    if (mode === 'barcode') {
      try {
        if (canvasRef.current) {
          JsBarcode(canvasRef.current, content || ' ', {
            format: barcodeTypeToJsbarcode(barcodeType),
            height,
            displayValue: humanReadable,
            width: moduleWidth,
            margin: 10,
            background: '#ffffff',
            lineColor: '#000000',
          });
        }
        if (svgRef.current) {
          JsBarcode(svgRef.current, content || ' ', {
            format: barcodeTypeToJsbarcode(barcodeType),
            height,
            displayValue: humanReadable,
            width: moduleWidth,
            margin: 10,
            background: '#ffffff',
            lineColor: '#000000',
          });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erro ao gerar código de barras');
      }
    } else {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, content || ' ', {
          width: qrSize * 30,
          margin: 2,
          errorCorrectionLevel: qrEC,
        }).catch((e) => setError(e.message));
      }
      if (svgRef.current) {
        QRCode.toString(content || ' ', {
          type: 'svg',
          width: qrSize * 30,
          margin: 2,
          errorCorrectionLevel: qrEC,
        })
          .then((svgStr) => {
            if (svgRef.current) svgRef.current.outerHTML = svgStr;
          })
          .catch(() => {});
      }
    }
  }, [mode, content, barcodeType, height, moduleWidth, humanReadable, qrSize, qrEC]);

  const downloadPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${mode}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const downloadSVG = async () => {
    let svg = '';
    if (mode === 'barcode') {
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      try {
        JsBarcode(tmp, content || ' ', {
          format: barcodeTypeToJsbarcode(barcodeType),
          height,
          displayValue: humanReadable,
          width: moduleWidth,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
        });
        svg = new XMLSerializer().serializeToString(tmp);
      } catch {
        return;
      }
    } else {
      svg = await QRCode.toString(content || ' ', {
        type: 'svg',
        width: qrSize * 30,
        margin: 2,
        errorCorrectionLevel: qrEC,
      });
    }
    downloadFile(svg, `${mode}.svg`, 'image/svg+xml');
  };

  const downloadZPL = () => {
    const zpl =
      mode === 'barcode'
        ? generateBarcodeZPL({ barcodeType, content, height, humanReadable, moduleWidth })
        : generateQRCodeZPL({ content, size: qrSize, errorCorrection: qrEC });
    downloadFile(zpl, `${mode}.zpl`, 'text/plain');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarcodeIcon className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">Gerador de Códigos de Barras / QR</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Gere códigos avulsos para download em PNG, SVG ou ZPL.
        </p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('barcode')}
            className={`tool-button ${mode === 'barcode' ? 'ring-2 ring-primary' : ''}`}
          >
            Código de Barras
          </button>
          <button
            onClick={() => setMode('qrcode')}
            className={`tool-button ${mode === 'qrcode' ? 'ring-2 ring-primary' : ''}`}
          >
            QR Code
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Conteúdo</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded bg-input border border-border"
            />
          </div>

          {mode === 'barcode' ? (
            <>
              <div>
                <label className="text-sm text-muted-foreground">Tipo</label>
                <select
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-white text-black border border-border"
                >
                  {barcodeOptions
                    .filter((b) => b.value !== 'X')
                    .map((b) => (
                      <option key={b.value} value={b.value} className="bg-white text-black">
                        {b.label}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Altura: {height}</label>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Espessura módulo: {moduleWidth}</label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={moduleWidth}
                  onChange={(e) => setModuleWidth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={humanReadable}
                  onChange={(e) => setHumanReadable(e.target.checked)}
                />
                <span className="text-sm">Mostrar texto legível</span>
              </label>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-muted-foreground">Tamanho: {qrSize}</label>
                <input
                  type="range"
                  min={2}
                  max={15}
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Correção de erro</label>
                <select
                  value={qrEC}
                  onChange={(e) => setQrEC(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                  className="w-full px-3 py-2 rounded bg-white text-black border border-border"
                >
                  <option value="L">L (7%)</option>
                  <option value="M">M (15%)</option>
                  <option value="Q">Q (25%)</option>
                  <option value="H">H (30%)</option>
                </select>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
      </div>

      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-semibold mb-4">Preview</h3>
        <div className="bg-white rounded-lg p-6 flex items-center justify-center overflow-auto">
          <canvas ref={canvasRef} className="max-w-full" />
          <svg ref={svgRef} className="hidden" />
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={downloadPNG} className="download-button">
            <FileImage size={18} /> Salvar PNG
          </button>
          <button onClick={downloadSVG} className="tool-button flex items-center gap-2">
            <Download size={18} /> Salvar SVG
          </button>
          <button onClick={downloadZPL} className="tool-button flex items-center gap-2">
            <FileText size={18} /> Salvar ZPL
          </button>
        </div>
      </div>
    </div>
  );
};
