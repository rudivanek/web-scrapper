// Asset manifest extraction from raw HTML, before cleaning.
// Runs in the browser via DOMParser.

export interface ExtractedAsset {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface AssetManifest {
  global_assets: {
    logo: string | null;
    favicon: string | null;
    og_image: string | null;
  };
  images: ExtractedAsset[];
  background_images: string[];
  inline_svg_count: number;
  svg_fill_colors: string[];
}

const TRACKING_PIXEL_RE = /facebook\.com\/tr|google-analytics\.com|googletagmanager\.com|hotjar|clarity\.ms|pixel\.|fbcdn|doubleclick|scorecardresearch|bat\.bing|linkedin\.com\/px|pinterest\.com\/v3\/gt/;
const SPACER_RE = /transparent|spacer|blank|1x1|pixel\.gif|pixel\.png/i;

function toAbsolute(href: string, origin: string, base: string): string {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `${origin}${href}`;
  return `${base}${href}`;
}

function isTrackingPixel(src: string, width: number | null, height: number | null): boolean {
  if (TRACKING_PIXEL_RE.test(src)) return true;
  if (width !== null && height !== null && width < 32 && height < 32) return true;
  if (SPACER_RE.test(src) && width !== null && height !== null && width <= 1 && height <= 1) return true;
  return false;
}

function parseDimension(val: string | null): number | null {
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

export function extractAssetManifest(rawHtml: string, pageUrl: string): AssetManifest {
  let origin = '';
  let base = pageUrl;
  try {
    const u = new URL(pageUrl);
    origin = u.origin;
    base = pageUrl.substring(0, pageUrl.lastIndexOf('/') + 1);
  } catch { /* ignore */ }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // ── Global assets ──
  let logo: string | null = null;
  let favicon: string | null = null;
  let ogImage: string | null = null;

  const faviconLink = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  if (faviconLink) {
    const href = faviconLink.getAttribute('href');
    if (href) favicon = toAbsolute(href, origin, base);
  }

  const ogMeta = doc.querySelector('meta[property="og:image"], meta[name="og:image"]');
  if (ogMeta) {
    const content = ogMeta.getAttribute('content');
    if (content) ogImage = toAbsolute(content, origin, base);
  }

  const headerOrNav = doc.querySelector('header, nav');
  if (headerOrNav) {
    const headerImg = headerOrNav.querySelector('img');
    if (headerImg) {
      const src = headerImg.getAttribute('src');
      if (src) logo = toAbsolute(src, origin, base);
    }
  }
  if (!logo) {
    const allImgs = doc.querySelectorAll('img');
    for (const img of allImgs) {
      const src = img.getAttribute('src') ?? '';
      const alt = img.getAttribute('alt') ?? '';
      const cls = img.getAttribute('class') ?? '';
      if (/logo/i.test(src) || /logo/i.test(alt) || /logo/i.test(cls)) {
        logo = toAbsolute(src, origin, base);
        break;
      }
    }
  }

  // ── All <img> elements ──
  const images: ExtractedAsset[] = [];
  const allImgs = doc.querySelectorAll('img');
  for (const img of allImgs) {
    const src = img.getAttribute('src');
    if (!src) continue;
    const absUrl = toAbsolute(src, origin, base);
    const w = parseDimension(img.getAttribute('width'));
    const h = parseDimension(img.getAttribute('height'));
    if (isTrackingPixel(absUrl, w, h)) continue;
    if (absUrl.startsWith('data:') && w !== null && h !== null && w < 32 && h < 32) continue;
    images.push({
      url: absUrl,
      alt: img.getAttribute('alt') ?? '',
      width: w,
      height: h,
    });
  }

  // ── Background images from inline styles and <style> blocks ──
  const backgroundImages: string[] = [];
  const bgUrlRe = /url\(["']?([^"')]+)["']?\)/g;

  const inlineStyleRe = /style="([^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = inlineStyleRe.exec(rawHtml)) !== null) {
    const styleVal = m[1];
    if (!/background-image\s*:/.test(styleVal) && !/background\s*:.*url/.test(styleVal)) continue;
    let bgm: RegExpExecArray | null;
    while ((bgm = bgUrlRe.exec(styleVal)) !== null) {
      const url = toAbsolute(bgm[1], origin, base);
      if (url && !url.startsWith('data:')) backgroundImages.push(url);
    }
  }

  const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sbm: RegExpExecArray | null;
  while ((sbm = styleBlockRe.exec(rawHtml)) !== null) {
    const css = sbm[1];
    bgUrlRe.lastIndex = 0;
    let bgm: RegExpExecArray | null;
    while ((bgm = bgUrlRe.exec(css)) !== null) {
      const url = toAbsolute(bgm[1], origin, base);
      if (url && !url.startsWith('data:') && !backgroundImages.includes(url)) {
        backgroundImages.push(url);
      }
    }
  }

  // ── Inline SVG icons ──
  const inlineSvgs = doc.querySelectorAll('svg');
  const svgFillColors = new Set<string>();
  for (const svg of inlineSvgs) {
    const fill = svg.getAttribute('fill');
    if (fill && fill !== 'none' && fill !== 'currentColor') {
      svgFillColors.add(fill);
    }
    const filled = svg.querySelectorAll('[fill]');
    for (const el of filled) {
      const f = el.getAttribute('fill');
      if (f && f !== 'none' && f !== 'currentColor') {
        svgFillColors.add(f);
      }
    }
  }

  return {
    global_assets: {
      logo,
      favicon,
      og_image: ogImage,
    },
    images,
    background_images: [...new Set(backgroundImages)],
    inline_svg_count: inlineSvgs.length,
    svg_fill_colors: [...svgFillColors],
  };
}

export function enrichManifestWithCss(
  manifest: AssetManifest,
  rawCss: Record<string, string>,
  pageUrl: string,
): AssetManifest {
  let origin = '';
  try {
    origin = new URL(pageUrl).origin;
  } catch { /* ignore */ }

  const bgUrlRe = /url\(["']?([^"')]+)["']?\)/g;
  const existing = new Set(manifest.background_images);
  const newBgs: string[] = [];

  for (const sheetText of Object.values(rawCss)) {
    bgUrlRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = bgUrlRe.exec(sheetText)) !== null) {
      const raw = m[1];
      if (!raw || raw.startsWith('data:')) continue;
      const abs = raw.startsWith('http') ? raw : raw.startsWith('//') ? `https:${raw}` : raw.startsWith('/') ? `${origin}${raw}` : `${origin}/${raw}`;
      if (!existing.has(abs) && !newBgs.includes(abs)) {
        newBgs.push(abs);
      }
    }
  }

  if (newBgs.length > 0) {
    return {
      ...manifest,
      background_images: [...manifest.background_images, ...newBgs],
    };
  }
  return manifest;
}

