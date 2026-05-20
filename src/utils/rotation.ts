// Rotate ImageData by 0/90/180/270 degrees using an offscreen canvas.
export type Rotation = 0 | 90 | 180 | 270;

export const rotateImageData = (src: ImageData, deg: Rotation): ImageData => {
  if (deg === 0) return src;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = src.width;
  srcCanvas.height = src.height;
  const sctx = srcCanvas.getContext('2d');
  if (!sctx) return src;
  sctx.putImageData(src, 0, 0);

  const swap = deg === 90 || deg === 270;
  const outW = swap ? src.height : src.width;
  const outH = swap ? src.width : src.height;

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d');
  if (!octx) return src;
  octx.imageSmoothingEnabled = false;
  octx.save();
  octx.translate(outW / 2, outH / 2);
  octx.rotate((deg * Math.PI) / 180);
  octx.drawImage(srcCanvas, -src.width / 2, -src.height / 2);
  octx.restore();
  return octx.getImageData(0, 0, outW, outH);
};
