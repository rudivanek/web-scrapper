const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'canvas', 'iframe', 'template', 'link', 'meta']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const NAV_TAGS = new Set(['nav']);
const FOOTER_TAGS = new Set(['footer']);
const SECTION_TAGS = new Set(['section', 'header', 'main', 'article', 'aside']);

function isAriaHidden(el: Element): boolean {
  return el.getAttribute('aria-hidden') === 'true';
}

function isCookieBanner(el: Element): boolean {
  const id = (el.id || '').toLowerCase();
  const cls = el.getAttribute('class')?.toLowerCase() ?? '';
  return /cookie|gdpr|consent|privacy-banner|cookie-banner/.test(id) ||
         /cookie|gdpr|consent|privacy-banner/.test(cls);
}

function isPureIconLink(el: Element): boolean {
  if (el.tagName !== 'A') return false;
  const text = el.textContent?.trim() ?? '';
  if (text.length > 0) return false;
  return el.querySelectorAll('img, svg').length > 0;
}

function isButtonLike(el: Element): boolean {
  if (el.tagName === 'BUTTON') return true;
  if (el.getAttribute('role') === 'button') return true;
  const cls = el.getAttribute('class')?.toLowerCase() ?? '';
  return /btn|button/.test(cls) && el.tagName === 'A';
}

function getVisibleText(el: Element): string {
  return (el.textContent?.trim() ?? '').replace(/\s+/g, ' ');
}

function getDirectText(el: Element): string | null {
  let text = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) {
      text += node.textContent || '';
    }
  }
  text = text.trim().replace(/\s+/g, ' ');
  return text || null;
}

function shouldSkipElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return SKIP_TAGS.has(tag) || isAriaHidden(el) || isCookieBanner(el) || isPureIconLink(el);
}

function getSectionLabel(section: Element, index: number): string {
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    const heading = section.querySelector(tag);
    if (heading) {
      const text = getVisibleText(heading);
      if (text) return text;
    }
  }
  const ariaLabel = section.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  const dataName = section.getAttribute('data-section') || section.getAttribute('data-name');
  if (dataName) return dataName;
  return `Section ${index}`;
}

function extractTextFromElement(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  if (HEADING_TAGS.has(tag)) {
    const text = getVisibleText(el);
    return text ? `${'#'.repeat(parseInt(tag[1]))} ${text}` : null;
  }
  if (isButtonLike(el)) {
    const text = getVisibleText(el);
    return text ? `Button: ${text}` : null;
  }
  if (tag === 'p') {
    const text = getVisibleText(el);
    return text || null;
  }
  if (tag === 'li') {
    const text = getVisibleText(el);
    return text ? `- ${text}` : null;
  }
  if (tag === 'blockquote') {
    const text = getVisibleText(el);
    return text ? `> ${text}` : null;
  }
  return null;
}

function collectAllText(el: Element): string[] {
  const lines: string[] = [];
  function walk(e: Element) {
    if (shouldSkipElement(e)) return;
    const tag = e.tagName.toLowerCase();
    const extracted = extractTextFromElement(e);
    if (extracted) {
      lines.push(extracted);
      if (HEADING_TAGS.has(tag) || tag === 'p' || tag === 'li' || tag === 'blockquote' || isButtonLike(e)) {
        return;
      }
    }
    if (!extracted) {
      const direct = getDirectText(e);
      if (direct) lines.push(direct);
    }
    for (const child of Array.from(e.children)) {
      walk(child);
    }
  }
  walk(el);
  return lines;
}

