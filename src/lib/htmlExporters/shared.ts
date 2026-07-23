export function htmlEscape(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function scoreBgColor(score010: number): string {
  if (score010 >= 7.5) return '#16A34A';
  if (score010 >= 6.0) return '#D97706';
  return '#DC2626';
}

export function scoreLabel(score010: number): string {
  if (score010 >= 7.5) return 'Excelente';
  if (score010 >= 6.0) return 'Mejorable';
  return 'Requiere atención';
}

export function scoreExplanation(score010: number): string {
  if (score010 < 6.0) return 'Requiere atención — está afectando tus resultados directamente.';
  if (score010 < 7.5) return 'Hay oportunidades de mejora que pueden incrementar resultados.';
  return 'Excelente — este elemento está funcionando muy bien.';
}

export function formatDate(): string {
  return new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function fileDate(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export function sectionLabel(letter: string, title: string, subtitle: string): string {
  return `<div class="section-label">
    <span class="section-letter">${htmlEscape(letter)}</span>
    <div>
      <div class="section-title">${htmlEscape(title)}</div>
      <div class="section-subtitle">${htmlEscape(subtitle)}</div>
    </div>
  </div>`;
}

export function buildBarChart(dims: { label: string; score: number }[], maxScore = 10): string {
  const rowH = 38;
  const labelW = 210;
  const barMaxW = 300;
  const gap = 16;
  const scoreW = 52;
  const w = gap + labelW + barMaxW + scoreW;
  const h = dims.length * rowH + 16;

  const bars = dims.map((d, i) => {
    const y = 8 + i * rowH;
    const bw = Math.max(4, Math.round((Math.min(d.score, maxScore) / maxScore) * barMaxW));
    const c = scoreBgColor((d.score / maxScore) * 10);
    return `
      <text x="${gap}" y="${y + 22}" font-size="13" fill="#374151" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">${htmlEscape(d.label)}</text>
      <rect x="${gap + labelW}" y="${y + 8}" width="${bw}" height="18" rx="3" fill="${c}" opacity="0.85"/>
      <text x="${gap + labelW + barMaxW + 8}" y="${y + 22}" font-size="13" font-weight="600" fill="${c}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">${d.score.toFixed(1)}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:640px;display:block;margin:12px 0">${bars}</svg>`;
}

export function buildDonutChart(green: number, yellow: number, red: number): string {
  const total = green + yellow + red;
  if (total === 0) return '';

  const r = 70, cx = 90, cy = 90;

  function polar(angle: number) {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arc(s: number, e: number): string {
    const sp = polar(s);
    const ep = polar(e);
    const large = e - s > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${sp.x.toFixed(1)} ${sp.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${ep.x.toFixed(1)} ${ep.y.toFixed(1)} Z`;
  }

  const gAng = (green / total) * 360;
  const yAng = (yellow / total) * 360;
  const rAng = (red / total) * 360;

  let angle = 0;
  const segments: string[] = [];
  if (green > 0) { segments.push(`<path d="${arc(angle, angle + gAng)}" fill="#16A34A" opacity="0.85"/>`); angle += gAng; }
  if (yellow > 0) { segments.push(`<path d="${arc(angle, angle + yAng)}" fill="#D97706" opacity="0.85"/>`); angle += yAng; }
  if (red > 0) { segments.push(`<path d="${arc(angle, angle + rAng)}" fill="#DC2626" opacity="0.85"/>`); }

  return `<svg viewBox="0 0 400 180" width="100%" style="max-width:400px;display:block;margin:12px 0">
    ${segments.join('')}
    <circle cx="${cx}" cy="${cy}" r="${Math.round(r * 0.6)}" fill="white"/>
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="15" font-weight="700" fill="#1a1a1a" font-family="-apple-system,sans-serif">${total}</text>
    <text x="185" y="45" font-size="13" fill="#166534" font-family="-apple-system,sans-serif">■ Verde: ${green} (${Math.round(green / total * 100)}%)</text>
    <text x="185" y="70" font-size="13" fill="#854D0E" font-family="-apple-system,sans-serif">■ Amarillo: ${yellow} (${Math.round(yellow / total * 100)}%)</text>
    <text x="185" y="95" font-size="13" fill="#991B1B" font-family="-apple-system,sans-serif">■ Rojo: ${red} (${Math.round(red / total * 100)}%)</text>
  </svg>`;
}

export const SHARED_CSS = `
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: #1a1a1a;
  background: #ffffff;
  margin: 0;
  padding: 0;
}
.content-wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px 60px;
}
header {
  background: #111;
  color: white;
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  border-bottom: none;
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-brand { color: white; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; }
.header-meta { color: #aaa; font-size: 12px; text-align: right; line-height: 1.5; }
footer {
  margin-top: 60px;
  padding: 18px 0;
  border-top: 1px solid #e5e5e5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}
h1 { font-size: 26px; font-weight: 700; margin: 32px 0 6px; color: #111; }
h2 { font-size: 19px; font-weight: 600; margin: 36px 0 8px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; color: #111; }
h3 { font-size: 15px; font-weight: 600; margin: 22px 0 6px; color: #222; }
h4 { font-size: 14px; font-weight: 600; margin: 14px 0 4px; color: #333; }
p { margin: 8px 0; }
ul { margin: 8px 0 8px 20px; }
li { margin: 4px 0; }
table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
th { background: #f5f5f5; font-weight: 600; text-align: left; padding: 10px 12px; border: 1px solid #e0e0e0; }
td { padding: 9px 12px; border: 1px solid #e0e0e0; vertical-align: top; }
tr:nth-child(even) td { background: #fafafa; }
code, pre { background: #f4f4f4; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; }
pre { padding: 16px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; margin: 8px 0; }

/* ── Section labels ─────────────────────────────── */
.section-label {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 40px 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e5e5;
}
.section-letter {
  font-size: 12px;
  font-weight: 700;
  color: white;
  background: #111;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.section-title { font-size: 17px; font-weight: 700; color: #111; line-height: 1.3; }
.section-subtitle { font-size: 13px; color: #888; margin-top: 3px; }

/* ── Score hero ─────────────────────────────────── */
.score-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 24px;
  background: #f9fafb;
  border-radius: 12px;
  margin: 28px 0;
  border: 1px solid #e5e5e5;
}
.score-number { font-size: 60px; font-weight: 800; line-height: 1; }
.score-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  color: white;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 6px;
}
.score-sub { color: #555; font-size: 14px; margin: 6px 0 0; }

/* ── Scorecard grid ──────────────────────────────── */
.scorecard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
.score-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 16px; background: #fafafa; }
.score-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.score-weight { font-size: 11px; font-weight: 700; background: #e5e5e5; color: #555; padding: 2px 7px; border-radius: 10px; flex-shrink: 0; }
.score-card-name { font-size: 13px; font-weight: 600; color: #222; }
.score-card-value { font-size: 22px; font-weight: 800; margin: 4px 0; line-height: 1.2; }
.score-card-desc { font-size: 12px; color: #666; line-height: 1.4; }

/* ── Analysis blocks (2-col issues/recs) ─────────── */
.analysis-block { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 18px; margin: 12px 0; background: #fafafa; }
.analysis-title { font-size: 15px; font-weight: 700; margin: 0 0 4px; color: #111; }
.analysis-summary { font-size: 13px; color: #555; margin: 0 0 12px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.col-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #888; text-transform: uppercase; margin-bottom: 8px; }
.issues-list { margin: 0; padding-left: 16px; }
.issues-list li { font-size: 13px; color: #DC2626; margin: 4px 0; }
.recs-list { margin: 0; padding-left: 16px; }
.recs-list li { font-size: 13px; color: #166534; margin: 4px 0; }

/* ── Priority cards ──────────────────────────────── */
.priority-card {
  display: flex;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  margin: 10px 0;
  background: #fafafa;
  align-items: flex-start;
}
.priority-num-badge {
  font-size: 15px;
  font-weight: 800;
  color: #111;
  background: #ebebeb;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.priority-body { flex: 1; min-width: 0; }
.priority-title { font-size: 14px; font-weight: 600; margin: 0 0 6px; color: #111; }
.priority-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
.priority-time { font-size: 12px; color: #888; }
.priority-significa { font-size: 13px; color: #444; font-style: italic; margin: 0; }

/* ── Rewrite cards ───────────────────────────────── */
.rewrite-card {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 16px 18px;
  margin: 12px 0;
  background: #fafafa;
  page-break-inside: avoid;
}
.rewrite-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #888; text-transform: uppercase; margin-bottom: 10px; }
.rewrite-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 10px 0; }
.rewrite-current { background: #fff8f8; padding: 10px 12px; border-radius: 4px; font-size: 13px; border-left: 3px solid #f87171; }
.rewrite-improved { background: #f0fdf4; padding: 10px 12px; border-radius: 4px; font-size: 13px; border-left: 3px solid #4ade80; }
.rewrite-rationale { font-size: 12px; color: #666; font-style: italic; margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; }
.label-tag { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #888; margin-bottom: 4px; letter-spacing: 0.06em; }

/* ── Buyer journey ───────────────────────────────── */
.journey-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin: 16px 0; }
.journey-col { border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; background: #fafafa; }
.journey-header { font-size: 13px; font-weight: 700; padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; text-align: center; }
.journey-header.cold { background: #EFF6FF; color: #1D4ED8; }
.journey-header.warm { background: #FEF9C3; color: #854D0E; }
.journey-header.hot { background: #DCFCE7; color: #166534; }
.journey-sub { font-size: 11px; color: #888; text-align: center; margin-bottom: 10px; }
.journey-desc { font-size: 13px; color: #444; margin-bottom: 10px; }

/* ── Quick wins list ─────────────────────────────── */
.wins-list { list-style: none; padding: 0; margin: 0; }
.wins-list li { display: flex; gap: 8px; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #f0f0f0; align-items: flex-start; }
.wins-list li:last-child { border-bottom: none; }
.check-icon { color: #16A34A; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
.star-icon { color: #D97706; font-weight: 700; flex-shrink: 0; margin-top: 1px; }

/* ── A/B test grid ───────────────────────────────── */
.ab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
.ab-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; background: #fafafa; }
.ab-name { font-size: 14px; font-weight: 600; margin: 6px 0 4px; color: #111; }
.ab-hypothesis { font-size: 12px; color: #555; margin: 3px 0; }
.ab-metric { font-size: 12px; color: #888; margin-top: 4px; }

/* ── Misc ────────────────────────────────────────── */
.divider { border: none; border-top: 2px solid #e5e5e5; margin: 44px 0; }
.heatmap-block { border-radius: 8px; padding: 16px; margin: 12px 0; page-break-inside: avoid; }
.heatmap-block.red { background: #FEE2E2; border: 1px solid #FECACA; }
.heatmap-block.yellow { background: #FEF9C3; border: 1px solid #FDE68A; }
.heatmap-block.green { background: #DCFCE7; border: 1px solid #BBF7D0; }
.block-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.block-score-num { font-size: 24px; font-weight: 800; }
.red .block-score-num { color: #991B1B; }
.yellow .block-score-num { color: #854D0E; }
.green .block-score-num { color: #166534; }
.block-preview { font-size: 13px; font-style: italic; }
.red .block-preview { color: #7F1D1D; }
.yellow .block-preview { color: #713F12; }
.green .block-preview { color: #14532D; }
.block-issues { font-size: 13px; margin: 8px 0; }
.block-rewrite { font-size: 13px; background: rgba(0,0,0,0.05); padding: 10px 12px; border-radius: 6px; margin-top: 10px; }
.badge { display: inline-block; padding: 2px 9px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.badge-high { background: #FEE2E2; color: #991B1B; }
.badge-medium { background: #FEF9C3; color: #854D0E; }
.badge-low { background: #DCFCE7; color: #166534; }
.glossary-item { margin: 10px 0; font-size: 14px; }
.glossary-term { font-weight: 600; }
.code-block { background: #f4f4f4; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; margin: 10px 0; }

/* ── Wireframe zones ─────────────────────────────── */
.wireframe-current-list { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-wrap: wrap; gap: 8px; }
.wireframe-current-list li { font-size: 12px; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 10px; }
.wireframe-zones { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.wireframe-zone { display: flex; gap: 14px; align-items: flex-start; border: 1px solid #e5e7eb; padding: 12px 14px; background: #f9fafb; border-radius: 0 6px 6px 0; }
.wireframe-zone-num { width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; color: #374151; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wireframe-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

/* ── Responsive ──────────────────────────────────── */
@media (max-width: 600px) {
  .scorecard-grid,
  .two-col,
  .rewrite-cols,
  .journey-grid,
  .ab-grid { grid-template-columns: 1fr; }
  header { padding: 12px 16px; }
  .content-wrap { padding: 0 16px 40px; }
}
@media print {
  @page { margin: 15mm 20mm; }
  header { position: static; background: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { page-break-after: avoid; }
  table { page-break-inside: avoid; }
  .heatmap-block, .rewrite-card, .priority-card, .score-card, .analysis-block, .ab-card { page-break-inside: avoid; }
  footer { background: white; }
}
`;

export function buildHtmlPage(title: string, moduleName: string, targetUrl: string, body: string): string {
  const date = formatDate();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
<header>
  <div class="header-brand">Sharpen.Studio</div>
  <div class="header-meta">
    <span>${htmlEscape(moduleName)} — ${htmlEscape(targetUrl)}</span><br>
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
}

export function triggerHtmlDownload(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
