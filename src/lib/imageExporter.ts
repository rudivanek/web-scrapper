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

function buildUnsplashUrl(query: string): string {
  const encoded = encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'));
  return `https://source.unsplash.com/1600x900/?${encoded}`;
}

export function buildImageMarkdown(
  source: ImageSourceInput | null,
  imageSource: ImageSourceMode,
  fillUnsplash: boolean,
): string {
  const allEntries: ImageEntry[] = [];
  let allSectionNames: string[] = [];

  if (source && imageSource !== 'unsplash') {
    allEntries.push(...extractImagesFromSource(source));
    allSectionNames = collectAllSectionNames(source.rawHtml);
  } else if (source && imageSource === 'unsplash') {
    allSectionNames = collectAllSectionNames(source.rawHtml);
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
          url: buildUnsplashUrl(sec), alt: '', width: null, height: null,
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
    header = `# Imágenes de: Unsplash (genéricas)\nTodas las imágenes son de relleno genérico de Unsplash. Reemplázalas con imágenes reales antes de publicar.`;
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
      const unsplashTag = entry.isUnsplash ? ' — [UNSPLASH — relleno genérico, reemplazar]' : '';
      parts.push(`- ${entry.url}${altStr}${dims}${unsplashTag}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
