import { extractAssetManifest } from './assetExtractor';

export type ImageSourceMode = 'design' | 'copy' | 'unsplash';

export interface ImageSourceInput {
  rawHtml: string;
  pageUrl: string;
}

interface ImageEntry {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  section: string;
  isUnsplash: boolean;
}

const SECTION_TAGS = new Set(['section', 'header', 'main', 'article', 'aside']);
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const SKIP_SECTIONS_FOR_FILLER = new Set([
  'Logo', 'Favicon', 'Open Graph Image', 'Background Images', 'Videos',
  'Footer', 'Navigation',
]);

function toAbsolute(href: string, pageUrl: string): string {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  try {
    const u = new URL(pageUrl);
    if (href.startsWith('/')) return `${u.origin}${href}`;
    const base = pageUrl.substring(0, pageUrl.lastIndexOf('/') + 1);
    return `${base}${href}`;
  } catch { return href; }
}

function getSectionForImage(img: Element, body: Element): string {
  let section: Element | null = null;
  let node: Element | null = img.parentElement;
  while (node && node !== body) {
    if (SECTION_TAGS.has(node.tagName.toLowerCase()) && !section) section = node;
    node = node.parentElement;
  }
  if (section) {
    for (const htag of HEADING_TAGS) {
      const heading = section.querySelector(htag);
      if (heading) {
        const text = (heading.textContent?.trim() ?? '').replace(/\s+/g, ' ');
        if (text) return text;
      }
    }
    const ariaLabel = section.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    const dataName = section.getAttribute('data-section') || section.getAttribute('data-name');
    if (dataName) return dataName;
  }
  node = img.parentElement;
  while (node && node !== body) {
    if (HEADING_TAGS.includes(node.tagName.toLowerCase())) {
      const text = (node.textContent?.trim() ?? '').replace(/\s+/g, ' ');
      if (text) return text;
    }
    node = node.parentElement;
  }
  return 'Other';
}

function collectAllSectionNames(rawHtml: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const body = doc.body;
  if (!body) return [];

  const sections: string[] = [];
  const seen = new Set<string>();
  const sectionEls = body.querySelectorAll('section, header, main, article, aside');
  let idx = 0;
  for (const el of sectionEls) {
    idx++;
    let label = '';
    for (const htag of HEADING_TAGS) {
      const heading = el.querySelector(htag);
      if (heading) {
        const text = (heading.textContent?.trim() ?? '').replace(/\s+/g, ' ');
        if (text) { label = text; break; }
      }
    }
    if (!label) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) label = ariaLabel;
    }
    if (!label) {
      const dataName = el.getAttribute('data-section') || el.getAttribute('data-name');
      if (dataName) label = dataName;
    }
    if (!label) label = `Section ${idx}`;
    if (!seen.has(label)) {
      seen.add(label);
      sections.push(label);
    }
  }
  return sections;
}

function extractImagesFromSource(source: ImageSourceInput): ImageEntry[] {
  const manifest = extractAssetManifest(source.rawHtml, source.pageUrl);
  const entries: ImageEntry[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(source.rawHtml, 'text/html');
  const body = doc.body;
  if (!body) return entries;

  const urlToSection = new Map<string, string>();
  for (const img of doc.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (!src) continue;
    const absUrl = toAbsolute(src, source.pageUrl);
    if (!urlToSection.has(absUrl)) {
      urlToSection.set(absUrl, getSectionForImage(img, body));
    }
  }

  for (const img of manifest.images) {
    entries.push({
      url: img.url, alt: img.alt, width: img.width, height: img.height,
      section: urlToSection.get(img.url) ?? 'Other',
      isUnsplash: false,
    });
  }

  for (const bgUrl of manifest.background_images) {
    entries.push({
      url: bgUrl, alt: '(background image)', width: null, height: null,
      section: 'Background Images', isUnsplash: false,
    });
  }

  if (manifest.global_assets.logo) {
    entries.unshift({
      url: manifest.global_assets.logo, alt: 'logo', width: null, height: null,
      section: 'Logo', isUnsplash: false,
    });
  }
  if (manifest.global_assets.favicon) {
    entries.push({
      url: manifest.global_assets.favicon, alt: 'favicon', width: null, height: null,
      section: 'Favicon', isUnsplash: false,
    });
  }
  if (manifest.global_assets.og_image) {
    entries.push({
      url: manifest.global_assets.og_image, alt: 'og:image', width: null, height: null,
      section: 'Open Graph Image', isUnsplash: false,
    });
  }

  for (const vid of manifest.videos) {
    if (vid.poster) {
      entries.push({
        url: vid.poster, alt: '(video poster)', width: null, height: null,
        section: 'Videos', isUnsplash: false,
      });
    }
  }

  return entries;
}

/**
 * Build a placeholder image URL for a section that has no real image.
 *
 * Uses a static placeholder service rather than the discontinued Unsplash source URLs,
 * which resolve to nothing and leave the builder emitting <img> tags that never load. A labelled grey box is more useful than a broken image: it
 * renders, it holds the layout open, and it names the section it belongs to so the
 * replacement is obvious.
 */
function buildPlaceholderUrl(section: string): string {
  const label = encodeURIComponent(section.replace(/[()]/g, '').trim().slice(0, 40));
  return `https://placehold.co/1600x900/e8e8e8/8a8a8a?text=${label}`;
}

/**
 * Pull section names out of the user's free-form structure text.
 *
 * Numbered headings ("1. Hero", "4. Diagnóstico Gratuito") are the reliable signal and
 * are preferred. Falls back to short standalone lines that introduce a paragraph, which
 * covers unnumbered documents at the cost of the occasional miss.
 */
export function extractFreeFormSectionNames(freeForm: string): string[] {
  const lines = freeForm.split('\n').map(l => l.trim());

  const numbered: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(\d{1,2})\s*[.)]\s*(.+)$/);
    if (m) {
      const name = m[2].replace(/[:\-–—]\s*$/, '').trim();
      if (name && name.length <= 60) numbered.push(name);
    }
  }
  // Three is enough to trust the numbering rather than the looser fallback.
  if (numbered.length >= 3) return dedupeNames(numbered);

  const bare: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length > 50) continue;
    if (/[.,;:!?]$/.test(line)) continue;
    if (/^[#>*\-[]/.test(line)) continue;
    if (line.split(/\s+/).length > 6) continue;
    const next = lines[i + 1] ?? '';
    if (next.length > 60) bare.push(line);
  }
  return dedupeNames(bare);
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = n.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(n); }
  }
  return out;
}

