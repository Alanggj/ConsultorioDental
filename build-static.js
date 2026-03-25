// Script para copiar los archivos estáticos a la carpeta public/
// Requiere Node 16+ (fs.cp)

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function emptyDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await emptyDir(fullPath);
      await fsp.rmdir(fullPath);
    } else {
      await fsp.unlink(fullPath);
    }
  }));
}

async function copyIfExists(srcRel, destRel) {
  const src = path.join(rootDir, srcRel);
  if (!fs.existsSync(src)) return;
  const dest = path.join(publicDir, destRel);
  await ensureDir(path.dirname(dest));
  await fsp.cp(src, dest, { recursive: true });
}

async function main() {
  await ensureDir(publicDir);
  await emptyDir(publicDir);

  // Copiar todos los HTML de la raíz
  const entries = await fsp.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      await copyIfExists(entry.name, entry.name);
    }
  }

  // Copiar carpetas estáticas principales
  await copyIfExists('css', 'css');
  await copyIfExists('js', 'js');
  await copyIfExists('images', 'images');
  await copyIfExists('fonts', 'fonts');
}

main().catch((err) => {
  console.error('Error construyendo assets estáticos:', err);
  process.exit(1);
});
