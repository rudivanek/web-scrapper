export interface SeoMetadata {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  canonicalUrl: string;
}

function textFromTag(html: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) results.push(text);
  }
  return results;
}

function metaContent(html: string, attr: string, value: string): string {
  const re = new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${value}["']`, 'i');
  return (re.exec(html)?.[1] || re2.exec(html)?.[1] || '').trim();
}

function linkHref(html: string, rel: string): string {
  const re = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*href=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<link[^>]+href=["']([^"']*)["'][^>]+rel=["']${rel}["']`, 'i');
  return (re.exec(html)?.[1] || re2.exec(html)?.[1] || '').trim();
}

function extractMetaFromRaw(rawHtml: string): Pick<SeoMetadata, 'metaTitle' | 'metaDescription' | 'ogTitle' | 'ogDescription' | 'canonicalUrl'> {
  const NOT_FOUND = 'NOT FOUND';

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(rawHtml);
  const metaTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() || NOT_FOUND : NOT_FOUND;

  const metaDescription = metaContent(rawHtml, 'name', 'description') || NOT_FOUND;
  const ogTitle = metaContent(rawHtml, 'property', 'og:title') || NOT_FOUND;
  const ogDescription = metaContent(rawHtml, 'property', 'og:description') || NOT_FOUND;
  const canonicalUrl = linkHref(rawHtml, 'canonical') || NOT_FOUND;

  return { metaTitle, metaDescription, ogTitle, ogDescription, canonicalUrl };
}

export function extractSeoMetadata(html: string, rawHtml: string): SeoMetadata {
  const { metaTitle, metaDescription, ogTitle, ogDescription, canonicalUrl } = extractMetaFromRaw(rawHtml || html);

  let h1Tags: string[] = [];
  let h2Tags: string[] = [];
  let h3Tags: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    h1Tags = Array.from(doc.querySelectorAll('h1')).map(h => h.textContent?.trim() || '').filter(Boolean);
    h2Tags = Array.from(doc.querySelectorAll('h2')).map(h => h.textContent?.trim() || '').filter(Boolean);
    h3Tags = Array.from(doc.querySelectorAll('h3')).map(h => h.textContent?.trim() || '').filter(Boolean);
  } catch {
    h1Tags = textFromTag(html, 'h1');
    h2Tags = textFromTag(html, 'h2');
    h3Tags = textFromTag(html, 'h3');
  }

  if (!h1Tags.length) h1Tags = textFromTag(html, 'h1');
  if (!h2Tags.length) h2Tags = textFromTag(html, 'h2');
  if (!h3Tags.length) h3Tags = textFromTag(html, 'h3');

  return { metaTitle, metaDescription, ogTitle, ogDescription, h1Tags, h2Tags, h3Tags, canonicalUrl };
}

export function buildSeoMetadataBlock(meta: SeoMetadata): string {
  const lines: string[] = [
    '=== SEO METADATA (extracted from HTML) ===',
    `Meta Title: ${meta.metaTitle}`,
    `Meta Description: ${meta.metaDescription}`,
    `OG Title: ${meta.ogTitle}`,
    `OG Description: ${meta.ogDescription}`,
    `Canonical URL: ${meta.canonicalUrl}`,
    '',
    'Heading Structure:',
    ...(meta.h1Tags.length > 0 ? meta.h1Tags.map(h => `H1: ${h}`) : ['H1: NOT FOUND']),
    ...(meta.h2Tags.length > 0 ? meta.h2Tags.slice(0, 12).map(h => `H2: ${h}`) : ['H2: NOT FOUND']),
    ...(meta.h3Tags.length > 0 ? meta.h3Tags.slice(0, 8).map(h => `H3: ${h}`) : ['H3: NOT FOUND']),
    '=== END SEO METADATA ===',
    '',
  ];
  return lines.join('\n');
}

export interface ExtractedMetaTags {
  title: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonical: string;
  robots: string;
  viewport: string;
  charset: string;
  schemaTypes: string[];
}

export interface ExtractedImage {
  src: string;
  alt: string;
  hasAlt: boolean;
}

export interface ExtractedHeadings {
  h1: string[];
  h2: string[];
  h3: string[];
}

export function extractMetaTags(html: string): ExtractedMetaTags {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const schemaTypes: string[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try {
      const parsed = JSON.parse(s.textContent || '');
      if (parsed['@type']) {
        schemaTypes.push(parsed['@type']);
      } else if (Array.isArray(parsed)) {
        parsed.forEach(item => { if (item?.['@type']) schemaTypes.push(item['@type']); });
      } else if (parsed['@graph']) {
        parsed['@graph'].forEach((item: any) => { if (item?.['@type']) schemaTypes.push(item['@type']); });
      }
    } catch {}
  });

  return {
    title: doc.querySelector('title')?.textContent?.trim() || '',
    metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    metaKeywords: doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
    ogTitle: doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
    ogDescription: doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
    ogImage: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    robots: doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
    viewport: doc.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
    charset: doc.querySelector('meta[charset]')?.getAttribute('charset') || '',
    schemaTypes: [...new Set(schemaTypes)],
  };
}

export function extractImages(html: string): ExtractedImage[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('img')).map(img => ({
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || '',
    hasAlt: img.hasAttribute('alt') && (img.getAttribute('alt') || '').trim() !== '',
  }));
}

export function extractHeadings(html: string): ExtractedHeadings {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return {
    h1: Array.from(doc.querySelectorAll('h1')).map(h => h.textContent?.trim() || '').filter(Boolean),
    h2: Array.from(doc.querySelectorAll('h2')).map(h => h.textContent?.trim() || '').filter(Boolean),
    h3: Array.from(doc.querySelectorAll('h3')).map(h => h.textContent?.trim() || '').filter(Boolean),
  };
}
