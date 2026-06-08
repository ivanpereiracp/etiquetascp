export interface ZPLLabel {
  width: number;
  height: number;
  dpi: number;
  elements: ZPLElement[];
}

export type ZPLElement =
  | { type: 'text'; x: number; y: number; font: string; fontSize: number; content: string; previewFont?: string }
  | {
      type: 'barcode';
      x: number;
      y: number;
      barcodeType: string;
      height: number;
      content: string;
      humanReadable?: boolean;
      moduleWidth?: number;
    }
  | { type: 'qrcode'; x: number; y: number; size: number; content: string; errorCorrection?: 'L' | 'M' | 'Q' | 'H' }
  | { type: 'line'; x: number; y: number; width: number; height: number }
  | { type: 'box'; x: number; y: number; width: number; height: number; borderWidth: number }
  | {
      type: 'image';
      x: number;
      y: number;
      width: number;
      height: number;
      imageDataUrl: string; // PNG dataURL for canvas preview
      grfData?: string;     // optional precomputed ~DG GRF + ^XG reference
      grfName?: string;
    };

const barcodeBlock = (
  barcodeType: string,
  height: number,
  content: string,
  humanReadable: boolean,
): string => {
  const HR = humanReadable ? 'Y' : 'N';
  switch (barcodeType) {
    case 'C': // Code 128
      return `^BCN,${height},${HR},N,N\n^FD${content}^FS\n`;
    case '3': // Code 39
      return `^B3N,N,${height},${HR},N\n^FD${content}^FS\n`;
    case 'E': // EAN-13
      return `^BEN,${height},${HR},N\n^FD${content}^FS\n`;
    case 'U': // UPC-A
      return `^BUN,${height},${HR},N,N\n^FD${content}^FS\n`;
    case '2': // Interleaved 2 of 5
      return `^B2N,${height},${HR},N,N\n^FD${content}^FS\n`;
    case 'X': // Data Matrix
      return `^BXN,${Math.max(2, Math.round(height / 20))},200\n^FD${content}^FS\n`;
    default:
      return `^BCN,${height},${HR},N,N\n^FD${content}^FS\n`;
  }
};

export const generateZPL = (label: ZPLLabel): string => {
  let zpl = '^XA\n';
  zpl += `^PW${label.width}\n`;
  zpl += `^LL${label.height}\n`;

  for (const element of label.elements) {
    switch (element.type) {
      case 'text':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^A${element.font},${element.fontSize}\n`;
        zpl += `^FD${element.content}^FS\n`;
        break;

      case 'barcode':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^BY${element.moduleWidth ?? 2}\n`;
        zpl += barcodeBlock(
          element.barcodeType,
          element.height,
          element.content,
          element.humanReadable ?? true,
        );
        break;

      case 'qrcode':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^BQN,2,${element.size},${element.errorCorrection ?? 'M'},7\n`;
        zpl += `^FDQA,${element.content}^FS\n`;
        break;

      case 'line':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^GB${element.width},${element.height},${Math.min(element.width, element.height)}^FS\n`;
        break;

      case 'box':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^GB${element.width},${element.height},${element.borderWidth}^FS\n`;
        break;

      case 'image':
        zpl += `^FO${element.x},${element.y}\n`;
        if (element.grfData) {
          zpl += element.grfData + '\n';
          if (element.grfName) zpl += `^XG${element.grfName},1,1^FS\n`;
        }
        break;
    }
  }

  zpl += '^XZ\n';
  return zpl;
};

// jsbarcode format mapping for visual rendering
export const barcodeTypeToJsbarcode = (code: string): string => {
  switch (code) {
    case 'C':
      return 'CODE128';
    case '3':
      return 'CODE39';
    case 'E':
      return 'EAN13';
    case 'U':
      return 'UPC';
    case '2':
      return 'ITF';
    default:
      return 'CODE128';
  }
};

export const fontOptions = [
  { value: '0', label: 'Font A (9x5)' },
  { value: 'A', label: 'Font A Scalable' },
  { value: 'B', label: 'Font B (11x7)' },
  { value: 'C', label: 'Font C (18x10)' },
  { value: 'D', label: 'Font D (18x10)' },
  { value: 'E', label: 'Font E (28x15)' },
  { value: 'F', label: 'Font F (26x13)' },
  { value: 'G', label: 'Font G (60x40)' },
  { value: 'H', label: 'Font H (21x13)' },
];

// Web preview fonts for multi-language text rendering on the canvas.
// These are only used for preview — the ZPL output still uses the printer font selected above.
export const previewFontOptions = [
  { value: 'latin', label: 'Latino (padrão)', css: '"Noto Sans", Arial, sans-serif' },
  { value: 'jp', label: 'Japonês (日本語)', css: '"Noto Sans JP", "Noto Sans", sans-serif' },
  { value: 'sc', label: 'Chinês Simplificado (简体)', css: '"Noto Sans SC", "Noto Sans", sans-serif' },
  { value: 'tc', label: 'Chinês Tradicional (繁體)', css: '"Noto Sans TC", "Noto Sans", sans-serif' },
  { value: 'ar', label: 'Árabe (العربية)', css: '"Noto Sans Arabic", "Noto Naskh Arabic", sans-serif' },
  { value: 'ru', label: 'Russo / Cirílico (Русский)', css: '"Noto Sans", Arial, sans-serif' },
];

export const getPreviewFontCss = (value?: string): string => {
  const f = previewFontOptions.find((p) => p.value === value);
  return f ? f.css : 'Arial, sans-serif';
};

export const barcodeOptions = [
  { value: 'C', label: 'Code 128' },
  { value: '3', label: 'Code 39' },
  { value: 'E', label: 'EAN-13' },
  { value: 'U', label: 'UPC-A' },
  { value: '2', label: 'Interleaved 2 of 5' },
  { value: 'X', label: 'Data Matrix' },
];

export const dpiOptions = [
  { value: 152, label: '152 DPI (6 dots/mm)' },
  { value: 203, label: '203 DPI (8 dots/mm)' },
  { value: 300, label: '300 DPI (12 dots/mm)' },
  { value: 600, label: '600 DPI (24 dots/mm)' },
];

// Standalone ZPL for a single barcode (used by Barcode Generator tab)
export const generateBarcodeZPL = (params: {
  barcodeType: string;
  content: string;
  height: number;
  humanReadable: boolean;
  moduleWidth?: number;
  labelWidth?: number;
  labelHeight?: number;
}) => {
  return generateZPL({
    width: params.labelWidth ?? 400,
    height: params.labelHeight ?? 200,
    dpi: 203,
    elements: [
      {
        type: 'barcode',
        x: 30,
        y: 30,
        barcodeType: params.barcodeType,
        height: params.height,
        content: params.content,
        humanReadable: params.humanReadable,
        moduleWidth: params.moduleWidth ?? 2,
      },
    ],
  });
};

export const generateQRCodeZPL = (params: {
  content: string;
  size: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  labelWidth?: number;
  labelHeight?: number;
}) => {
  return generateZPL({
    width: params.labelWidth ?? 300,
    height: params.labelHeight ?? 300,
    dpi: 203,
    elements: [
      {
        type: 'qrcode',
        x: 30,
        y: 30,
        size: params.size,
        content: params.content,
        errorCorrection: params.errorCorrection ?? 'M',
      },
    ],
  });
};