export function buildCopyMarkdown(rawHtml: string, pageUrl: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const body = doc.body;

  const header = `# Copy — ${pageUrl}\nTodo el texto visible de la página, en orden. Úsalo tal cual; no lo reescribas.`;

  if (!body || !rawHtml.trim()) {
    return `${header}\n\n(No se pudo extraer texto de la página.)`;
  }

  interface TextItem {
    text: string;
    section: Element | null;
    isNav: boolean;
    isFooter: boolean;
  }

  const items: TextItem[] = [];
  const seenSections = new Map<Element, number>();
  let sectionOrder = 0;

  function getAncestorInfo(el: Element): { section: Element | null; isNav: boolean; isFooter: boolean } {
    let section: Element | null = null;
    let isNav = false;
    let isFooter = false;
    let node: Element | null = el.parentElement;
    while (node && node !== body) {
      const tag = node.tagName.toLowerCase();
      if (!section && SECTION_TAGS.has(tag)) section = node;
      if (NAV_TAGS.has(tag)) isNav = true;
      if (FOOTER_TAGS.has(tag)) isFooter = true;
      node = node.parentElement;
    }
    return { section, isNav, isFooter };
  }

  function walk(el: Element) {
    if (shouldSkipElement(el)) return;
    const tag = el.tagName.toLowerCase();
    if (NAV_TAGS.has(tag) || FOOTER_TAGS.has(tag)) return;

    const extracted = extractTextFromElement(el);
    if (extracted) {
      const info = getAncestorInfo(el);
      items.push({ text: extracted, section: info.section, isNav: info.isNav, isFooter: info.isFooter });
      if (info.section && !seenSections.has(info.section)) {
        seenSections.set(info.section, sectionOrder++);
      }
      if (HEADING_TAGS.has(tag) || tag === 'p' || tag === 'li' || tag === 'blockquote' || isButtonLike(el)) {
        return;
      }
    }

    if (!extracted) {
      const direct = getDirectText(el);
      if (direct) {
        const info = getAncestorInfo(el);
        items.push({ text: direct, section: info.section, isNav: info.isNav, isFooter: info.isFooter });
        if (info.section && !seenSections.has(info.section)) {
          seenSections.set(info.section, sectionOrder++);
        }
      }
    }

    for (const child of Array.from(el.children)) {
      walk(child);
    }
  }

  walk(body);

  const navLines: string[] = [];
  const footerLines: string[] = [];
  for (const nav of body.querySelectorAll('nav')) {
    if (shouldSkipElement(nav)) continue;
    navLines.push(...collectAllText(nav));
  }
  for (const footer of body.querySelectorAll('footer')) {
    if (shouldSkipElement(footer)) continue;
    footerLines.push(...collectAllText(footer));
  }

  const sectionGroups = new Map<Element, string[]>();
  const orphanLines: string[] = [];
  for (const item of items) {
    if (item.isNav || item.isFooter) continue;
    if (item.section) {
      if (!sectionGroups.has(item.section)) {
        sectionGroups.set(item.section, []);
      }
      sectionGroups.get(item.section)!.push(item.text);
    } else {
      orphanLines.push(item.text);
    }
  }

  const parts: string[] = [header, ''];
  const sortedSections = Array.from(seenSections.entries())
    .sort((a, b) => a[1] - b[1])
    .map(e => e[0]);

  if (sortedSections.length > 0) {
    let idx = 0;
    for (const sec of sortedSections) {
      const lines = sectionGroups.get(sec);
      if (!lines || lines.length === 0) continue;
      idx++;
      const label = getSectionLabel(sec, idx);
      parts.push(`## ${label}`);
      parts.push('');
      parts.push(...lines);
      parts.push('');
    }
  }

  if (orphanLines.length > 0) {
    if (sortedSections.length > 0) {
      parts.push('## Other');
      parts.push('');
    }
    parts.push(...orphanLines);
    parts.push('');
  }

  if (navLines.length > 0) {
    parts.push('## Navigation');
    parts.push('');
    parts.push(...navLines);
    parts.push('');
  }

  if (footerLines.length > 0) {
    parts.push('## Footer');
    parts.push('');
    parts.push(...footerLines);
    parts.push('');
  }

  return parts.join('\n');
}

