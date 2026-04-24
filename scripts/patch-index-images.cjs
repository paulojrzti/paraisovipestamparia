/**
 * Aplica srcset/sizes/dimensões a partir de assets/derived/manifest.json
 * Idempotente: ignora <img> com src em assets/derived/
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INDEX = path.join(ROOT, "index.html");
const MANIFEST = path.join(ROOT, "assets", "derived", "manifest.json");
const LOGO_FILE = "arte do paraiso vip para adesivo.png";

const SIZES = {
  logo: "(max-width: 639px) 44vw, 200px",
  hero: "(max-width: 639px) 100px, 200px",
  cat: "(max-width: 639px) 100vw, (max-width: 899px) 50vw, 33vw",
  step: "(max-width: 1023px) 92vw, 42vw",
  kit: "(max-width: 639px) 100vw, (max-width: 899px) 50vw, 32vw",
  det: "(max-width: 1023px) 92vw, 33vw",
  marquee: "(max-width: 639px) 50vw, 200px",
  mscale: "(max-width: 639px) 40vw, 220px",
};

function pickContext(tag, before) {
  if (/class="topbar-logo"/.test(tag) || new RegExp(LOGO_FILE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(tag)) {
    return "logo";
  }
  if (before.slice(-500).match(/class="fx fx-|data-depth="/)) {
    return "hero";
  }
  if (before.slice(-800).includes("cat-photo")) {
    return "cat";
  }
  if (before.slice(-800).includes("step-photo")) {
    return "step";
  }
  if (before.slice(-800).includes("kit-photo")) {
    return "kit";
  }
  if (before.slice(-800).includes("det-item")) {
    return "det";
  }
  if (before.slice(-800).includes("marquee-item")) {
    if (before.includes("s-escala")) {
      return "mscale";
    }
    return "marquee";
  }
  if (before.slice(-2000).includes("hero-parallax") && /class="fx/.test(before.slice(-200))) {
    return "hero";
  }
  return "cat";
}

function buildSrcset(entry) {
  if (!entry || !entry.output) {
    return { srcset: null, w900: null };
  }
  const o = entry.output;
  const parts = [480, 900, 1400]
    .map((w) => {
      const e = o[String(w)];
      return e ? `${e.file} ${e.width}w` : null;
    })
    .filter(Boolean);
  if (!parts.length) {
    return { srcset: null, w900: null };
  }
  return { srcset: parts.join(", "), w900: o["900"] };
}

function buildLogo(logo) {
  if (!logo || !logo.output) {
    return null;
  }
  const o = logo.output;
  if (!o[180] || !o[360]) {
    return null;
  }
  return {
    srcset: `${o[180].file} 180w, ${o[360].file} 360w`,
    w360: o[360],
  };
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error("Execute npm run build:img antes (manifest em falta).");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const html0 = fs.readFileSync(INDEX, "utf8");
  const images = manifest.images;
  const logo = manifest.logo;

  const re = /<img\b[^>]*>/g;
  const html1 = html0.replace(re, (tag, off) => {
    if (tag.includes('src="assets/derived/')) {
      return tag;
    }
    const srcM = /src="([^"]+)"/.exec(tag);
    if (!srcM) {
      return tag;
    }
    const src = srcM[1].replace(/\\/g, "/");
    if (src.includes("placeholder")) {
      return tag;
    }

    const before = html0.slice(0, off);

    if (src === LOGO_FILE) {
      const L = buildLogo(logo);
      if (!L) {
        return tag;
      }
      return tag
        .replace(
          /src="[^"]+"/,
          `src="${L.w360.file}" srcset="${L.srcset}" sizes="${SIZES.logo}" width="${L.w360.width}" height="${L.w360.height}" fetchpriority="high" decoding="async"`
        )
        .replace(/\s*loading="[^"]*"/g, "");
    }

    if (!src.startsWith("assets/")) {
      return tag;
    }

    const { srcset, w900 } = buildSrcset(images[src]);
    if (!srcset || !w900) {
      return tag;
    }
    const context = pickContext(tag, before);
    const sizes = SIZES[context] || SIZES.cat;
    const fetchprio = context === "hero" ? ' fetchpriority="low"' : "";
    const hadLazy = /loading="lazy"/.test(tag);
    const base = `src="${w900.file}" srcset="${srcset}" sizes="${sizes}" width="${w900.width}" height="${w900.height}" decoding="async"${fetchprio}`;
    let next = tag.replace(/src="[^"]+"/, base);
    if (context === "hero") {
      next = next.replace(/\s*loading="[^"]*"/g, "");
    } else {
      if (hadLazy) {
        if (!/loading=/.test(next)) {
          next = next.replace(/<img /, '<img loading="lazy" ');
        }
      } else if (!/loading=/.test(next)) {
        next = next.replace(/<img /, '<img loading="lazy" ');
      }
    }
    return next;
  });

  if (html1 === html0) {
    console.log("[ok] nada a alterar.");
    return;
  }
  fs.writeFileSync(INDEX, html1, "utf8");
  console.log("[ok] index.html atualizado com imagens responsivas.");
}

main();