export function formatAssetManifestForPrompt(manifest: AssetManifest): string {
  const lines: string[] = ['/* ─── Asset manifest (extracted from raw HTML, all URLs resolved to absolute) ─── */'];

  const ga = manifest.global_assets;
  lines.push('Global assets:');
  lines.push(`  logo: ${ga.logo ?? 'NOT FOUND'}`);
  lines.push(`  favicon: ${ga.favicon ?? 'NOT FOUND'}`);
  lines.push(`  og_image: ${ga.og_image ?? 'NOT FOUND'}`);

  if (manifest.images.length > 0) {
    lines.push('\nImages found on the page:');
    for (const img of manifest.images) {
      const dims = img.width && img.height ? ` (${img.width}x${img.height})` : '';
      lines.push(`  ${img.url}${dims} alt="${img.alt}"`);
    }
  }

  if (manifest.background_images.length > 0) {
    lines.push('\nBackground images (CSS url()):');
    for (const url of manifest.background_images) {
      lines.push(`  ${url}`);
    }
  }

  if (manifest.inline_svg_count > 0) {
    lines.push(`\nInline SVGs: ${manifest.inline_svg_count} found`);
    if (manifest.svg_fill_colors.length > 0) {
      lines.push(`  Fill colors: ${manifest.svg_fill_colors.join(', ')}`);
    }
  }

  return lines.join('\n');
}