// ─── Lorem Ipsum mode ──────────────────────────────────────────────────────────

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'vivamus', 'vestibulum',
  'sapien', 'euismod', 'praesent', 'vitae', 'luctus', 'metus', 'aenean',
  'ultricies', 'purus', 'quam', 'cras', 'auctor', 'integer', 'feugiat',
  'placerat', 'nibh', 'phasellus', 'suspendisse', 'potenti', 'donec',
  'mauris', 'posuere', 'imperdiet', 'curabitur', 'natoque', 'penatibus',
];

const LOREM_SENTENCES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Vivamus vestibulum sapien euismod praesent vitae luctus metus aenean ultricies purus quam.',
  'Cras auctor integer feugiat placerat nibh phasellus suspendisse potenti.',
  'Donec mauris posuere imperdiet curabitur natoque penatibus et magnis dis parturient montes.',
];

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function pickWords(rng: () => number, count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(LOREM_WORDS[Math.floor(rng() * LOREM_WORDS.length)]);
  }
  return words.join(' ');
}

function titleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function generateLoremForElement(el: Element, originalText: string, rng: () => number): string | null {
  const tag = el.tagName.toLowerCase();
  const wordCount = originalText.split(/\s+/).filter(Boolean).length;

  if (tag === 'h1') {
    return `${'#'.repeat(1)} ${pickWords(rng, 3 + Math.floor(rng() * 4))}`;
  }
  if (tag === 'h2') {
    return `${'#'.repeat(2)} ${pickWords(rng, 3 + Math.floor(rng() * 6))}`;
  }
  if (HEADING_TAGS.has(tag)) {
    const level = parseInt(tag[1]);
    return `${'#'.repeat(level)} ${pickWords(rng, 2 + Math.floor(rng() * 4))}`;
  }
  if (isButtonLike(el)) {
    const label = titleCase(pickWords(rng, 1 + Math.floor(rng() * 2)));
    return `Button: ${label}`;
  }
  if (tag === 'p') {
    let sentences: number;
    if (wordCount <= 10) sentences = 1;
    else if (wordCount <= 30) sentences = 2;
    else sentences = 3;
    const parts: string[] = [];
    for (let i = 0; i < sentences; i++) {
      parts.push(LOREM_SENTENCES[Math.floor(rng() * LOREM_SENTENCES.length)]);
    }
    return parts.join(' ');
  }
  if (tag === 'li') {
    return `- ${pickWords(rng, 2 + Math.floor(rng() * 3))}`;
  }
  if (tag === 'blockquote') {
    return `> ${LOREM_SENTENCES[Math.floor(rng() * LOREM_SENTENCES.length)]}`;
  }
  return null;
}

