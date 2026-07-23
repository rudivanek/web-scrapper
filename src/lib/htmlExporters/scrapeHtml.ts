import type { ExtractedMetaTags, ExtractedHeadings } from '../htmlExtract';
import { SHARED_CSS, htmlEscape, triggerHtmlDownload, fileDate, formatDate } from './shared';

interface ScrapedDataForExport {
  url: string;
  markdown: string;
  title?: string;
  wordCount: number;
  metaTags?: ExtractedMetaTags;
  headings?: ExtractedHeadings;
}

const NOISE_PATTERNS = [
  /política\s+de\s+privacidad/i,
  /aceptar\s+y\s+cerrar/i,
  /elementor-action/i,
  /cookie/i,
];
const BARE_LINK_RE = /^\s*\[([^\]]*)\]\([^)]+\)\s*$/;
const EQUALS_LINE_RE = /^={3,}/;

function filterMarkdownNoise(md: string): string {
  return md
    .split('\n')
    .filter(line => {
      if (BARE_LINK_RE.test(line)) return false;
      if (EQUALS_LINE_RE.test(line.trim())) return false;
      for (const pat of NOISE_PATTERNS) {
        if (pat.test(line)) return false;
      }
      return true;
    })
    .join('\n');
}

function inlineMarkdown(text: string): string {
  return htmlEscape(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#1e40af;text-decoration:underline;">$1</a>');
}

export function markdownToHtml(md: string): string {
  const lines = filterMarkdownNoise(md).split('\n');
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (/^### /.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }
    if (/^## /.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    if (/^# /.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }
    if (/^[-*] /.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }
    if (line.trim() === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    out.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function buildMetaRow(label: string, value: string | null | undefined): string {
  if (!value || value.trim() === '') return '';
  return `<tr>
    <td style="width:170px;font-weight:600;color:#374151;white-space:nowrap;">${htmlEscape(label)}</td>
    <td style="color:#111;word-break:break-word;">${htmlEscape(value)}</td>
  </tr>`;
}

function buildSchemaChips(types: string[]): string {
  if (!types || types.length === 0) return '';
  const chips = types.map(t =>
    `<span style="display:inline-block;padding:2px 10px;background:#f0f4ff;border:1px solid #c7d7f8;border-radius:20px;font-size:12px;color:#1e40af;margin:2px 3px;">${htmlEscape(t)}</span>`
  ).join('');
  return `<tr>
    <td style="width:170px;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top;padding-top:10px;">Schema markup</td>
    <td style="padding-top:8px;">${chips}</td>
  </tr>`;
}

function buildHeadingsList(headings: ExtractedHeadings | undefined): string {
  if (!headings) return '<p style="color:#888;font-size:13px;">No se encontraron encabezados.</p>';
  const items: string[] = [];

  for (const h of headings.h1) {
    items.push(`<div style="font-size:15px;font-weight:700;color:#111;padding:5px 0 5px 0;border-left:3px solid #111;padding-left:10px;margin:4px 0;">${htmlEscape(h)}</div>`);
  }
  for (const h of headings.h2) {
    items.push(`<div style="font-size:14px;font-weight:600;color:#374151;padding:4px 0 4px 22px;border-left:3px solid #9ca3af;margin:3px 0;">${htmlEscape(h)}</div>`);
  }
  for (const h of headings.h3) {
    items.push(`<div style="font-size:13px;color:#6b7280;padding:3px 0 3px 44px;border-left:2px solid #d1d5db;margin:2px 0;">${htmlEscape(h)}</div>`);
  }

  return items.length > 0
    ? items.join('\n')
    : '<p style="color:#888;font-size:13px;">No se encontraron encabezados.</p>';
}

const SCRAPE_CSS = `
.scrape-section { margin: 36px 0; }
.scrape-section-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7280;
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 8px;
  margin-bottom: 14px;
}
.meta-table { width:100%; border-collapse:collapse; }
.meta-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 14px; }
.meta-table tr:last-child td { border-bottom: none; }
.markdown-content h1 { font-size: 22px; font-weight: 700; margin: 24px 0 8px; color: #111; }
.markdown-content h2 { font-size: 17px; font-weight: 600; margin: 20px 0 6px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; color: #111; }
.markdown-content h3 { font-size: 14px; font-weight: 600; margin: 16px 0 4px; color: #222; }
.markdown-content p { margin: 8px 0; font-size: 14px; color: #333; line-height: 1.65; }
.markdown-content ul { margin: 8px 0 8px 20px; }
.markdown-content li { font-size: 14px; color: #333; margin: 3px 0; }
.markdown-content strong { font-weight: 700; color: #111; }
.markdown-content em { font-style: italic; color: #374151; }
.markdown-content code { background: #f4f4f4; padding: 1px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; }
.info-bar {
  display: flex;
  gap: 24px;
  background: #f9fafb;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 16px 20px;
  margin: 24px 0;
  flex-wrap: wrap;
}
.info-bar-item { font-size: 13px; color: #555; }
.info-bar-item strong { color: #111; font-weight: 600; }
details summary { cursor: pointer; font-size: 13px; font-weight: 600; color: #374151; padding: 6px 0; user-select: none; }
@media print {
  details { display: block !important; }
  details summary { display: none !important; }
}
`;

export function exportScrapeToHtml(data: ScrapedDataForExport, brandName: string): void {
  const date = formatDate();
  const slug = (brandName || 'extraccion').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const metaRows = [
    buildMetaRow('Título', data.metaTags?.title),
    buildMetaRow('Meta description', data.metaTags?.metaDescription),
    buildMetaRow('OG Title', data.metaTags?.ogTitle),
    buildMetaRow('OG Description', data.metaTags?.ogDescription),
    buildMetaRow('OG Image', data.metaTags?.ogImage),
    buildMetaRow('Canonical', data.metaTags?.canonical),
    buildMetaRow('Robots', data.metaTags?.robots),
    buildSchemaChips(data.metaTags?.schemaTypes || []),
  ].filter(Boolean).join('');

  const hasMetaTags = metaRows.trim() !== '';

  const headingsHtml = buildHeadingsList(data.headings);
  const markdownHtml = markdownToHtml(data.markdown);

  const body = `
<div class="info-bar">
  <div class="info-bar-item"><strong>URL analizada:</strong><br><span style="word-break:break-all;">${htmlEscape(data.url)}</span></div>
  <div class="info-bar-item"><strong>Fecha:</strong><br>${date}</div>
  <div class="info-bar-item"><strong>Palabras:</strong><br>${data.wordCount.toLocaleString()}</div>
  <div class="info-bar-item"><strong>Formato extraído:</strong><br>Markdown</div>
</div>

${hasMetaTags ? `<div class="scrape-section">
  <div class="scrape-section-title">Meta tags</div>
  <table class="meta-table">
    <tbody>${metaRows}</tbody>
  </table>
</div>` : ''}

<div class="scrape-section">
  <div class="scrape-section-title">Estructura de encabezados</div>
  ${headingsHtml}
</div>

<div class="scrape-section">
  <div class="scrape-section-title">Contenido extraído</div>
  <details>
    <summary>Ver contenido extraído</summary>
    <div class="markdown-content" style="margin-top:12px;max-height:480px;overflow-y:auto;">${markdownHtml}</div>
  </details>
</div>
`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extracción — ${htmlEscape(brandName)}</title>
  <style>${SHARED_CSS}${SCRAPE_CSS}</style>
</head>
<body>
<header>
  <div class="header-brand">Sharpen.Studio</div>
  <div class="header-meta">
    <span>Extracción de página — ${htmlEscape(data.url)}</span><br>
    <span>Generado: ${date}</span>
  </div>
</header>
<div class="content-wrap">
${body}
<footer>
  <span>Sharpen.Studio · sharpen.studio</span>
  <span>Diagnóstico generado automáticamente — uso confidencial</span>
</footer>
</div>
</body>
</html>`;

  triggerHtmlDownload(html, `extraccion-${slug}-${fileDate()}.html`);
}
