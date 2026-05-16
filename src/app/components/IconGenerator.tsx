import { useState } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';

export default function IconGenerator() {
  const [generated, setGenerated] = useState(false);

  const generateIcon = (size: number): string => {
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

    // Rounded square (for maskable icons)
    const radius = size * 0.1875;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    // Draw fish icon
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 0.95;

    // Fish body (ellipse)
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.5, size * 0.25, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.arc(size * 0.42, size * 0.5, size * 0.025, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(size * 0.65, size * 0.5);
    ctx.lineTo(size * 0.75, size * 0.42);
    ctx.lineTo(size * 0.75, size * 0.58);
    ctx.closePath();
    ctx.fill();

    // Top fin
    ctx.beginPath();
    ctx.moveTo(size * 0.48, size * 0.38);
    ctx.lineTo(size * 0.52, size * 0.30);
    ctx.lineTo(size * 0.54, size * 0.38);
    ctx.closePath();
    ctx.fill();

    // Waves at bottom
    ctx.globalAlpha = 0.15;
    const waveY = size * 0.75;
    ctx.beginPath();
    ctx.moveTo(0, waveY);
    for (let x = 0; x <= size; x += size / 8) {
      ctx.quadraticCurveTo(x + size / 16, waveY - size * 0.03, x + size / 8, waveY);
    }
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();

    return canvas.toDataURL('image/png');
  };

  const downloadIcon = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAll = () => {
    const icons = [
      { size: 192, name: 'pwa-192x192.png' },
      { size: 512, name: 'pwa-512x512.png' },
      { size: 180, name: 'apple-touch-icon.png' },
    ];

    icons.forEach(({ size, name }) => {
      const dataUrl = generateIcon(size);
      downloadIcon(dataUrl, name);
    });

    setGenerated(true);
  };

  const handleGenerateFavicon = () => {
    const dataUrl = generateIcon(32);
    downloadIcon(dataUrl, 'favicon.png');
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-3">
        <ImageIcon className="text-purple-400" size={24} />
        <div>
          <h2 className="font-semibold text-lg">Generate PWA Icons</h2>
          <p className="text-sm text-slate-400">Download icons for installation</p>
        </div>
      </div>

      {!generated ? (
        <>
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 text-sm">
            <p className="text-yellow-400 font-semibold mb-2">⚠️ Icons Required for Installation</p>
            <p className="text-yellow-200">
              Android Chrome needs PNG icons to show the install button. Generate them here, then
              follow the instructions below.
            </p>
          </div>

          <button
            onClick={handleGenerateAll}
            className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Generate & Download All Icons
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGenerateFavicon}
              className="bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm"
            >
              Download Favicon
            </button>
            <div className="flex items-center justify-center text-xs text-slate-500">
              4 files total
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
            <p className="font-semibold text-green-400 mb-2">✅ Icons Downloaded!</p>
            <p className="text-sm text-green-200">
              Check your Downloads folder for 3 PNG files.
            </p>
          </div>

          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 space-y-3">
            <p className="font-semibold text-blue-400">📋 Next Steps:</p>
            <div className="space-y-2 text-sm text-blue-200">
              <p className="font-semibold">Since you're in Figma Make, here's what to do:</p>

              <div className="bg-slate-900/50 rounded p-3 space-y-2">
                <p className="font-semibold text-white">Option A: Test Without Icons (Quick)</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>In Chrome, go to Settings → Apps → Install app</li>
                  <li>Or use the manual install button below</li>
                  <li>The app will work, just without custom icons</li>
                </ol>
              </div>

              <div className="bg-slate-900/50 rounded p-3 space-y-2">
                <p className="font-semibold text-white">Option B: Add Icons (Full PWA)</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Contact your Figma Make workspace admin</li>
                  <li>Ask them to upload the 3 PNG files to /public folder</li>
                  <li>Or deploy this to Vercel/Netlify where you can add files</li>
                </ol>
              </div>
            </div>
          </div>

          <button
            onClick={() => setGenerated(false)}
            className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm"
          >
            Generate Again
          </button>
        </div>
      )}

      <div className="bg-slate-900 rounded-lg p-3">
        <p className="text-xs text-slate-400 mb-2 font-semibold">Files you'll download:</p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• pwa-192x192.png (Android small icon)</li>
          <li>• pwa-512x512.png (Android large icon)</li>
          <li>• apple-touch-icon.png (iOS icon)</li>
        </ul>
      </div>
    </div>
  );
}