export function buildCopyMarkdownLorem(rawHtml: string, pageUrl: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const body = doc.body;

  const header = `# Copy — TEXTO DE RELLENO (Lorem Ipsum)\nEste texto es de relleno, NO es contenido real. Reemplázalo con copy definitivo antes de publicar. La estructura y longitud imitan una página real.`;

  if (!body || !rawHtml.trim()) {
    return `${header}\n\n(No se pudo extraer la estructura de la página.)`;
  }

  const seed = hashString(pageUrl);
  const rng = seededRandom(seed);

  interface TextItem {
    text: string;
    section: Element | null;
    isNav: boolean;
    isFooter: boolean;
  }

  const items: TextItem[] = [];
  const seenSections = new Map<Element, number>();
  let sectionOrder = 0;

  function getAncestorInfo(el: Element): { section: Element | null; isNav: boolean; isFooter: boolean } {
    let section: Element | null = null;
    let isNav = false;
    let isFooter = false;
    let node: Element | null = el.parentElement;
    while (node && node !== body) {
      const tag = node.tagName.toLowerCase();
      if (!section && SECTION_TAGS.has(tag)) section = node;
      if (NAV_TAGS.has(tag)) isNav = true;
      if (FOOTER_TAGS.has(tag)) isFooter = true;
      node = node.parentElement;
    }
    return { section, isNav, isFooter };
  }

  function walk(el: Element) {
    if (shouldSkipElement(el)) return;
    const tag = el.tagName.toLowerCase();
    if (NAV_TAGS.has(tag) || FOOTER_TAGS.has(tag)) return;

    const originalText = getVisibleText(el);
    if (originalText) {
      const lorem = generateLoremForElement(el, originalText, rng);
      if (lorem) {
        const info = getAncestorInfo(el);
        items.push({ text: lorem, section: info.section, isNav: info.isNav, isFooter: info.isFooter });
        if (info.section && !seenSections.has(info.section)) {
          seenSections.set(info.section, sectionOrder++);
        }
        if (HEADING_TAGS.has(tag) || tag === 'p' || tag === 'li' || tag === 'blockquote' || isButtonLike(el)) {
          return;
        }
      }
    }

    if (originalText) {
      const direct = getDirectText(el);
      if (direct) {
        const lorem = pickWords(rng, 2 + Math.floor(rng() * 4));
        const info = getAncestorInfo(el);
        items.push({ text: lorem, section: info.section, isNav: info.isNav, isFooter: info.isFooter });
        if (info.section && !seenSections.has(info.section)) {
          seenSections.set(info.section, sectionOrder++);
        }
      }
    }

    for (const child of Array.from(el.children)) {
      walk(child);
    }
  }

  walk(body);

  const navLines: string[] = [];
  const footerLines: string[] = [];
  for (const nav of body.querySelectorAll('nav')) {
    if (shouldSkipElement(nav)) continue;
    for (const el of nav.querySelectorAll('a, button, [role="button"]')) {
      const text = getVisibleText(el);
      if (text) {
        const lorem = isButtonLike(el) ? titleCase(pickWords(rng, 1 + Math.floor(rng() * 2))) : pickWords(rng, 1 + Math.floor(rng() * 2));
        navLines.push(lorem);
      }
    }
  }
  for (const footer of body.querySelectorAll('footer')) {
    if (shouldSkipElement(footer)) continue;
    for (const el of footer.querySelectorAll('a, button, p, li, h1, h2, h3, h4, h5, h6')) {
      const text = getVisibleText(el);
      if (text) {
        const lorem = generateLoremForElement(el, text, rng);
        if (lorem) footerLines.push(lorem);
      }
    }
  }

  const sectionGroups = new Map<Element, string[]>();
  const orphanLines: string[] = [];
  for (const item of items) {
    if (item.isNav || item.isFooter) continue;
    if (item.section) {
      if (!sectionGroups.has(item.section)) {
        sectionGroups.set(item.section, []);
      }
      sectionGroups.get(item.section)!.push(item.text);
    } else {
      orphanLines.push(item.text);
    }
  }

  const parts: string[] = [header, ''];
  const sortedSections = Array.from(seenSections.entries())
    .sort((a, b) => a[1] - b[1])
    .map(e => e[0]);

  if (sortedSections.length > 0) {
    let idx = 0;
    for (const sec of sortedSections) {
      const lines = sectionGroups.get(sec);
      if (!lines || lines.length === 0) continue;
      idx++;
      const label = getSectionLabel(sec, idx);
      parts.push(`## ${label}`);
      parts.push('');
      parts.push(...lines);
      parts.push('');
    }
  }

  if (orphanLines.length > 0) {
    if (sortedSections.length > 0) {
      parts.push('## Other');
      parts.push('');
    }
    parts.push(...orphanLines);
    parts.push('');
  }

  if (navLines.length > 0) {
    parts.push('## Navigation');
    parts.push('');
    parts.push(...navLines);
    parts.push('');
  }

  if (footerLines.length > 0) {
    parts.push('## Footer');
    parts.push('');
    parts.push(...footerLines);
    parts.push('');
  }

  return parts.join('\n');
}

export { buildCopyMarkdown, buildCopyMarkdownLorem }