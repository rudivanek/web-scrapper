import type { CopyAnalysisResult } from '../../types/copyAnalysis';
import { COPY_GLOSSARY } from '../glossaries';
import { getLabels } from '../i18n';
import {
  htmlEscape, scoreBgColor, scoreLabel, scoreExplanation,
  buildBarChart, buildDonutChart, buildHtmlPage, triggerHtmlDownload, fileDate, formatDate, sectionLabel,
} from './shared';

const DIMENSION_LABELS: Record<string, string> = {
  Clarity: 'Claridad',
  'Persuasion Strength': 'Fuerza Persuasiva',
  'Emotional Tone': 'Tono Emocional',
  'Benefit-to-Feature Ratio': 'Proporción Beneficio–Característica',
  'Power Words & Language': 'Lenguaje de Alto Impacto',
  'Active vs Passive Voice': 'Voz Activa',
  'Active Voice': 'Voz Activa',
  'Conversion Relevance': 'Relevancia de Conversión',
  clarity: 'Claridad',
  persuasion: 'Fuerza Persuasiva',
  emotionalTone: 'Tono Emocional',
  benefitFeatureRatio: 'Proporción Beneficio–Característica',
  powerWords: 'Lenguaje de Alto Impacto',
  activeVoice: 'Voz Activa',
  conversionRelevance: 'Relevancia de Conversión',
};

function translateDim(dim: string): string {
  return DIMENSION_LABELS[dim] || dim;
}

function blockLabel(block: { sectionName?: string; blockNumber: number; blockTextPreview?: string }): string {
  if (block.sectionName) return block.sectionName;
  const preview = block.blockTextPreview || '';
  const words = preview.trim().split(/\s+/).filter(w => w.length > 2).slice(0, 4).join(' ');
  return words.length > 0 ? words + '…' : `#${block.blockNumber}`;
}

