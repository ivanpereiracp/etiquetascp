// Convert image to pure black and white (no grayscale)
export const convertToBlackAndWhite = (
  imageData: ImageData,
  threshold: number = 128
): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Apply threshold
    const value = luminance >= threshold ? 255 : 0;
    
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  
  return new ImageData(data, imageData.width, imageData.height);
};

// Convert image to GRF format for Zebra printers
export const convertToGRF = (
  imageData: ImageData,
  name: string = "IMAGE"
): string => {
  const width = imageData.width;
  const height = imageData.height;
  const bytesPerRow = Math.ceil(width / 8);
  const totalBytes = bytesPerRow * height;
  
  let hexData = "";
  
  for (let y = 0; y < height; y++) {
    for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
      let byte = 0;
      
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIndex * 8 + bit;
        
        if (x < width) {
          const pixelIndex = (y * width + x) * 4;
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];
          
          // Calculate luminance and check if dark
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (luminance < 128) {
            byte |= (1 << (7 - bit));
          }
        }
      }
      
      hexData += byte.toString(16).padStart(2, '0').toUpperCase();
    }
  }
  
  // Create GRF format
  const grf = `~DG${name},${totalBytes},${bytesPerRow},${hexData}`;
  
  return grf;
};

// Raster image with different photometry options
export interface RasterOptions {
  photometry: 'uncompressed' | 'rgb-palette';
  width: number;
  height: number;
}

export const rasterImage = (
  imageData: ImageData,
  options: RasterOptions
): { imageData: ImageData; rawData: Uint8Array } => {
  const { photometry, width, height } = options;
  
  // Create output canvas with potentially larger dimensions (uncompressed)
  const scale = photometry === 'uncompressed' ? 1 : 1;
  const newWidth = width * scale;
  const newHeight = height * scale;
  
  const outputData = new Uint8ClampedArray(newWidth * newHeight * 4);
  const rawData: number[] = [];
  
  if (photometry === 'uncompressed') {
    // Uncompressed - each pixel stored as individual bytes
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4;
        const dstIndex = (y * newWidth + x) * 4;
        
        outputData[dstIndex] = imageData.data[srcIndex];
        outputData[dstIndex + 1] = imageData.data[srcIndex + 1];
        outputData[dstIndex + 2] = imageData.data[srcIndex + 2];
        outputData[dstIndex + 3] = 255;
        
        rawData.push(imageData.data[srcIndex]);
        rawData.push(imageData.data[srcIndex + 1]);
        rawData.push(imageData.data[srcIndex + 2]);
      }
    }
  } else {
    // RGB Palette - create indexed color representation
    const palette: Map<string, number> = new Map();
    let paletteIndex = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4;
        const r = imageData.data[srcIndex];
        const g = imageData.data[srcIndex + 1];
        const b = imageData.data[srcIndex + 2];
        
        const colorKey = `${r},${g},${b}`;
        
        if (!palette.has(colorKey)) {
          palette.set(colorKey, paletteIndex++);
        }
        
        const dstIndex = (y * newWidth + x) * 4;
        outputData[dstIndex] = r;
        outputData[dstIndex + 1] = g;
        outputData[dstIndex + 2] = b;
        outputData[dstIndex + 3] = 255;
        
        rawData.push(palette.get(colorKey)!);
      }
    }
  }
  
  return {
    imageData: new ImageData(outputData, newWidth, newHeight),
    rawData: new Uint8Array(rawData)
  };
};

// Download helpers
export const downloadFile = (content: string | Blob, filename: string, type: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
};

export const downloadCanvasAsImage = async (canvas: HTMLCanvasElement, filename: string) => {
  const blob = await canvasToBlob(canvas);
  downloadFile(blob, filename, 'image/png');
};
