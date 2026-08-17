import { readFileSync } from 'node:fs';

const indexPath = new URL('../dist/index.html', import.meta.url);
const html = readFileSync(indexPath, 'utf8');

if (!html.includes('/vextris/assets/')) {
  throw new Error('dist/index.html must reference bundled assets under /vextris/assets/.');
}

if (html.includes('src="/assets/') || html.includes('href="/assets/')) {
  throw new Error('dist/index.html must not reference root-relative /assets/ paths.');
}

console.log('GitHub Pages asset base check passed.');
