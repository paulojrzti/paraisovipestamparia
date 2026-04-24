/**
 * Gera WebP em várias larguras a partir de assets referenciados no site.
 * Saída: assets/derived/{nome}-w{W}.webp + manifest.json
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const INDEX = path.join(ROOT, "index.html");
const DERIVED = path.join(ROOT, "assets", "derived");
const MANIFEST = path.join(DERIVED, "manifest.json");
const LOGO_FILE = "arte do paraiso vip para adesivo.png";

const WIDTHS = [480, 900, 1400];
const LOGO_WIDTHS = [180, 360];
const WEBP = { quality: 80, effort: 4 };

function collectAssetPaths() {
  const html = fs.readFileSync(INDEX, "utf8");
  const set = new Set();
  const re = /src="((?:assets\/[^"]+))"/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1].includes("placeholder") || m[1].includes("derived/")) continue;
    set.add(m[1].replace(/\\/g, "/"));
  }
  return Array.from(set);
}

function baseStem(relPath) {
  const b = path.basename(relPath, path.extname(relPath));
  return b.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "img";
}

async function processImage(relFromRoot, quality = WEBP.quality) {
  const abs = path.join(ROOT, relFromRoot.split("/").join(path.sep));
  if (!fs.existsSync(abs)) {
    console.warn(`[skip] ficheiro inexistente: ${relFromRoot}`);
    return null;
  }
  const ext = path.extname(abs).toLowerCase();
  if (ext === ".svg") {
    return null;
  }
  const stem = baseStem(relFromRoot);
  const entry = { output: {} };

  for (const w of WIDTHS) {
    const outName = `${stem}-w${w}.webp`;
    const outRel = `assets/derived/${outName}`;
    const outAbs = path.join(ROOT, "assets", "derived", outName);
    const pipeline = sharp(abs).rotate();
    const resized = await pipeline
      .resize({
        width: w,
        height: w,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: WEBP.effort });
    await resized.toFile(outAbs);
    const meta = await sharp(outAbs).metadata();
    entry.output[String(w)] = {
      file: outRel.replace(/\\/g, "/"),
      width: meta.width,
      height: meta.height,
    };
    const kb = Math.round(fs.statSync(outAbs).size / 1024);
    console.log(`[ok] ${outRel} (${kb} KB)`);
  }
  return { key: relFromRoot.replace(/\\/g, "/"), data: entry };
}

async function processLogo() {
  const abs = path.join(ROOT, LOGO_FILE);
  if (!fs.existsSync(abs)) {
    console.warn(`[skip] logo: ${LOGO_FILE}`);
    return;
  }
  const entry = { output: {} };
  for (const w of LOGO_WIDTHS) {
    const outName = `logo-w${w}.webp`;
    const outRel = `assets/derived/${outName}`;
    const outAbs = path.join(DERIVED, outName);
    await sharp(abs)
      .rotate()
      .resize({ width: w, height: w, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toFile(outAbs);
    const meta = await sharp(outAbs).metadata();
    entry.output[String(w)] = {
      file: outRel,
      width: meta.width,
      height: meta.height,
    };
    const kb = Math.round(fs.statSync(outAbs).size / 1024);
    console.log(`[ok] ${outRel} (${kb} KB)`);
  }
  return { key: LOGO_FILE, data: entry };
}

async function main() {
  if (!fs.existsSync(DERIVED)) {
    fs.mkdirSync(DERIVED, { recursive: true });
  }
  if (!fs.existsSync(INDEX)) {
    throw new Error(`index.html não encontrado: ${INDEX}`);
  }

  const relPaths = collectAssetPaths();
  const manifest = { images: {}, logo: null };

  for (const rel of relPaths) {
    const result = await processImage(rel, WEBP.quality);
    if (result) {
      manifest.images[result.key] = result.data;
    }
  }
  const logoR = await processLogo();
  if (logoR) {
    manifest.logo = { file: LOGO_FILE, ...logoR.data };
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[done] ${MANIFEST}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
