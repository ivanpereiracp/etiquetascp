// Minimal uncompressed baseline TIFF encoder (RGB, 8 bits/sample, little-endian).
// Sufficient for downloading processed canvases as .tif files.

export function encodeTIFF(imageData: ImageData): Blob {
  const { width, height, data } = imageData;
  const samplesPerPixel = 3; // RGB (drop alpha)
  const bitsPerSample = 8;
  const rowBytes = width * samplesPerPixel;
  const imageBytes = rowBytes * height;

  // Build pixel buffer (RGB)
  const pixels = new Uint8Array(imageBytes);
  for (let i = 0, j = 0; i < data.length; i += 4) {
    pixels[j++] = data[i];
    pixels[j++] = data[i + 1];
    pixels[j++] = data[i + 2];
  }

  // IFD entries
  const entries: Array<{ tag: number; type: number; count: number; value: number | number[]; isOffset?: boolean }> = [
    { tag: 256, type: 4, count: 1, value: width }, // ImageWidth (LONG)
    { tag: 257, type: 4, count: 1, value: height }, // ImageLength (LONG)
    { tag: 258, type: 3, count: 3, value: [8, 8, 8], isOffset: true }, // BitsPerSample (SHORT x3)
    { tag: 259, type: 3, count: 1, value: 1 }, // Compression = none
    { tag: 262, type: 3, count: 1, value: 2 }, // PhotometricInterpretation = RGB
    { tag: 273, type: 4, count: 1, value: 0 }, // StripOffsets (filled later)
    { tag: 277, type: 3, count: 1, value: 3 }, // SamplesPerPixel
    { tag: 278, type: 4, count: 1, value: height }, // RowsPerStrip
    { tag: 279, type: 4, count: 1, value: imageBytes }, // StripByteCounts
    { tag: 282, type: 5, count: 1, value: 0, isOffset: true }, // XResolution
    { tag: 283, type: 5, count: 1, value: 0, isOffset: true }, // YResolution
    { tag: 284, type: 3, count: 1, value: 1 }, // PlanarConfiguration = chunky
    { tag: 296, type: 3, count: 1, value: 2 }, // ResolutionUnit = inch
  ];

  const headerSize = 8;
  const ifdSize = 2 + entries.length * 12 + 4;
  // External data: BitsPerSample (6 bytes) + 2x Rational (16 bytes) = 22 bytes
  const bitsPerSampleOffset = headerSize + ifdSize;
  const xResOffset = bitsPerSampleOffset + 6;
  const yResOffset = xResOffset + 8;
  const stripOffset = yResOffset + 8;
  const total = stripOffset + imageBytes;

  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);

  // Header (little-endian)
  dv.setUint16(0, 0x4949, true); // "II"
  dv.setUint16(2, 42, true);
  dv.setUint32(4, headerSize, true); // IFD offset

  // IFD
  dv.setUint16(headerSize, entries.length, true);
  let p = headerSize + 2;
  for (const e of entries) {
    dv.setUint16(p, e.tag, true);
    dv.setUint16(p + 2, e.type, true);
    dv.setUint32(p + 4, e.count, true);
    let val: number;
    if (e.tag === 258) val = bitsPerSampleOffset;
    else if (e.tag === 273) val = stripOffset;
    else if (e.tag === 282) val = xResOffset;
    else if (e.tag === 283) val = yResOffset;
    else val = Array.isArray(e.value) ? 0 : e.value;
    // SHORT values fit in low 16 bits (count==1) — write as LONG aligned to low
    if (e.type === 3 && e.count === 1) {
      dv.setUint16(p + 8, val, true);
      dv.setUint16(p + 10, 0, true);
    } else {
      dv.setUint32(p + 8, val, true);
    }
    p += 12;
  }
  dv.setUint32(p, 0, true); // next IFD = 0

  // BitsPerSample external data
  dv.setUint16(bitsPerSampleOffset, 8, true);
  dv.setUint16(bitsPerSampleOffset + 2, 8, true);
  dv.setUint16(bitsPerSampleOffset + 4, 8, true);
  // XResolution 72/1
  dv.setUint32(xResOffset, 72, true);
  dv.setUint32(xResOffset + 4, 1, true);
  dv.setUint32(yResOffset, 72, true);
  dv.setUint32(yResOffset + 4, 1, true);

  // Pixel data
  u8.set(pixels, stripOffset);

  return new Blob([buf], { type: 'image/tiff' });
}

export function downloadCanvasAsTIFF(canvas: HTMLCanvasElement, filename: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const blob = encodeTIFF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadImageDataAsTIFF(imageData: ImageData, filename: string) {
  const blob = encodeTIFF(imageData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
