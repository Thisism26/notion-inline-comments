import fs from 'fs';
import path from 'path';

// Simple build: copy src to dist
const srcDir = path.resolve('src');
const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

for (const file of fs.readdirSync(srcDir)) {
  fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
}

console.log('✅ Built to dist/');
