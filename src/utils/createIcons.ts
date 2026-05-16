// Generate base64 PNG icons from canvas
// This creates placeholder icons until you can generate proper ones

export function generatePlaceholderIcon(size: number): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Blue gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#1e40af');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Draw fish icon (simplified)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.5, size * 0.3, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#1e40af';
  ctx.beginPath();
  ctx.arc(size * 0.4, size * 0.5, size * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(size * 0.7, size * 0.5);
  ctx.lineTo(size * 0.8, size * 0.4);
  ctx.lineTo(size * 0.8, size * 0.6);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/png');
}

export async function createAndSavePlaceholderIcons() {
  // This would need server-side implementation
  // For now, just log instructions
  console.log('To create proper icons, use: https://realfavicongenerator.net/');
}
