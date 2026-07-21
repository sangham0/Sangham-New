/**
 * Generates 1200x630 social-preview (Open Graph) images into public/images/.
 *
 * Usage: node scripts/generate-og-images.mjs
 *
 * Each entry crops a source photograph from src/assets to the OG aspect
 * ratio, darkens the lower third for legibility, and composites the Sangham
 * logo bottom-left so shared links are recognisably branded (most shares
 * happen via WhatsApp, where the preview image carries the first impression).
 *
 * Also recompresses public/images/og-default.jpg in place when it exceeds
 * MAX_DEFAULT_BYTES (the original shipped at ~600KB).
 */
import sharp from 'sharp';
import { existsSync, statSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public/images');
const LOGO = path.join(root, 'public/sangham-logo.png');

const WIDTH = 1200;
const HEIGHT = 630;
const JPEG_QUALITY = 78;
const MAX_DEFAULT_BYTES = 250 * 1024;

// Bottom gradient scrim so the logo always sits on a legible ground.
const scrim = Buffer.from(
  `<svg width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="55%" stop-color="rgb(7,11,20)" stop-opacity="0"/>
        <stop offset="100%" stop-color="rgb(7,11,20)" stop-opacity="0.78"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
  </svg>`
);

const targets = [
  {
    out: 'og-counselling.jpg',
    src: 'src/assets/rocky-coast-dawn.jpg',
  },
  {
    out: 'og-counselling-for-meditators.jpg',
    src: 'src/assets/moonlit-shore-meditation.jpg',
  },
  {
    out: 'og-mentoring-young-men.jpg',
    src: 'src/assets/documentary-mountain.jpg', // first photographic break on the page
  },
  {
    out: 'og-mentoring-adolescents.jpg',
    src: 'src/assets/misty-valley.jpg', // matches the page's atmospheric register
  },
];

async function generate({ out, src }) {
  const srcPath = path.join(root, src);
  if (!existsSync(srcPath)) {
    console.error(`SKIP ${out}: missing source ${src}`);
    return;
  }
  const logo = await sharp(LOGO).resize({ height: 110 }).png().toBuffer();
  await sharp(srcPath)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .composite([
      { input: scrim, top: 0, left: 0 },
      { input: logo, left: 56, top: HEIGHT - 110 - 48 },
    ])
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(path.join(OUT, out));
  const kb = Math.round(statSync(path.join(OUT, out)).size / 1024);
  console.log(`OK ${out} (${kb}KB)`);
}

async function recompressDefault() {
  const file = path.join(OUT, 'og-default.jpg');
  if (!existsSync(file)) return;
  const before = statSync(file).size;
  if (before <= MAX_DEFAULT_BYTES) {
    console.log(`OK og-default.jpg already ${Math.round(before / 1024)}KB, leaving as is`);
    return;
  }
  const tmp = file + '.tmp';
  copyFileSync(file, tmp);
  await sharp(tmp)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(file);
  const after = statSync(file).size;
  console.log(`OK og-default.jpg recompressed ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB`);
  const { unlinkSync } = await import('node:fs');
  unlinkSync(tmp);
}

for (const t of targets) await generate(t);
await recompressDefault();
