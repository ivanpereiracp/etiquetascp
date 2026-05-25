import { useEffect, useMemo, useRef, useState } from 'react';
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
type QRMode = 'text' | 'url' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard' | 'geo';

const SAMPLES: Record<string, string> = {
  C: '1234567890',
  '3': 'CODE39',
  E: '590123412345',  // 12 digits (jsbarcode appends checksum -> 13)
  U: '01234567890',   // 11 digits (jsbarcode appends checksum -> 12)
  '2': '12345678',
  X: 'DATAMATRIX',
};

// Validate barcode content for symbologies with strict length/charset rules.
const validateBarcode = (type: string, content: string): string | null => {
  const c = content.trim();
  if (!c) return 'Conteúdo vazio.';
  if (type === 'E') {
    if (!/^\d{12,13}$/.test(c)) return 'EAN-13 exige 12 ou 13 dígitos numéricos.';
  } else if (type === 'U') {
    if (!/^\d{11,12}$/.test(c)) return 'UPC-A exige 11 ou 12 dígitos numéricos.';
  } else if (type === '2') {
    if (!/^\d+$/.test(c)) return 'Interleaved 2 of 5 aceita apenas dígitos.';
    if (c.length % 2 !== 0) return 'Interleaved 2 of 5 exige número par de dígitos.';
  } else if (type === '3') {
    if (!/^[A-Z0-9\-. $/+%]+$/.test(c)) return 'Code 39 aceita A-Z, 0-9 e - . $ / + %';
  }
  return null;
};

