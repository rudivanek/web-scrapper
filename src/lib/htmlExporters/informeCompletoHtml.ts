import type { AuditResult, SEOAuditResult } from '../../types/audit';
import type { CopyAnalysisResult } from '../../types/copyAnalysis';
import type { ExtractedMetaTags, ExtractedHeadings } from '../htmlExtract';
import { SHARED_CSS, htmlEscape, triggerHtmlDownload, fileDate, formatDate } from './shared';
import { buildCROAuditHtmlBody } from './croHtml';
import { buildSEOAuditHtmlBody } from './seoHtml';
import { buildCopyAnalysisHtmlBody } from './copyHtml';
import { buildCopyZapHtmlBody } from './copyzapHtml';
import { markdownToHtml } from './scrapeHtml';

interface ScrapedDataForReport {
  url: string;
  markdown: string;
  title?: string;
  wordCount: number;
  metaTags?: ExtractedMetaTags;
  headings?: ExtractedHeadings;
}

type SourceTag = 'CRO' | 'SEO' | 'Copy';
type Priority = 'Alta' | 'Media';

interface PromptCard {
  id: string;
  label: string;
  priority: Priority;
  sources: SourceTag[];
  promptText: string;
  combinedText?: string;
}

const DISCLAIMER_CSS = `
.disclaimer-banner {
  background: #f9f6f0;
  border-left: 4px solid #c8a96e;
  color: #555;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px 20px;
  margin: 0;
}
.disclaimer-banner strong {
  color: #333;
}
`;

const DISCLAIMER_HTML = `<div class="disclaimer-banner"><strong>Criterio de uso:</strong> Este reporte combina observaciones objetivas del contenido extraído con interpretación estratégica. Por ello, sus hallazgos y recomendaciones deben entenderse como insumos de análisis para apoyar decisiones de negocio, no como juicios absolutos. La validación final siempre debe considerar contexto, mercado, oferta y objetivos comerciales.</div>`;

const TAB_CSS = `
.tab-nav {
  position: sticky;
  top: 52px;
  z-index: 9;
  background: #fff;
  border-bottom: 2px solid #e5e5e5;
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}
.tab-nav::-webkit-scrollbar { display: none; }
.tab-btn {
  flex: 1;
  min-width: 160px;
  padding: 13px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-bottom-color 0.15s;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
}
.tab-btn.active { color: #111; border-bottom-color: #111; }
.tab-btn:hover:not(.active) { color: #374151; background: #f9fafb; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }
@media print {
  .tab-nav { display: none !important; }
  .tab-panel { display: block !important; }
  .tab-panel + .tab-panel { page-break-before: always; }
  details { display: block !important; }
  details summary { display: none !important; }
}
`;

function buildMetaTagRow(label: string, value: string | null | undefined): string {
  if (!value || value.trim() === '') return '';
  return `<div style="margin:5px 0;font-size:13px;"><span style="font-weight:600;color:#374151;">${htmlEscape(label)}:</span> <span style="color:#111;word-break:break-word;">${htmlEscape(value)}</span></div>`;
}

function buildSchemaChipsInline(types: string[]): string {
  if (!types || types.length === 0) return '';
  const chips = types.map(t =>
    `<span style="display:inline-block;padding:1px 8px;background:#f0f4ff;border:1px solid #c7d7f8;border-radius:12px;font-size:11px;color:#1e40af;margin:1px 2px;">${htmlEscape(t)}</span>`
  ).join('');
  return `<div style="margin:5px 0;font-size:13px;"><span style="font-weight:600;color:#374151;">Schema markup:</span> ${chips}</div>`;
}

