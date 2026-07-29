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