const buildQRContent = (mode: QRMode, fields: Record<string, string>): string => {
  switch (mode) {
    case 'url':   return fields.url || '';
    case 'email': return `mailto:${fields.email || ''}${fields.subject ? `?subject=${encodeURIComponent(fields.subject)}` : ''}`;
    case 'phone': return `tel:${fields.phone || ''}`;
    case 'sms':   return `SMSTO:${fields.phone || ''}:${fields.message || ''}`;
    case 'wifi':  return `WIFI:T:${fields.encryption || 'WPA'};S:${fields.ssid || ''};P:${fields.password || ''};;`;
    case 'geo':   return `geo:${fields.lat || '0'},${fields.lng || '0'}`;
    case 'vcard':
      return [
        'BEGIN:VCARD', 'VERSION:3.0',
        `FN:${fields.name || ''}`,
        fields.org ? `ORG:${fields.org}` : '',
        fields.phone ? `TEL:${fields.phone}` : '',
        fields.email ? `EMAIL:${fields.email}` : '',
        fields.url ? `URL:${fields.url}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\n');
    default: return fields.text || '';
  }
};

export const BarcodeGenerator = () => {
  const [mode, setMode] = useState<Mode>('barcode');
  const [content, setContent] = useState('1234567890');
  const [barcodeType, setBarcodeType] = useState('C');
  const [height, setHeight] = useState(100);
  const [moduleWidth, setModuleWidth] = useState(2);
  const [humanReadable, setHumanReadable] = useState(true);

  // QR state
  const [qrSize, setQrSize] = useState(8);
  const [qrEC, setQrEC] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [qrMargin, setQrMargin] = useState(2);
  const [qrFg, setQrFg] = useState('#000000');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [qrMode, setQrMode] = useState<QRMode>('text');
  const [qrFields, setQrFields] = useState<Record<string, string>>({ text: 'https://example.com' });

  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const qrPayload = useMemo(() => buildQRContent(qrMode, qrFields), [qrMode, qrFields]);

  useEffect(() => {
    setError(null);
    if (mode === 'barcode') {
      const err = validateBarcode(barcodeType, content);
      if (err) { setError(err); return; }
      try {
        if (canvasRef.current) {
          JsBarcode(canvasRef.current, content, {
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
        QRCode.toCanvas(canvasRef.current, qrPayload || ' ', {
          width: qrSize * 30,
          margin: qrMargin,
          errorCorrectionLevel: qrEC,
          color: { dark: qrFg, light: qrBg },
        }).catch((e) => setError(e.message));
      }
    }
  }, [mode, content, barcodeType, height, moduleWidth, humanReadable, qrSize, qrEC, qrMargin, qrFg, qrBg, qrPayload]);

  // Update sample when barcode type changes
  const onBarcodeTypeChange = (t: string) => {
    setBarcodeType(t);
    if (SAMPLES[t]) setContent(SAMPLES[t]);
  };

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
          height, displayValue: humanReadable, width: moduleWidth, margin: 10,
          background: '#ffffff', lineColor: '#000000',
        });
        svg = new XMLSerializer().serializeToString(tmp);
      } catch { return; }
    } else {
      svg = await QRCode.toString(qrPayload || ' ', {
        type: 'svg', width: qrSize * 30, margin: qrMargin,
        errorCorrectionLevel: qrEC, color: { dark: qrFg, light: qrBg },
      });
    }
    downloadFile(svg, `${mode}.svg`, 'image/svg+xml');
  };

  const downloadZPL = () => {
    const zpl = mode === 'barcode'
      ? generateBarcodeZPL({ barcodeType, content, height, humanReadable, moduleWidth })
      : generateQRCodeZPL({ content: qrPayload, size: qrSize, errorCorrection: qrEC });
    downloadFile(zpl, `${mode}.zpl`, 'text/plain');
  };

  const setQrField = (k: string, v: string) => setQrFields((p) => ({ ...p, [k]: v }));

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
          <button onClick={() => setMode('barcode')}
            className={`tool-button ${mode === 'barcode' ? 'ring-2 ring-primary' : ''}`}>
            Código de Barras
          </button>
          <button onClick={() => setMode('qrcode')}
            className={`tool-button ${mode === 'qrcode' ? 'ring-2 ring-primary' : ''}`}>
            QR Code
          </button>
        </div>

        {mode === 'barcode' ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Conteúdo</label>
              <input type="text" value={content} onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 rounded bg-input border border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tipo</label>
              <select value={barcodeType} onChange={(e) => onBarcodeTypeChange(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white text-black border border-border">
                {barcodeOptions.filter((b) => b.value !== 'X').map((b) => (
                  <option key={b.value} value={b.value} className="bg-white text-black">{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Altura: {height}</label>
              <input type="range" min={20} max={300} value={height}
                onChange={(e) => setHeight(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Espessura módulo: {moduleWidth}</label>
              <input type="range" min={1} max={6} value={moduleWidth}
                onChange={(e) => setModuleWidth(Number(e.target.value))} className="w-full" />
            </div>
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={humanReadable} onChange={(e) => setHumanReadable(e.target.checked)} />
              <span className="text-sm">Mostrar texto legível</span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Tipo de conteúdo</label>
                <select value={qrMode} onChange={(e) => setQrMode(e.target.value as QRMode)}
                  className="w-full px-3 py-2 rounded bg-white text-black border border-border">
                  <option value="text">Texto livre</option>
                  <option value="url">URL / Link</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="sms">SMS</option>
                  <option value="wifi">Wi-Fi</option>
                  <option value="vcard">vCard (contato)</option>
                  <option value="geo">Localização (geo)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Tamanho: {qrSize}</label>
                <input type="range" min={2} max={20} value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Margem: {qrMargin}</label>
                <input type="range" min={0} max={10} value={qrMargin}
                  onChange={(e) => setQrMargin(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Correção de erro</label>
                <select value={qrEC} onChange={(e) => setQrEC(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                  className="w-full px-3 py-2 rounded bg-white text-black border border-border">
                  <option value="L">L (7%)</option>
                  <option value="M">M (15%)</option>
                  <option value="Q">Q (25%)</option>
                  <option value="H">H (30%)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Cor do código</label>
                <input type="color" value={qrFg} onChange={(e) => setQrFg(e.target.value)}
                  className="w-full h-10 rounded border border-border bg-transparent" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Cor de fundo</label>
                <input type="color" value={qrBg} onChange={(e) => setQrBg(e.target.value)}
                  className="w-full h-10 rounded border border-border bg-transparent" />
              </div>
            </div>

            {/* Mode-specific fields */}
            <div className="grid md:grid-cols-2 gap-3">
              {qrMode === 'text' && (
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Texto</label>
                  <input value={qrFields.text || ''} onChange={(e) => setQrField('text', e.target.value)}
                    className="w-full px-3 py-2 rounded bg-input border border-border" />
                </div>
              )}
              {qrMode === 'url' && (
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">URL</label>
                  <input value={qrFields.url || ''} onChange={(e) => setQrField('url', e.target.value)}
                    placeholder="https://..." className="w-full px-3 py-2 rounded bg-input border border-border" />
                </div>
              )}
              {qrMode === 'email' && (
                <>
                  <div><label className="text-sm text-muted-foreground">E-mail</label>
                    <input value={qrFields.email || ''} onChange={(e) => setQrField('email', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div><label className="text-sm text-muted-foreground">Assunto</label>
                    <input value={qrFields.subject || ''} onChange={(e) => setQrField('subject', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                </>
              )}
              {(qrMode === 'phone' || qrMode === 'sms') && (
                <>
                  <div><label className="text-sm text-muted-foreground">Telefone</label>
                    <input value={qrFields.phone || ''} onChange={(e) => setQrField('phone', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  {qrMode === 'sms' && (
                    <div><label className="text-sm text-muted-foreground">Mensagem</label>
                      <input value={qrFields.message || ''} onChange={(e) => setQrField('message', e.target.value)}
                        className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  )}
                </>
              )}
              {qrMode === 'wifi' && (
                <>
                  <div><label className="text-sm text-muted-foreground">SSID</label>
                    <input value={qrFields.ssid || ''} onChange={(e) => setQrField('ssid', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div><label className="text-sm text-muted-foreground">Senha</label>
                    <input value={qrFields.password || ''} onChange={(e) => setQrField('password', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div><label className="text-sm text-muted-foreground">Criptografia</label>
                    <select value={qrFields.encryption || 'WPA'} onChange={(e) => setQrField('encryption', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-white text-black border border-border">
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Sem senha</option>
                    </select></div>
                </>
              )}
              {qrMode === 'vcard' && (
                <>
                  <div><label className="text-sm text-muted-foreground">Nome</label>
                    <input value={qrFields.name || ''} onChange={(e) => setQrField('name', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div><label className="text-sm text-muted-foreground">Empresa</label>
                    <input value={qrFields.org || ''} onChange={(e) => setQrField('org', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div><label className="text-sm text-muted-foreground">Telefone</label>
                    <input value={qrFields.phone || ''} onChange={(e) => setQrField('phone', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div><label className="text-sm text-muted-foreground">E-mail</label>
                    <input value={qrFields.email || ''} onChange={(e) => setQrField('email', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div className="md:col-span-2"><label className="text-sm text-muted-foreground">Website</label>
                    <input value={qrFields.url || ''} onChange={(e) => setQrField('url', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                </>
              )}
              {qrMode === 'geo' && (
                <>
                  <div><label className="text-sm text-muted-foreground">Latitude</label>
                    <input value={qrFields.lat || ''} onChange={(e) => setQrField('lat', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                  <div><label className="text-sm text-muted-foreground">Longitude</label>
                    <input value={qrFields.lng || ''} onChange={(e) => setQrField('lng', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-input border border-border" /></div>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground break-all">
              <span className="opacity-70">Payload:</span> <code>{qrPayload}</code>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
      </div>

      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-semibold mb-4">Preview</h3>
        <div className="bg-white rounded-lg p-6 flex items-center justify-center overflow-auto">
          <canvas ref={canvasRef} className="max-w-full" />
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
