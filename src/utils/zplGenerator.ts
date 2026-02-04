export interface ZPLLabel {
  width: number;
  height: number;
  dpi: number;
  elements: ZPLElement[];
}

export type ZPLElement = 
  | { type: 'text'; x: number; y: number; font: string; fontSize: number; content: string }
  | { type: 'barcode'; x: number; y: number; barcodeType: string; height: number; content: string }
  | { type: 'qrcode'; x: number; y: number; size: number; content: string }
  | { type: 'line'; x: number; y: number; width: number; height: number }
  | { type: 'box'; x: number; y: number; width: number; height: number; borderWidth: number }
  | { type: 'image'; x: number; y: number; imageData: string };

export const generateZPL = (label: ZPLLabel): string => {
  let zpl = '^XA\n'; // Start label
  
  // Set label dimensions
  zpl += `^PW${label.width}\n`; // Print width
  zpl += `^LL${label.height}\n`; // Label length
  
  // Process each element
  for (const element of label.elements) {
    switch (element.type) {
      case 'text':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^A${element.font},${element.fontSize}\n`;
        zpl += `^FD${element.content}^FS\n`;
        break;
        
      case 'barcode':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^BY2\n`; // Bar code defaults
        zpl += `^B${element.barcodeType},${element.height},,Y,N\n`;
        zpl += `^FD${element.content}^FS\n`;
        break;
        
      case 'qrcode':
        zpl += `^FO${element.x},${element.y}\n`;
        zpl += `^BQN,2,${element.size}\n`;
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
        zpl += element.imageData + '\n';
        break;
    }
  }
  
  zpl += '^XZ\n'; // End label
  
  return zpl;
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
