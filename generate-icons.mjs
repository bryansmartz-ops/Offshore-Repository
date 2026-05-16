#!/usr/bin/env node
import fs from 'fs';
import { createCanvas } from 'canvas';

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#1e40af');
  ctx.fillStyle = gradient;

  // Rounded rectangle
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

  // White text
  ctx.fillStyle = 'white';
  ctx.font = `${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎣', size / 2, size / 2);

  return canvas;
}

async function createIcons() {
  try {
    const icons = [
      { size: 192, name: 'pwa-192x192.png' },
      { size: 512, name: 'pwa-512x512.png' },
      { size: 180, name: 'apple-touch-icon.png' },
    ];

    for (const { size, name } of icons) {
      const canvas = generateIcon(size);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(`public/${name}`, buffer);
      console.log(`✅ Created ${name}`);
    }

    console.log('\n🎉 All icons created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTrying alternative method...');
  }
}

createIcons();
