/**
 * Face photos for low-literacy users: tap the face, don't read the name.
 * Photos are downscaled on-device so 30 members fit easily in localStorage
 * (target ≤ ~28KB each → under 1MB for a full group).
 */

const MAX_BYTES = 28 * 1024;

/** Approximate decoded bytes of a base64 data URL (no decoding needed). */
export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const len = b64.replace(/\s/g, '').length;
  return Math.floor((len * 3) / 4);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that photo. Try another.'));
    };
    img.src = url;
  });
}

function renderSquare(img: HTMLImageElement, px: number, quality: number): string {
  const side = Math.min(img.naturalWidth || px, img.naturalHeight || px);
  const sx = ((img.naturalWidth || px) - side) / 2;
  const sy = ((img.naturalHeight || px) - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Photo tools unavailable on this phone.');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, px, px);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Compress an uploaded photo to a tiny square data URL. Rejects on failure. */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Pick a photo file.');
  const img = await loadImage(file);
  for (const [px, q] of [[128, 0.7], [96, 0.6]] as const) {
    const url = renderSquare(img, px, q);
    if (estimateDataUrlBytes(url) <= MAX_BYTES) return url;
  }
  return renderSquare(img, 96, 0.6);
}