function buildFirecrawlBlock(data: ScrapedDataForReport, date: string): string {
  const metaLeft = [
    buildMetaTagRow('Título', data.metaTags?.title),
    buildMetaTagRow('Meta description', data.metaTags?.metaDescription),
    buildMetaTagRow('Canonical', data.metaTags?.canonical),
    buildMetaTagRow('OG Title', data.metaTags?.ogTitle),
    buildMetaTagRow('OG Description', data.metaTags?.ogDescription),
    buildMetaTagRow('Robots', data.metaTags?.robots),
    buildSchemaChipsInline(data.metaTags?.schemaTypes || []),
  ].filter(Boolean).join('');

  const headings = data.headings;
  const headingItems: string[] = [];
  if (headings) {
    for (const h of headings.h1) {
      headingItems.push(`<div style="font-size:13px;font-weight:700;color:#111;padding:3px 0 3px 8px;border-left:3px solid #111;margin:3px 0;">${htmlEscape(h)}</div>`);
    }
    for (const h of headings.h2) {
      headingItems.push(`<div style="font-size:12px;font-weight:600;color:#374151;padding:3px 0 3px 20px;border-left:2px solid #9ca3af;margin:2px 0;">${htmlEscape(h)}</div>`);
    }
    for (const h of headings.h3) {
      headingItems.push(`<div style="font-size:12px;color:#6b7280;padding:2px 0 2px 34px;border-left:2px solid #e5e5e5;margin:2px 0;">${htmlEscape(h)}</div>`);
    }
  }
  const headingsHtml = headingItems.length > 0
    ? headingItems.join('\n')
    : '<span style="font-size:12px;color:#9ca3af;">Sin encabezados detectados.</span>';

  const staleNotice = !metaLeft && headingItems.length === 0
    ? `<div style="padding:14px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;font-size:13px;color:#92400e;line-height:1.6;">
        <strong>Los datos de extracción no están disponibles para esta sesión.</strong><br>
        Ejecuta un nuevo análisis de la URL para regenerar esta sección.
      </div>`
    : '';

  const markdownHtml = markdownToHtml(data.markdown);

  return `<div style="background:#f9fafb;border:1px solid #e5e5e5;border-radius:8px;padding:18px 20px;margin:0 0 0;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
    <span style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#374151;">Datos Extraídos</span>
    <span style="font-size:12px;color:#9ca3af;word-break:break-all;">${htmlEscape(data.url)} &mdash; ${date}</span>
  </div>
  ${staleNotice ? staleNotice : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:14px;">
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;margin-bottom:8px;">Meta tags</div>
      ${metaLeft}
    </div>
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;margin-bottom:8px;">Estructura de encabezados</div>
      ${headingsHtml}
    </div>
  </div>`}
  <details style="margin-top:4px;">
    <summary style="cursor:pointer;font-size:13px;font-weight:600;color:#374151;padding:6px 0;user-select:none;">Ver contenido extraído</summary>
    <div style="margin-top:12px;padding:14px 16px;background:#fff;border:1px solid #e5e5e5;border-radius:6px;font-size:13px;line-height:1.65;color:#333;max-height:480px;overflow-y:auto;">
      <style>
        .md-content h1{font-size:19px;font-weight:700;margin:18px 0 6px;color:#111;}
        .md-content h2{font-size:15px;font-weight:600;margin:14px 0 4px;border-bottom:1px solid #e5e5e5;padding-bottom:3px;color:#111;}
        .md-content h3{font-size:13px;font-weight:600;margin:10px 0 3px;color:#222;}
        .md-content p{margin:6px 0;}
        .md-content ul{margin:6px 0 6px 16px;}
        .md-content li{margin:2px 0;}
        .md-content strong{font-weight:700;}
        .md-content em{font-style:italic;}
        .md-content code{background:#f4f4f4;padding:1px 4px;border-radius:3px;font-family:'Courier New',monospace;font-size:11px;}
      </style>
      <div class="md-content">${markdownHtml}</div>
    </div>
  </details>
</div>
<hr style="border:none;border-top:2px solid #e5e5e5;margin:20px 0 0;">`;
}

export interface ExportInformeCompletoOptions {
  includeExtraction?: boolean;
  includeReadyToUse?: boolean;
}

export function exportInformeCompletoToHtml(
  croResult: AuditResult,
  seoResult: SEOAuditResult,
  copyResult: CopyAnalysisResult,
  copyzapCards: PromptCard[],
  copyzapCombinedPrompt: string,
  reportSources: { label: string; available: boolean }[],
  brandName: string,
  targetUrl: string,
  scrapedData?: ScrapedDataForReport | null,
  options: ExportInformeCompletoOptions = {},
): void {
  const { includeExtraction = true, includeReadyToUse = true } = options;
  const date = formatDate();
  const slug = (brandName || 'report').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const croPanelBody = buildCROAuditHtmlBody(croResult, brandName, targetUrl, includeReadyToUse);
  const seoPanelBody = buildSEOAuditHtmlBody(seoResult, brandName, targetUrl);
  const copyPanelBody = buildCopyAnalysisHtmlBody(copyResult, brandName, targetUrl);
  const copyzapPanelBody = buildCopyZapHtmlBody(copyzapCards, copyzapCombinedPrompt, targetUrl, reportSources);

  const firecrawlBlock = (includeExtraction && scrapedData) ? buildFirecrawlBlock(scrapedData, date) : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Completo — ${htmlEscape(brandName)}</title>
  <style>
${SHARED_CSS}
${DISCLAIMER_CSS}
${TAB_CSS}
  </style>
</head>
<body>
<header>
  <div class="header-brand">Sharpen.Studio</div>
  <div class="header-meta">
    <span>Informe Completo — ${htmlEscape(targetUrl)}</span><br>
    <span>Generado: ${date}</span>
  </div>
</header>
${firecrawlBlock ? `<div style="padding:20px 24px 0;">${firecrawlBlock}</div>` : ''}
${DISCLAIMER_HTML}
<nav class="tab-nav">
  <button class="tab-btn active" onclick="switchTab(0)">Conversión</button>
  <button class="tab-btn" onclick="switchTab(1)">Posicionamiento</button>
  <button class="tab-btn" onclick="switchTab(2)">Contenido</button>
  <button class="tab-btn" onclick="switchTab(3)">Acciones de Copy</button>
</nav>
<div class="content-wrap">
  <div id="panel-0" class="tab-panel active">${croPanelBody}</div>
  <div id="panel-1" class="tab-panel">${seoPanelBody}</div>
  <div id="panel-2" class="tab-panel">${copyPanelBody}</div>
  <div id="panel-3" class="tab-panel">${copyzapPanelBody}</div>
  <footer>
    <span>Sharpen.Studio · sharpen.studio</span>
    <span>Diagnóstico generado automáticamente — uso confidencial</span>
  </footer>
</div>
<script>
function switchTab(n){
  var btns=document.querySelectorAll('.tab-nav .tab-btn');
  btns.forEach(function(b,i){b.classList.toggle('active',i===n);});
  for(var i=0;i<4;i++){
    var p=document.getElementById('panel-'+i);
    if(p) p.classList.toggle('active',i===n);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
</script>
</body>
</html>`;

  const suffix =
    !includeExtraction && !includeReadyToUse ? '-solo-auditoria' :
    !includeExtraction ? '-sin-extraccion' :
    !includeReadyToUse ? '-sin-contenido' :
    '';
  triggerHtmlDownload(html, `informe-completo-${slug}-${fileDate()}${suffix}.html`);
}
