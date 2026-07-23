// HTML pre-processing pipeline for LLM design extraction

const FONT_CDN_PATTERNS = [
  /https?:\/\/fonts\.googleapis\.com\/css2?[^\s"']*/g,
  /https?:\/\/fonts\.bunny\.net\/css[^\s"']*/g,
  /https?:\/\/use\.typekit\.net\/[^\s"']*/g,
];

export interface HtmlPreprocessResult {
  cleanedHtml: string;
  detectedFontUrls: string[];
  cssBlocks: string[];
  inlineStyles: string[];
}

export function preprocessHtml(rawHtml: string): HtmlPreprocessResult {
  // Step 1: Detect font CDN URLs
  const detectedFontUrls: string[] = [];
  for (const pattern of FONT_CDN_PATTERNS) {
    const matches = rawHtml.match(pattern) || [];
    for (const m of matches) {
      if (!detectedFontUrls.includes(m)) detectedFontUrls.push(m);
    }
  }

  // Step 4: Extract CSS blocks from the original HTML (before cleaning)
  const cssBlocks: string[] = [];
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagRegex.exec(rawHtml)) !== null && cssBlocks.length < 5) {
    const content = styleMatch[1].trim();
    if (content) cssBlocks.push(content);
  }

  const inlineStyles: string[] = [];
  const inlineStyleRegex = /style="([^"]*)"/gi;
  let inlineMatch;
  while ((inlineMatch = inlineStyleRegex.exec(rawHtml)) !== null && inlineStyles.length < 50) {
    const val = inlineMatch[1].trim();
    if (val) inlineStyles.push(val);
  }

  // Replace font <link> tags with placeholders so they survive stripping
  const fontLinkPlaceholders: string[] = [];
  let html = rawHtml.replace(
    /<link[^>]+(?:fonts\.googleapis\.com|fonts\.bunny\.net|use\.typekit\.net)[^>]*>/gi,
    (match) => {
      const idx = fontLinkPlaceholders.length;
      fontLinkPlaceholders.push(match);
      return `__FONT_LINK_${idx}__`;
    }
  );

  // Inject detected font URLs as a comment at the top
  if (detectedFontUrls.length > 0) {
    html = `<!-- DETECTED FONT URLS: ${detectedFontUrls.join(', ')} -->\n` + html;
  }

  // Step 2: Strip noise
  // Remove <script> blocks
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove <style> blocks
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove HTML comments (but not our injected font comment)
  html = html.replace(/<!--(?![\s\S]*?DETECTED FONT URLS)[\s\S]*?-->/g, '');
  // Remove class attributes
  html = html.replace(/\s+class=["'][^"']*["']/gi, '');
  // Remove data-* attributes
  html = html.replace(/\s+data-[\w-]+=["'][^"']*["']/gi, '');
  // Remove aria-* attributes
  html = html.replace(/\s+aria-[\w-]+=["'][^"']*["']/gi, '');
  // Remove id attributes (except anchor-containing ones)
  html = html.replace(/\s+id=["'](?!.*anchor)[^"']*["']/gi, '');
  // Collapse whitespace
  html = html.replace(/\s{2,}/g, ' ');

  // Step 3: Restore font link tags
  fontLinkPlaceholders.forEach((tag, idx) => {
    html = html.replace(`__FONT_LINK_${idx}__`, tag);
  });

  // Step 5: Truncate if needed
  const MAX = 80000;
  const KEEP_HEAD = 60000;
  const KEEP_TAIL = 20000;
  if (html.length > MAX) {
    html =
      html.slice(0, KEEP_HEAD) +
      '\n\n<!-- ... middle content truncated ... -->\n\n' +
      html.slice(html.length - KEEP_TAIL);
  }

  return {
    cleanedHtml: html,
    detectedFontUrls,
    cssBlocks,
    inlineStyles,
  };
}
