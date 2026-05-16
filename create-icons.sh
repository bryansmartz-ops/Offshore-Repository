#!/bin/bash

# Script to generate PWA icons from SVG

echo "🎨 Generating PWA icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it or use an online tool."
    echo ""
    echo "Quick solutions:"
    echo "1. Visit https://realfavicongenerator.net/ and upload public/pwa-icon.svg"
    echo "2. Or install ImageMagick: sudo apt-get install imagemagick"
    echo "3. Or use online SVG to PNG converter"
    exit 1
fi

cd public

# Generate 192x192 icon
convert pwa-icon.svg -resize 192x192 pwa-192x192.png
echo "✅ Created pwa-192x192.png"

# Generate 512x512 icon
convert pwa-icon.svg -resize 512x512 pwa-512x512.png
echo "✅ Created pwa-512x512.png"

# Generate Apple touch icon
convert pwa-icon.svg -resize 180x180 apple-touch-icon.png
echo "✅ Created apple-touch-icon.png"

# Generate favicon
convert pwa-icon.svg -resize 32x32 favicon.ico
echo "✅ Created favicon.ico"

echo ""
echo "🎉 All icons generated successfully!"
echo "Your PWA is ready to install!"