export function buildCopyAnalysisHtmlBody(result: CopyAnalysisResult, brandName: string, targetUrl: string): string {
  const L = getLabels(result.language);
  const ps = result.pageScore;
  const dimsAvg = result.dimensionAverages.length > 0
    ? result.dimensionAverages.reduce((s, d) => s + d.average, 0) / result.dimensionAverages.length
    : 0;
  const rawScore = ps?.overallScore;
  const overall = (rawScore != null && !isNaN(rawScore) && rawScore > 0) ? rawScore : dimsAvg;
  const badgeColor = scoreBgColor(overall);

  const greenBlocks = result.copyHeatmap.filter(b => b.color === 'green');
  const sortedDims = [...result.dimensionAverages].sort((a, b) => b.average - a.average);
  const goodDims = sortedDims.filter(d => d.average >= 6.0);
  let strengthsHtml: string;
  const strengthItems: string[] = [];
  if (greenBlocks.length > 0) {
    strengthItems.push(`${greenBlocks.length} sección${greenBlocks.length > 1 ? 'es' : ''} del copy ya alcanzan puntuación verde (8.0+/10): ${greenBlocks.slice(0, 3).map(b => blockLabel(b)).join(', ')}`);
  }
  goodDims.slice(0, 3).forEach(d => {
    strengthItems.push(`<strong>${htmlEscape(translateDim(d.dimension))}</strong> (${d.average.toFixed(1)}/10) — ${htmlEscape(d.assessment)}`);
  });
  if (strengthItems.length > 0) {
    strengthsHtml = `<ul>${strengthItems.map(item => `<li>${item}</li>`).join('')}</ul>`;
  } else {
    const positiveKws = ['excelente', 'sólido', 'bien', 'adecuado', 'correcto', 'claro', 'positivo', 'buenas señales', 'extenso'];
    const positiveItems: string[] = [];
    for (const b of result.detailedBlocks) {
      const sentences = (b.rewriteRationale || '').split(/(?<=[.!?])\s+/);
      const match = sentences.find(s => positiveKws.some(kw => s.toLowerCase().includes(kw)));
      if (match && positiveItems.length < 3) positiveItems.push(match.trim());
    }
    strengthsHtml = positiveItems.length > 0
      ? `<ul>${positiveItems.map(s => `<li>${htmlEscape(s)}</li>`).join('')}</ul>`
      : `<p style="color:#666;font-style:italic">Esta página tiene un amplio margen de mejora — las recomendaciones de este informe son el punto de partida.</p>`;
  }

  const topRewrite = result.topPriorityRewrites[0];
  const topRewrites = result.topPriorityRewrites.slice(0, 3);
  const projAvg = topRewrites.length > 0
    ? (topRewrites.reduce((sum, r) => sum + r.projectedScore, 0) / topRewrites.length).toFixed(1)
    : '—';
  const spanishActions = result.actionPlan
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(a => a.action)
    .filter(Boolean);
  const nextStepsHtml = `
    <p>La mejora más urgente es <strong>${topRewrite ? htmlEscape(blockLabel(topRewrite)) : '—'}</strong> — con puntuación actual de ${topRewrite?.currentScore}/10, es el bloque que más está limitando la efectividad de tu mensaje.</p>
    <ul>
      ${spanishActions.length > 0
        ? spanishActions.map(a => `<li>${htmlEscape(a)}</li>`).join('')
        : topRewrites.map(r => `<li>Reescribir ${htmlEscape(blockLabel(r))}: ${htmlEscape(r.issue)}</li>`).join('')}
    </ul>
    <p>Aplicando estos rewrites, el promedio proyectado de las secciones clave sube a ${projAvg}/10, mejorando directamente la conversión de lectores en prospectos.</p>`;

  const scorecardGrid = `<div class="scorecard-grid">${result.dimensionAverages.map(d => `
    <div class="score-card">
      <div class="score-card-top">
        <span class="score-card-name">${htmlEscape(translateDim(d.dimension))}</span>
      </div>
      <div class="score-card-value" style="color:${scoreBgColor(d.average)}">${d.average.toFixed(1)}/10</div>
      <div class="score-card-desc">${htmlEscape(d.assessment)}</div>
    </div>`).join('')}
  </div>`;

  const priorityCards = result.topPriorityRewrites.slice(0, 5).map((r, i) => {
    const detailedBlock = result.detailedBlocks.find(b => b.blockNumber === r.blockNumber);
    const consequence = detailedBlock?.rewriteRationale
      || (detailedBlock && detailedBlock.issues.length > 1 ? detailedBlock.issues[1] : null)
      || `Este bloque reduce la efectividad del mensaje: el visitante lee pero no siente urgencia de actuar.`;
    const scoreDisplay = typeof r.currentScore === 'number' ? r.currentScore.toFixed(1) : r.currentScore;
    return `
    <div class="priority-card">
      <div class="priority-num-badge">${i + 1}</div>
      <div class="priority-body">
        <div class="priority-title">${htmlEscape(blockLabel(r))} — puntuación actual: ${scoreDisplay}/10</div>
        <div class="priority-meta">
          <span style="font-size:12px;color:#888">Proyectado: ${r.projectedScore}/10</span>
        </div>
        <p class="priority-significa"><strong>Lo que esto significa:</strong> ${htmlEscape(consequence)}</p>
      </div>
    </div>`;
  }).join('');

  const heatmapBlocks = result.copyHeatmap.map(block => {
    const colorClass = block.color;
    const score = typeof block.compositeScore === 'number' ? block.compositeScore.toFixed(1) : block.compositeScore;
    return `<div class="heatmap-block ${colorClass}">
      <div class="block-header">
        <div class="block-score-num">${score}/10</div>
        <div>${htmlEscape(blockLabel(block))}<span style="color:#aaa;font-size:11px;margin-left:6px">· #${block.blockNumber}</span></div>
      </div>
      <div class="block-preview">${htmlEscape(block.blockTextPreview)}</div>
    </div>`;
  }).join('');

  const detailedBlocksHtml = result.detailedBlocks.map(block => {
    const colorClass = block.color;
    const score = typeof block.compositeScore === 'number' ? block.compositeScore.toFixed(1) : block.compositeScore;
    const dimScores = block.scores ? Object.entries(block.scores).map(([k, v]) => {
      const dimLabel = DIMENSION_LABELS[k] || k;
      const dimScore = typeof v === 'number' ? v : 0;
      return `<span style="font-size:12px;color:${scoreBgColor(dimScore)}">${htmlEscape(dimLabel)}: ${dimScore.toFixed(1)}</span>`;
    }).join(' · ') : '';
    const originalText = (block as { originalText?: string }).originalText || '';
    return `<div class="analysis-block" style="border-color:${colorClass === 'red' ? '#FECACA' : colorClass === 'yellow' ? '#FDE68A' : '#BBF7D0'}">
      <div class="analysis-title">${htmlEscape(blockLabel(block))}<span style="color:#aaa;font-size:12px;font-weight:400;margin-left:6px">· #${block.blockNumber}</span> <span style="font-size:14px;font-weight:400;color:${scoreBgColor(typeof block.compositeScore === 'number' ? block.compositeScore : 0)}">${score}/10</span></div>
      ${dimScores ? `<p style="font-size:12px;color:#888;margin:4px 0 8px">${dimScores}</p>` : ''}
      ${block.issues && block.issues.length > 0
        ? `<div class="col-label" style="margin-bottom:6px">${htmlEscape(L.issuesFound)}</div><ul class="issues-list">${block.issues.map(issue => `<li>${htmlEscape(issue)}</li>`).join('')}</ul>`
        : ''}
      ${block.rewrite ? `
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        <div>
          <div class="col-label" style="margin-bottom:4px">${htmlEscape(L.currentCopy.toUpperCase())}</div>
          <div style="background:#f9fafb;border-left:4px solid #d1d5db;padding:10px 12px;border-radius:0 4px 4px 0;font-size:13px;color:#4b5563;line-height:1.5">${htmlEscape(originalText || block.blockTextPreview)}</div>
        </div>
        <div>
          <div class="col-label" style="margin-bottom:4px;color:#065f46">${htmlEscape(L.rewrittenCopy.toUpperCase())}</div>
          <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:10px 12px;border-radius:0 4px 4px 0;font-size:13px;color:#374151;font-weight:500;line-height:1.5">${htmlEscape(block.rewrite)}</div>
        </div>
      </div>
      ${block.rewriteRationale ? `<p style="font-size:12px;color:#666;margin-top:8px;font-style:italic">${htmlEscape(block.rewriteRationale)}</p>` : ''}
      ` : ''}
    </div>`;
  }).join('');

  const priorityRewriteCards = result.topPriorityRewrites.map((r, i) => `
    <div class="rewrite-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:26px;height:26px;border-radius:50%;background:#111;color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${i + 1}</span>
          <span style="font-size:13px;font-weight:600;color:#111">${htmlEscape(blockLabel(r))}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:13px">
          <span style="font-weight:700;color:${scoreBgColor(r.currentScore)}">${typeof r.currentScore === 'number' ? r.currentScore.toFixed(1) : r.currentScore}</span>
          <span style="color:#aaa">→</span>
          <span style="font-weight:700;color:${scoreBgColor(r.projectedScore)}">${r.projectedScore}</span>
          <span style="font-size:12px;color:#16a34a;font-weight:600">(+${typeof r.currentScore === 'number' ? (r.projectedScore - r.currentScore).toFixed(1) : ''})</span>
        </div>
      </div>
      <div class="rewrite-cols">
        <div>
          <div class="col-label" style="color:#dc2626;margin-bottom:6px">${htmlEscape(L.currentCopy)}</div>
          <div class="rewrite-current">${htmlEscape(r.issue)}</div>
        </div>
        <div>
          <div class="col-label" style="color:#065f46;margin-bottom:6px">${htmlEscape(L.rewrittenCopy)}</div>
          <div class="rewrite-improved">${htmlEscape(r.rewrite || '')}</div>
        </div>
      </div>
    </div>`).join('');

  const pa = result.patternAnalysis;
  const patternHtml = `
    <div class="two-col">
      <div>
        <div class="col-label">Debilidades del copy</div>
        <ul class="issues-list" style="padding-left:16px">
          <li>${htmlEscape(pa.dominantWeakness)}</li>
          <li>${htmlEscape(pa.worstHabit)}</li>
          ${pa.recurringPatterns.map(p => `<li>${htmlEscape(p)}</li>`).join('')}
        </ul>
      </div>
      <div>
        <div class="col-label">Consejo de coaching</div>
        <p style="font-size:13px;color:#444">${htmlEscape(pa.coachingAdvice)}</p>
      </div>
    </div>`;

  const actionRows = result.actionPlan.map(item => `
    <tr>
      <td>${item.priority}</td>
      <td>${htmlEscape(item.action)}</td>
      <td>${htmlEscape(item.blocksAffected)}</td>
      <td>${htmlEscape(item.impact)}</td>
    </tr>`).join('');

  const glossaryHtml = COPY_GLOSSARY.map(g =>
    `<div class="glossary-item"><span class="glossary-term">${htmlEscape(g.term)}:</span> ${htmlEscape(g.definition)}</div>`
  ).join('');

  const body = `
    <h1>${htmlEscape(brandName)} — Copy Analysis</h1>
    <p style="color:#888;font-size:14px">${htmlEscape(targetUrl)} · ${formatDate()}</p>

    <div class="score-hero">
      <div class="score-number" style="color:${badgeColor}">${overall.toFixed(1)}</div>
      <div>
        <div><span class="score-badge" style="background:${badgeColor}">${scoreLabel(overall)}</span></div>
        <p class="score-sub">${scoreExplanation(overall)}</p>
      </div>
    </div>

    ${sectionLabel('A', 'Resumen del copy', 'Estado general de la efectividad del mensaje y puntos clave.')}
    <p>${htmlEscape(result.copySummary)}</p>
    <table style="margin-top:16px">
      <tr><td><strong>Puntuación global</strong></td><td style="font-weight:700;color:${badgeColor}">${overall.toFixed(1)}/10</td></tr>
      <tr><td><strong>Total de bloques</strong></td><td>${ps.totalBlocks}</td></tr>
      <tr><td><strong>Nivel de lectura</strong></td><td>${htmlEscape(ps.readingLevel)}</td></tr>
      <tr><td><strong>Tiempo de lectura estimado</strong></td><td>${htmlEscape(ps.estimatedReadingTime)}</td></tr>
      <tr><td><strong>Consistencia de tono</strong></td><td>${htmlEscape(ps.toneConsistency)}</td></tr>
      <tr><td><strong>Dimensión más débil</strong></td><td>${htmlEscape(translateDim(ps.weakestDimension))} (${ps.weakestDimensionAvg})</td></tr>
      <tr><td><strong>Dimensión más fuerte</strong></td><td>${htmlEscape(translateDim(ps.strongestDimension))} (${ps.strongestDimensionAvg})</td></tr>
    </table>
    <h3>Lo que ya está funcionando bien</h3>
    ${strengthsHtml}
    <h3>¿Qué sigue?</h3>
    ${nextStepsHtml}

    ${sectionLabel('B', 'Distribución de puntuaciones', 'Cuántos bloques están en verde, amarillo y rojo.')}
    ${buildDonutChart(ps.greenBlocks, ps.yellowBlocks, ps.redBlocks)}
    <div class="two-col">
      <div>
        <div class="col-label">Distribución de bloques</div>
        <table><thead><tr><th>Rango</th><th>Bloques</th><th>%</th></tr></thead><tbody>
          <tr><td>Verde (8.0–10)</td><td style="font-weight:700;color:#16A34A">${ps.greenBlocks}</td><td style="color:#16A34A">${ps.greenPercent}%</td></tr>
          <tr><td>Amarillo (6.0–7.9)</td><td style="font-weight:700;color:#D97706">${ps.yellowBlocks}</td><td style="color:#D97706">${ps.yellowPercent}%</td></tr>
          <tr><td>Rojo (0–5.9)</td><td style="font-weight:700;color:#DC2626">${ps.redBlocks}</td><td style="color:#DC2626">${ps.redPercent}%</td></tr>
        </tbody></table>
      </div>
      <div>
        <div class="col-label">Análisis de dimensiones</div>
        ${scorecardGrid}
      </div>
    </div>

    ${sectionLabel('C', 'Heatmap de copy', 'Vista visual de todos los bloques de la página por color de puntuación.')}
    <p style="font-size:13px;color:#666">Cada bloque muestra su puntuación compuesta y una vista previa del texto:</p>
    ${heatmapBlocks}

    ${sectionLabel('D', htmlEscape(L.dimensionAnalysisSection.replace(/^[A-Z\d][\.\s–]+\s*/, '')), 'Issues encontrados y rewrite sugerido para cada sección.')}
    ${buildBarChart(result.dimensionAverages.map(d => ({ label: translateDim(d.dimension), score: d.average })), 10)}
    ${detailedBlocksHtml}

    ${sectionLabel('E', htmlEscape(L.topPriorityRewritesSection.replace(/^[A-Z\d][\.\s–]+\s*/, '')), 'Los bloques de mayor urgencia con su problema y puntuación proyectada.')}
    ${priorityCards}
    ${priorityRewriteCards}

    ${sectionLabel('F', 'Análisis de patrones', 'Hábitos recurrentes y debilidades sistemáticas en el copy.')}
    ${patternHtml}

    ${sectionLabel('G', 'Plan de acción', 'Acciones concretas ordenadas por prioridad e impacto esperado.')}
    <table>
      <thead><tr><th>#</th><th>Acción</th><th>Bloques afectados</th><th>Impacto</th></tr></thead>
      <tbody>${actionRows}</tbody>
    </table>

    ${sectionLabel('H', 'Resumen final', 'Conclusión y próximos pasos para mejorar la efectividad del mensaje.')}
    <p>${htmlEscape(result.finalSummary)}</p>

    <h2 style="margin-top:44px">Glosario</h2>
    ${glossaryHtml}
  `;

  return body;
}

export function exportCopyAnalysisToHtml(result: CopyAnalysisResult, brandName: string, targetUrl: string): void {
  const body = buildCopyAnalysisHtmlBody(result, brandName, targetUrl);
  const html = buildHtmlPage(`Copy Analysis — ${brandName}`, 'Copy Analysis', targetUrl, body);
  const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  triggerHtmlDownload(html, `copy-analysis-${slug}-${fileDate()}.html`);
}
