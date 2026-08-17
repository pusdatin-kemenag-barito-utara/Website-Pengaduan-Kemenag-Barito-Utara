const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generate() {
  // Use favicon.svg which has the square padded viewBox (1444x1444)
  const svgPath = path.resolve(__dirname, '../public/favicon.svg');
  const publicDir = path.resolve(__dirname, '../public');

  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating padded PNG favicons from square favicon.svg...');

  // Helper to render icon with nice padding
  async function renderSquare(size) {
    return sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }

  // 1. 16x16 PNG
  const p16 = await renderSquare(16);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), p16);

  // 2. 32x32 PNG
  const p32 = await renderSquare(32);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), p32);

  // 3. 48x48 PNG
  const p48 = await renderSquare(48);

  // 4. 180x180 Apple Touch Icon
  const p180 = await renderSquare(180);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), p180);

  // 5. 192x192 Android Chrome
  const p192 = await renderSquare(192);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), p192);

  // 6. 512x512 Android Chrome
  const p512 = await renderSquare(512);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), p512);

  // 7. Write standard multi-resolution favicon.ico (16, 32, 48)
  const images = [
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 },
  ];

  const headerSize = 6 + images.length * 16;
  let currentOffset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(images.length, 4); // Count

  const direntries = [];
  for (const img of images) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    dir.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    dir.writeUInt8(0, 2); // Palette
    dir.writeUInt8(0, 3); // Reserved
    dir.writeUInt16LE(1, 4); // Color planes
    dir.writeUInt16LE(32, 6); // Bits per pixel
    dir.writeUInt32LE(img.buffer.length, 8); // Image size
    dir.writeUInt32LE(currentOffset, 12); // Offset
    direntries.push(dir);
    currentOffset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...direntries, ...images.map((img) => img.buffer)]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  console.log('Successfully regenerated all padded square favicons!');
}

generate().catch(console.error);
