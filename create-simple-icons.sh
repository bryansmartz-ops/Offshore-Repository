#!/bin/bash

# Create simple colored PNG files as placeholders
# These won't have the fish icon but will allow PWA installation

echo "Creating placeholder icon PNGs..."

# Create a simple blue square SVG and convert to PNG
cat > /tmp/icon-template.svg << 'SVGEOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#grad)"/>
  <text x="256" y="300" font-size="200" text-anchor="middle" fill="white" font-family="Arial">🎣</text>
</svg>
SVGEOF

# Check if we have rsvg-convert or ImageMagick
if command -v rsvg-convert &> /dev/null; then
    echo "Using rsvg-convert..."
    rsvg-convert -w 192 -h 192 /tmp/icon-template.svg -o public/pwa-192x192.png
    rsvg-convert -w 512 -h 512 /tmp/icon-template.svg -o public/pwa-512x512.png
    rsvg-convert -w 180 -h 180 /tmp/icon-template.svg -o public/apple-touch-icon.png
    rsvg-convert -w 32 -h 32 /tmp/icon-template.svg -o public/favicon.png
    echo "✅ Icons created successfully!"
elif command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    convert /tmp/icon-template.svg -resize 192x192 public/pwa-192x192.png
    convert /tmp/icon-template.svg -resize 512x512 public/pwa-512x512.png
    convert /tmp/icon-template.svg -resize 180x180 public/apple-touch-icon.png
    convert /tmp/icon-template.svg -resize 32x32 public/favicon.png
    echo "✅ Icons created successfully!"
else
    echo "❌ Neither rsvg-convert nor ImageMagick found"
    echo "Creating fallback icons using base64..."
    # We'll use node to create them instead
fi
