// Cross-platform asset copy script (ESM)
import fs from 'fs';
import path from 'path';

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((child) => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Copy files
const copies = [
  ['public/manifest.json', 'dist/manifest.json'],
  ['public/popup.html', 'dist/popup.html'],
  ['public/styles', 'dist/styles'],
  ['public/content', 'dist/content'],
];

copies.forEach(([src, dest]) => {
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`Copied: ${src} -> ${dest}`);
  }
});

console.log('Assets copied successfully!');
