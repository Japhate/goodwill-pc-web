import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const PUBLIC_IMAGES_DIR = path.join(ROOT_DIR, 'public', 'images');
const OUTPUT_DIR = path.join(PUBLIC_IMAGES_DIR, 'optimized');
const MANIFEST_PATH = path.join(ROOT_DIR, 'src', 'lib', 'responsive-image-manifest.json');
const WIDTHS = [640, 1024, 1440];
const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

async function listImageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'optimized') continue;
      files.push(...await listImageFiles(fullPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function publicUrlForSource(sourcePath) {
  const relativePath = path.relative(path.join(ROOT_DIR, 'public'), sourcePath);
  return `/${relativePath.split(path.sep).join('/')}`;
}

function optimizedName(relativeSourcePath, width, format) {
  const parsed = path.parse(relativeSourcePath);
  const base = path.join(parsed.dir, parsed.name).split(path.sep).join('-');
  return `${base}-${width}.${format}`;
}

async function ensureCleanOutputDir() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function generateVariant(sourcePath, width, format, metadata) {
  const relativeSourcePath = path.relative(PUBLIC_IMAGES_DIR, sourcePath);
  const fileName = optimizedName(relativeSourcePath, width, format);
  const outputPath = path.join(OUTPUT_DIR, fileName);

  let pipeline = sharp(sourcePath)
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
    });

  if (format === 'avif') {
    pipeline = pipeline.avif({
      quality: metadata.hasAlpha ? 55 : 48,
      effort: 1,
    });
  } else {
    pipeline = pipeline.webp({
      quality: metadata.hasAlpha ? 82 : 78,
      effort: 5,
    });
  }

  await pipeline.toFile(outputPath);

  return {
    width,
    url: `/images/optimized/${fileName}`,
  };
}

async function main() {
  await ensureCleanOutputDir();

  const sourceFiles = await listImageFiles(PUBLIC_IMAGES_DIR);
  const manifest = {};

  for (const sourcePath of sourceFiles) {
    const metadata = await sharp(sourcePath).metadata();
    if (!metadata.width || !metadata.height) continue;

    const sourceUrl = publicUrlForSource(sourcePath);
    const widths = WIDTHS.filter((width) => width < metadata.width);
    if (!widths.includes(metadata.width)) widths.push(metadata.width);

    const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);
    const variants = {
      avif: [],
      webp: [],
    };

    for (const width of uniqueWidths) {
      variants.avif.push(await generateVariant(sourcePath, width, 'avif', metadata));
      variants.webp.push(await generateVariant(sourcePath, width, 'webp', metadata));
    }

    manifest[sourceUrl] = {
      width: metadata.width,
      height: metadata.height,
      aspectRatio: `${metadata.width} / ${metadata.height}`,
      variants,
    };
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Generated responsive variants for ${Object.keys(manifest).length} images.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