export function buildImageMarkdown(
  source: ImageSourceInput | null,
  imageSource: ImageSourceMode,
  fillUnsplash: boolean,
  freeFormSectionNames: string[] = [],
): string {
  const allEntries: ImageEntry[] = [];
  let allSectionNames: string[] = [];

  if (source && imageSource !== 'unsplash') {
    allEntries.push(...extractImagesFromSource(source));
    allSectionNames = collectAllSectionNames(source.rawHtml);
  } else if (imageSource === 'unsplash') {
    // The user's own structure wins. The scraped site's sections describe a different
    // page entirely, so they would key placeholders to sections that do not exist here.
    allSectionNames = freeFormSectionNames.length > 0
      ? [...freeFormSectionNames]
      : source
        ? collectAllSectionNames(source.rawHtml)
        : [];
  }

  const sectionOrder: string[] = [];
  const seenInOrder = new Set<string>();
  for (const entry of allEntries) {
    if (!seenInOrder.has(entry.section)) {
      seenInOrder.add(entry.section);
      sectionOrder.push(entry.section);
    }
  }
  for (const sec of allSectionNames) {
    if (!seenInOrder.has(sec)) {
      seenInOrder.add(sec);
      sectionOrder.push(sec);
    }
  }

  const useUnsplash = fillUnsplash || imageSource === 'unsplash';
  if (useUnsplash) {
    const sectionsWithImages = new Set(allEntries.map(e => e.section));
    for (const sec of allSectionNames) {
      if (!sectionsWithImages.has(sec) && !SKIP_SECTIONS_FOR_FILLER.has(sec)) {
        allEntries.push({
          url: buildPlaceholderUrl(sec), alt: `Placeholder — ${sec}`, width: 1600, height: 900,
          section: sec, isUnsplash: true,
        });
      }
    }
  }

  const sectionGroups = new Map<string, ImageEntry[]>();
  for (const entry of allEntries) {
    if (!sectionGroups.has(entry.section)) sectionGroups.set(entry.section, []);
    sectionGroups.get(entry.section)!.push(entry);
  }

  let header: string;
  if (imageSource === 'unsplash') {
    header = `# Imágenes: placeholders genéricos\nNinguna imagen es real. Cada una es un recuadro gris etiquetado con el nombre de su sección.\nReemplázalas todas antes de publicar.\n\nSi una sección tiene varias tarjetas (proyectos, testimonios), reutiliza el mismo placeholder en todas — se reemplazan una por una después.`;
  } else if (source) {
    header = `# Imágenes de: ${source.pageUrl}\nImágenes reales extraídas de la página. Úsalas en las secciones correspondientes.${fillUnsplash ? ' Las marcadas [UNSPLASH] son de relleno genérico, no reales.' : ''}`;
  } else {
    header = `# Imágenes\nSin fuente disponible.`;
  }

  const parts: string[] = [header, ''];
  for (const section of sectionOrder) {
    const group = sectionGroups.get(section);
    if (!group || group.length === 0) continue;
    parts.push(`## ${section}`);
    parts.push('');
    for (const entry of group) {
      const dims = entry.width && entry.height ? ` — ${entry.width}×${entry.height}` : '';
      const altStr = entry.alt ? ` — alt: "${entry.alt}"` : '';
      const unsplashTag = entry.isUnsplash ? ' — [PLACEHOLDER — reemplazar antes de publicar]' : '';
      parts.push(`- ${entry.url}${altStr}${dims}${unsplashTag}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
