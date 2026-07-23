import type { SEOAuditResult } from '../../types/audit';
import { SEO_GLOSSARY } from '../glossaries';
import { getLabels } from '../i18n';
import {
  htmlEscape, scoreBgColor, scoreLabel, scoreExplanation,
  buildBarChart, buildHtmlPage, triggerHtmlDownload, fileDate, formatDate, sectionLabel,
} from './shared';

export function buildSEOAuditHtmlBody(result: SEOAuditResult, brandName: string, targetUrl: string): string {
  const L = getLabels(result.language);
  const sc = result.seoScoreCard;
  const norm = (v: number | null | undefined): number => {
    if (v == null || isNaN(v as number)) return 0;
    const n = v as number;
    return n > 10 ? n / 10 : n;
  };

  const dims: { label: string; score: number; weight: string; subtitle?: string }[] = [
    { label: L.seoScoreRowLabels.titleMeta, score: norm(sc.titleMeta), weight: '15%' },
    { label: L.seoScoreRowLabels.headingStructure, score: norm(sc.headingStructure), weight: '15%' },
    { label: L.seoScoreRowLabels.contentQuality, score: norm(sc.contentQuality), weight: '20%' },
    { label: L.seoScoreRowLabels.keywordOptimization, score: norm(sc.keywordOptimization), weight: '15%' },
    { label: L.seoScoreRowLabels.links, score: norm(sc.links), weight: '10%' },
    { label: L.seoScoreRowLabels.imageMedia, score: norm(sc.imageMedia), weight: '10%' },
    { label: L.seoScoreRowLabels.schemaStructuredData, score: norm(sc.schemaStructuredData), weight: '10%', subtitle: 'Listo para implementar — no está activo en la página aún' },
    { label: L.seoScoreRowLabels.contentArchitecture, score: norm(sc.contentArchitecture), weight: '5%' },
  ];

  const dimsAvg = dims.reduce((s, d) => s + d.score, 0) / dims.length;
  const rawTotal = sc?.weightedTotal;
  const overall = (rawTotal != null && !isNaN(rawTotal) && rawTotal !== 0) ? norm(rawTotal) : dimsAvg;
  const badgeColor = scoreBgColor(overall);

  const sortedDims = [...dims].sort((a, b) => b.score - a.score);
  const goodDims = sortedDims.filter(d => d.score >= 6.0);
  let strengthsHtml: string;
  if (goodDims.length > 0) {
    strengthsHtml = `<ul>${goodDims.map(d => {
      const analysis = result.detailedAnalysis.find(f =>
        f.dimension.toLowerCase().includes(d.label.toLowerCase().slice(0, 8)) ||
        d.label.toLowerCase().includes(f.dimension.toLowerCase().slice(0, 8))
      );
      const note = analysis && analysis.currentState
        ? analysis.currentState.split('. ')[0] + '.'
        : d.score >= 7.5 ? 'Funcionando bien.' : 'Por encima del promedio en este sitio.';
      return `<li><strong>${htmlEscape(d.label)}</strong> (${d.score.toFixed(1)}/10) — ${htmlEscape(note)}</li>`;
    }).join('')}</ul>`;
  } else {
    const positiveKws = ['excelente', 'sólido', 'bien', 'adecuado', 'correcto', 'claro', 'positivo', 'buenas señales', 'extenso', 'segmentado'];
    const positiveItems: string[] = [];
    for (const f of result.detailedAnalysis) {
      const sentences = [f.currentState, ...f.recommendations].join(' ').split(/(?<=[.!?])\s+/);
      const match = sentences.find(s => positiveKws.some(kw => s.toLowerCase().includes(kw)));
      if (match && positiveItems.length < 3) positiveItems.push(match.trim());
    }
    strengthsHtml = positiveItems.length > 0
      ? `<ul>${positiveItems.map(s => `<li>${htmlEscape(s)}</li>`).join('')}</ul>`
      : `<p style="color:#666;font-style:italic">Esta página tiene un amplio margen de mejora — las recomendaciones de este informe son el punto de partida.</p>`;
  }

  const topWin = result.seoQuickWins[0];
  const worstDims = [...result.detailedAnalysis].sort((a, b) => norm(a.score) - norm(b.score));
  const spanishActions = worstDims.slice(0, 3).map(f => f.recommendations[0]).filter(Boolean);
  const nextStepsHtml = `
    <p>La prioridad SEO más urgente es: <strong>${htmlEscape(topWin?.action || worstDims[0]?.dimension || '')}</strong> — es lo que más está limitando tu visibilidad en Google en este momento.</p>
    <ul>
      ${spanishActions.map(a => `<li>${htmlEscape(a)}</li>`).join('')}
    </ul>
    <p>Con estos ajustes implementados, Google podrá indexar y posicionar tu contenido de forma más efectiva, generando más visitas orgánicas.</p>`;

  const priorityCards = result.seoQuickWins.slice(0, 5).map((w, i) => {
    const consequenceHtml = w.consequence
      ? `<p class="priority-significa"><strong>Lo que esto significa:</strong> ${htmlEscape(w.consequence)}</p>`
      : '';
    return `
    <div class="priority-card">
      <div class="priority-num-badge">${i + 1}</div>
      <div class="priority-body">
        <div class="priority-title">${htmlEscape(w.action)}</div>
        <div class="priority-meta">
          <span class="priority-time">Tiempo: ${htmlEscape(w.estimatedTime)}</span>
          <span style="font-size:12px;color:#888">Impacto: ${htmlEscape(w.impact)}</span>
        </div>
        ${consequenceHtml}
      </div>
    </div>`;
  }).join('');

  const scorecardGrid = `<div class="scorecard-grid">${dims.map(d => `
    <div class="score-card">
      <div class="score-card-top">
        <span class="score-weight">${d.weight}</span>
        <span class="score-card-name">${htmlEscape(d.label)}</span>
      </div>
      <div class="score-card-value" style="color:${scoreBgColor(d.score)}">${d.score.toFixed(1)}/10</div>
      ${d.subtitle ? `<div style="font-size:11px;color:#d97706;font-style:italic;margin-top:2px;line-height:1.3">${htmlEscape(d.subtitle)}</div>` : ''}
      <div class="score-card-desc">${scoreExplanation(d.score)}</div>
    </div>`).join('')}
  </div>`;

  const detailedHtml = result.detailedAnalysis.map(f => `
    <div class="analysis-block">
      <div class="analysis-title">${htmlEscape(f.dimension)} <span style="font-size:14px;font-weight:400;color:${scoreBgColor(norm(f.score))}">${norm(f.score).toFixed(1)}/10</span></div>
      ${f.currentState ? `<p class="analysis-summary">${htmlEscape(f.currentState)}</p>` : ''}
      <div class="two-col">
        <div>
          <div class="col-label">${htmlEscape(L.issuesFound)}</div>
          ${f.issues.length > 0
            ? `<ul class="issues-list">${f.issues.map(i => `<li>${htmlEscape(i)}</li>`).join('')}</ul>`
            : `<p style="font-size:13px;color:#888">Sin issues críticos.</p>`}
        </div>
        <div>
          <div class="col-label">${htmlEscape(L.recommendations)}</div>
          ${f.recommendations.length > 0
            ? `<ul class="recs-list">${f.recommendations.map(r => `<li>${htmlEscape(r)}</li>`).join('')}</ul>`
            : `<p style="font-size:13px;color:#888">Ver prioridades.</p>`}
        </div>
      </div>
    </div>`).join('');

  const rewritesHtml = result.metaHeadingRewrites.map((r, i) => `
    <div class="rewrite-card">
      <div class="rewrite-label">${i + 1}. ${htmlEscape(r.element)}</div>
      <div class="rewrite-cols">
        <div>
          <div class="col-label">${htmlEscape(L.current)}</div>
          <div class="rewrite-current">${htmlEscape(r.current)}</div>
        </div>
        <div>
          <div class="col-label">${htmlEscape(L.optimized)}</div>
          <div class="rewrite-improved">${htmlEscape(r.optimized)}</div>
        </div>
      </div>
      <div class="rewrite-rationale">${htmlEscape(r.rationale)}</div>
    </div>`).join('');

  const keywordRows = result.keywordMap.map(kw => {
    const sc2 = kw.status === 'good' ? '#16A34A' : kw.status === 'needs work' ? '#D97706' : '#DC2626';
    const stLabel = kw.status === 'good' ? '✓ Bueno' : kw.status === 'needs work' ? '~ Mejorable' : '✗ Faltante';
    const stBadge = kw.status === 'good' ? 'badge-low' : kw.status === 'needs work' ? 'badge-medium' : 'badge-high';
    const cell = (v: boolean) => v
      ? `<td style="text-align:center;background:#DCFCE7;color:#166534;font-weight:700">✓</td>`
      : `<td style="text-align:center;background:#FEE2E2;color:#991B1B;font-weight:700">✗</td>`;
    return `<tr>
      <td>${htmlEscape(kw.keyword)}</td>
      <td>${htmlEscape(kw.type)}</td>
      <td><span class="badge ${stBadge}" style="color:${sc2}">${stLabel}</span></td>
      <td style="text-align:center">${kw.frequency}</td>
      ${cell(kw.inH1)}${cell(kw.inTitle)}${cell(kw.inMeta)}
    </tr>`;
  }).join('');

  let schemaHtml = '';
  if (result.schemaMarkupCode && result.schemaMarkupCode.length > 0) {
    schemaHtml = result.schemaMarkupCode.map((s, i) => `
      <div class="analysis-block">
        <div class="analysis-title">${i + 1}. ${htmlEscape(s.schemaType)}</div>
        <p class="analysis-summary">${htmlEscape(s.rationale)}</p>
        <div class="code-block">${htmlEscape(s.code)}</div>
      </div>`).join('');
  }

  const gap = result.contentGapAnalysis;
  const gapHtml = `
    <div class="two-col">
      <div>
        <div class="col-label">${htmlEscape(L.missingSubtopics)}</div>
        ${gap.missingSubtopics.length > 0
          ? `<ul class="issues-list">${gap.missingSubtopics.map(t => `<li>${htmlEscape(t)}</li>`).join('')}</ul>`
          : '<p style="font-size:13px;color:#888">—</p>'}
        <div class="col-label" style="margin-top:12px">${htmlEscape(L.unansweredQuestions)}</div>
        ${gap.unansweredQuestions.length > 0
          ? `<ul class="issues-list">${gap.unansweredQuestions.map(q => `<li>${htmlEscape(q)}</li>`).join('')}</ul>`
          : '<p style="font-size:13px;color:#888">—</p>'}
      </div>
      <div>
        <div class="col-label">${htmlEscape(L.recommendedNewSections)}</div>
        ${gap.recommendedSections.length > 0
          ? `<ul class="recs-list">${gap.recommendedSections.map(s => `<li>${htmlEscape(s)}</li>`).join('')}</ul>`
          : '<p style="font-size:13px;color:#888">—</p>'}
        <p style="font-size:13px;margin-top:12px">${htmlEscape(L.additionalWordCount(gap.additionalWordCount))}</p>
      </div>
    </div>`;

  const ap = result.seoActionPlan;

  const glossaryHtml = SEO_GLOSSARY.map(g =>
    `<div class="glossary-item"><span class="glossary-term">${htmlEscape(g.term)}:</span> ${htmlEscape(g.definition)}</div>`
  ).join('');

  const body = `
    <h1>${htmlEscape(brandName)} — SEO Audit</h1>
    <p style="color:#888;font-size:14px">${htmlEscape(targetUrl)} · ${formatDate()}</p>

    <div class="score-hero">
      <div class="score-number" style="color:${badgeColor}">${overall.toFixed(1)}</div>
      <div>
        <div><span class="score-badge" style="background:${badgeColor}">${scoreLabel(overall)}</span></div>
        <p class="score-sub">${scoreExplanation(overall)}</p>
      </div>
    </div>

    ${sectionLabel('A', 'Resumen ejecutivo SEO', 'Estado general del posicionamiento y hallazgos principales.')}
    <p>${htmlEscape(result.seoExecutiveSummary)}</p>
    <table style="margin-top:16px">
      <tr><td><strong>Palabras clave principales</strong></td><td>${htmlEscape(result.seoContext.primaryKeywords.join(', '))}</td></tr>
      <tr><td><strong>Intención de búsqueda</strong></td><td>${htmlEscape(result.seoContext.searchIntent)}</td></tr>
      <tr><td><strong>Competidores probables</strong></td><td>${htmlEscape(result.seoContext.likelyCompetitors)}</td></tr>
    </table>
    <h3>Lo que ya está funcionando bien</h3>
    ${strengthsHtml}
    <h3>¿Qué sigue?</h3>
    ${nextStepsHtml}

    ${sectionLabel('B', htmlEscape(L.seoScoreCard), 'Puntuación ponderada por área con tarjetas visuales.')}
    ${buildBarChart(dims, 10)}
    ${scorecardGrid}
    <table style="margin-top:16px">
      <thead><tr><th>Dimensión</th><th>Peso</th><th>Puntuación</th></tr></thead>
      <tbody>
        ${dims.map(d => `<tr>
          <td>${htmlEscape(d.label)}</td>
          <td style="color:#888;font-size:13px">${d.weight}</td>
          <td style="font-weight:700;color:${scoreBgColor(d.score)}">${d.score.toFixed(1)}/10</td>
        </tr>`).join('')}
        <tr style="background:#f5f5f5"><td><strong>Total ponderado</strong></td><td></td><td style="font-weight:700;color:${badgeColor}"><strong>${overall.toFixed(1)}/10</strong></td></tr>
      </tbody>
    </table>

    ${sectionLabel('C', htmlEscape(L.headingStructureMap), 'Árbol de H1–H6 identificado en la página.')}
    <pre>${htmlEscape(result.headingStructureMap)}</pre>

    ${sectionLabel('D', htmlEscape(L.keywordMap), 'Análisis de presencia y distribución de keywords en los elementos SEO clave.')}
    <table>
      <thead><tr><th>Palabra clave</th><th>Tipo</th><th>Estado</th><th>Frecuencia</th><th>H1</th><th>Título</th><th>Meta</th></tr></thead>
      <tbody>${keywordRows}</tbody>
    </table>

    ${sectionLabel('E', htmlEscape(L.detailedAnalysis), 'Diagnóstico profundo de cada dimensión con issues y recomendaciones.')}
    ${detailedHtml}

    ${sectionLabel('F', htmlEscape(L.metaAndHeadingRewrites), 'Versiones actuales vs. optimizadas listas para implementar.')}
    ${rewritesHtml || '<p style="color:#888;font-size:13px">No hay rewrites disponibles.</p>'}

    ${result.schemaMarkupCode && result.schemaMarkupCode.length > 0 ? `
    ${sectionLabel('G', htmlEscape(L.schemaMarkupCode), 'Código de datos estructurados listo para copiar e implementar.')}
    ${schemaHtml}` : ''}

    ${sectionLabel('H', htmlEscape(L.contentGapAnalysis), 'Subtemas, preguntas y secciones que faltan para completar la cobertura del tema.')}
    ${gapHtml}

    ${sectionLabel('I', htmlEscape(L.quickSeoWins), 'Las prioridades de mayor impacto, ordenadas por urgencia.')}
    ${priorityCards}
    <div class="two-col" style="margin-top:20px">
      <div>
        <div class="col-label">${htmlEscape(L.quickSeoWins)}</div>
        <ul class="wins-list">
          ${result.seoQuickWins.map(w => `<li><span class="check-icon">✓</span><span><strong>${htmlEscape(w.action)}</strong> — ${htmlEscape(w.estimatedTime)} · ${htmlEscape(w.impact)}</span></li>`).join('')}
        </ul>
      </div>
      <div>
        <div class="col-label">${htmlEscape(L.highImpactChanges)}</div>
        <ul class="wins-list">
          ${result.seoHighImpactChanges.map(c => `<li><span class="star-icon">★</span><span><strong>${htmlEscape(c.action)}</strong> — ${htmlEscape(c.estimatedTime)} · ${htmlEscape(c.impact)}</span></li>`).join('')}
        </ul>
      </div>
    </div>

    ${sectionLabel('J', htmlEscape(L.seoActionPlan), 'Roadmap de implementación semana a semana.')}
    <div class="analysis-block">
      <div class="analysis-title">${htmlEscape(L.week1)}</div>
      <p class="analysis-summary">${htmlEscape(ap.week1.actions)}</p>
      <p style="font-size:13px;color:#166534"><strong>${htmlEscape(L.expectedImpact)}:</strong> ${htmlEscape(ap.week1.impact)}</p>
    </div>
    <div class="analysis-block">
      <div class="analysis-title">${htmlEscape(L.weeks2to4)}</div>
      <p class="analysis-summary">${htmlEscape(ap.week2to4.actions)}</p>
      <p style="font-size:13px;color:#166534"><strong>${htmlEscape(L.expectedImpact)}:</strong> ${htmlEscape(ap.week2to4.impact)}</p>
    </div>
    <div class="analysis-block">
      <div class="analysis-title">${htmlEscape(L.month2to3)}</div>
      <p class="analysis-summary">${htmlEscape(ap.month2to3.actions)}</p>
      <p style="font-size:13px;color:#166534"><strong>${htmlEscape(L.expectedImpact)}:</strong> ${htmlEscape(ap.month2to3.impact)}</p>
    </div>

    ${sectionLabel('K', htmlEscape(L.seoFinalSummary), 'Conclusión y próximos pasos para mejorar el posicionamiento orgánico.')}
    <p>${htmlEscape(result.seoFinalSummary)}</p>

    <h2 style="margin-top:44px">Glosario</h2>
    ${glossaryHtml}
  `;

  return body;
}

export function exportSEOAuditToHtml(result: SEOAuditResult, brandName: string, targetUrl: string): void {
  const body = buildSEOAuditHtmlBody(result, brandName, targetUrl);
  const html = buildHtmlPage(`SEO Audit — ${brandName}`, 'SEO Audit', targetUrl, body);
  const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  triggerHtmlDownload(html, `seo-audit-${slug}-${fileDate()}.html`);
}
