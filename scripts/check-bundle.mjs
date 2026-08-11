import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const assetsRoot = resolve(process.cwd(), 'dist/assets');
const maxBytes = 500_000;
const assets = (await readdir(assetsRoot)).filter((name) => name.endsWith('.js'));
const oversized = [];

for (const asset of assets) {
  const size = (await stat(join(assetsRoot, asset))).size;
  if (size > maxBytes) oversized.push(`${asset}: ${size} bytes (limit ${maxBytes})`);
}

if (oversized.length > 0) {
  console.error('Bundle fitness check failed:');
  for (const asset of oversized) console.error(`- ${asset}`);
  process.exit(1);
}

console.log(`Bundle fitness check passed for ${assets.length} JavaScript chunks (limit ${maxBytes} bytes).`);
