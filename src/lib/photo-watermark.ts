// ==========================================
// NutriLens AI – Photo Watermarking Utility
// Uses HTML Canvas to burn timestamp + logo
// into progress photos for verification.
// ==========================================

/**
 * Add timestamp and "NutriLens AI" watermark to an image.
 * Returns a base64 JPEG data URL with the overlay baked in.
 */
export function watermarkImage(
  imageDataUrl: string,
  options?: {
    verified?: boolean;
    timestamp?: Date;
  }
): Promise<string> {
  const ts = options?.timestamp || new Date();
  const verified = options?.verified ?? true;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      const scale = Math.max(img.width / 800, 1); // scale text for high-res images
      const padding = 16 * scale;
      const fontSize = 14 * scale;
      const smallFontSize = 11 * scale;

      // Semi-transparent bottom band
      const bandHeight = 56 * scale;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, img.height - bandHeight, img.width, bandHeight);

      // Timestamp (bottom-left)
      const dateStr = formatTimestamp(ts);
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textBaseline = 'bottom';
      ctx.fillText(dateStr, padding, img.height - padding);

      // "NutriLens AI" logo (bottom-right)
      ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'right';
      ctx.fillText('NutriLens AI', img.width - padding, img.height - padding);

      // Verified / Unverified badge (top-right)
      const badgeText = verified ? '✓ Verified' : '⚠ Unverified';
      const badgeColor = verified ? 'rgba(52, 168, 83, 0.85)' : 'rgba(234, 134, 45, 0.85)';
      ctx.font = `700 ${smallFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.textAlign = 'right';
      const badgeWidth = ctx.measureText(badgeText).width + 20 * scale;
      const badgeHeight = 26 * scale;
      const badgeX = img.width - padding;
      const badgeY = padding;

      // Badge background
      ctx.fillStyle = badgeColor;
      roundRect(ctx, badgeX - badgeWidth, badgeY, badgeWidth, badgeHeight, 6 * scale);
      ctx.fill();

      // Badge text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX - 10 * scale, badgeY + badgeHeight / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

function formatTimestamp(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y}, ${h}:${min}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
