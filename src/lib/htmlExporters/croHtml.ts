import type { AuditResult } from '../../types/audit';
import { CRO_GLOSSARY } from '../glossaries';
import { getLabels } from '../i18n';
import {
  htmlEscape, scoreBgColor, scoreLabel, scoreExplanation,
  buildBarChart, buildHtmlPage, triggerHtmlDownload, fileDate, formatDate, sectionLabel,
} from './shared';

export function buildCROAuditHtmlBody(result: AuditResult, brandName: string, targetUrl: string, includeReadyToUse = true): string {
  const L = getLabels(result.language);
  const sa = result.scoredAssessment;
  const overall = sa.weightedTotal / 10;
  const badgeColor = scoreBgColor(overall);

  const dims = [
    { label: L.croScoreRowLabels.valueProposition, score: sa.valueProposition / 10, weight: '20%' },
    { label: L.croScoreRowLabels.headline, score: sa.headline / 10, weight: '15%' },
    { label: L.croScoreRowLabels.cta, score: sa.cta / 10, weight: '15%' },
    { label: L.croScoreRowLabels.aboveTheFold, score: sa.aboveTheFold / 10, weight: '10%' },
    { label: L.croScoreRowLabels.narrativeFlow, score: sa.narrativeFlow / 10, weight: '10%' },
    { label: L.croScoreRowLabels.trustSignals, score: sa.trustSignals / 10, weight: '10%' },
    { label: L.croScoreRowLabels.objectionHandling, score: sa.objectionHandling / 10, weight: '10%' },
    { label: L.croScoreRowLabels.microCopy, score: sa.microCopy / 10, weight: '5%' },
    { label: L.croScoreRowLabels.accessibility, score: sa.accessibility / 10, weight: '5%' },
  ];

  const sortedDims = [...dims].sort((a, b) => b.score - a.score);
  const goodDims = sortedDims.filter(d => d.score >= 6.0);
  let strengthsHtml: string;
  if (goodDims.length > 0) {
    strengthsHtml = `<ul>${goodDims.map(d => {
      const finding = result.detailedFindings.find(f =>
        f.category.toLowerCase().includes(d.label.toLowerCase().slice(0, 8)) ||
        d.label.toLowerCase().includes(f.category.toLowerCase().slice(0, 8))
      );
      const note = finding && finding.analysis
        ? finding.analysis.split('. ')[0] + '.'
        : d.score >= 7.5 ? 'Funcionando bien.' : 'Por encima del promedio del sitio.';
      return `<li><strong>${htmlEscape(d.label)}</strong> (${d.score.toFixed(1)}/10) — ${htmlEscape(note)}</li>`;
    }).join('')}</ul>`;
  } else {
    const positiveKws = ['excelente', 'sólido', 'bien', 'adecuado', 'correcto', 'claro', 'positivo', 'buenas señales', 'extenso'];
    const positiveItems: string[] = [];
    for (const f of result.detailedFindings) {
      const sentences = [f.analysis, ...f.recommendations].join(' ').split(/(?<=[.!?])\s+/);
      const match = sentences.find(s => positiveKws.some(kw => s.toLowerCase().includes(kw)));
      if (match && positiveItems.length < 3) positiveItems.push(match.trim());
    }
    strengthsHtml = positiveItems.length > 0
      ? `<ul>${positiveItems.map(s => `<li>${htmlEscape(s)}</li>`).join('')}</ul>`
      : `<p style="color:#666;font-style:italic">Esta página tiene un amplio margen de mejora — las recomendaciones de este informe son el punto de partida.</p>`;
  }

  const topPriority = result.priorityTable[0];
  const nextActions = result.priorityTable.slice(0, 3);
  const nextStepsHtml = `
    <p>La acción más importante en este momento es <strong>${htmlEscape(topPriority?.recommendation || result.quickWins[0] || '')}</strong> — es lo que mayor impacto directo puede tener en tus conversiones.</p>
    <ul>
      ${nextActions.map(a => `<li>${htmlEscape(a.recommendation)}</li>`).join('')}
    </ul>
    <p>Implementando estos cambios, podrás mejorar visiblemente la tasa de conversión y el flujo de contactos en las próximas semanas.</p>`;

  const priorityCards = result.priorityTable.slice(0, 5).map((p, i) => {
    const ic = p.impact === 'High' ? 'badge-high' : p.impact === 'Medium' ? 'badge-medium' : 'badge-low';
    const ec = p.effort === 'High' ? 'badge-high' : p.effort === 'Medium' ? 'badge-medium' : 'badge-low';
    const consequenceHtml = p.consequence
      ? `<p class="priority-significa"><strong>Lo que esto significa:</strong> ${htmlEscape(p.consequence)}</p>`
      : '';
    return `
    <div class="priority-card">
      <div class="priority-num-badge">${i + 1}</div>
      <div class="priority-body">
        <div class="priority-title">${htmlEscape(p.recommendation)}</div>
        <div class="priority-meta">
          <span class="badge ${ic}">${p.impact} impact</span>
          <span class="badge ${ec}">${p.effort} effort</span>
          <span class="priority-time">${htmlEscape(p.timeframe)}</span>
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
      <div class="score-card-desc">${scoreExplanation(d.score)}</div>
    </div>`).join('')}
  </div>`;

  const detailedHtml = result.detailedFindings.map(f => `
    <div class="analysis-block">
      <div class="analysis-title">${htmlEscape(f.category)}</div>
      ${f.analysis ? `<p class="analysis-summary">${htmlEscape(f.analysis)}</p>` : ''}
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

  const rewritesHtml = result.copyRewrites.map((r, i) => `
    <div class="rewrite-card">
      <div class="rewrite-label">${i + 1}. ${htmlEscape(r.element)}</div>
      <div class="rewrite-cols">
        <div>
          <div class="col-label">${htmlEscape(L.current)}</div>
          <div class="rewrite-current">${htmlEscape(r.current)}</div>
        </div>
        <div>
          <div class="col-label">${htmlEscape(L.rewritten)}</div>
          <div class="rewrite-improved">${htmlEscape(r.improved)}</div>
        </div>
      </div>
      <div class="rewrite-rationale">${htmlEscape(r.rationale)}</div>
    </div>`).join('');

  let competitorHtml = '';
  if (result.competitorComparison && result.competitorComparison.length > 0) {
    competitorHtml = result.competitorComparison.map(c => `
      <div class="analysis-block">
        <div class="analysis-title">${htmlEscape(c.competitor)}</div>
        <div class="two-col">
          <div>
            <div class="col-label">${htmlEscape(L.whatTheyDoBetter)}</div>
            ${c.whatTheyDoBetter.length > 0
              ? `<ul class="issues-list">${c.whatTheyDoBetter.map(s => `<li>${htmlEscape(s)}</li>`).join('')}</ul>`
              : `<p style="font-size:13px;color:#888">—</p>`}
          </div>
          <div>
            <div class="col-label">${htmlEscape(L.whatYouDoBetter)}</div>
            ${c.whatYouDoBetter.length > 0
              ? `<ul class="recs-list">${c.whatYouDoBetter.map(s => `<li>${htmlEscape(s)}</li>`).join('')}</ul>`
              : `<p style="font-size:13px;color:#888">—</p>`}
          </div>
        </div>
        ${c.strengths.length > 0 ? `<p style="font-size:13px;color:#555;margin-top:8px"><strong>Fortalezas generales:</strong> ${htmlEscape(c.strengths.join(', '))}</p>` : ''}
      </div>`).join('');
  }

  let buyerHtml = '';
  if (result.buyerJourneyAnalysis) {
    const bj = result.buyerJourneyAnalysis;
    const buildJourneyCol = (
      cls: string,
      label: string,
      sub: string,
      analysis: string,
      gaps: string[],
      recs: string[]
    ) => `
      <div class="journey-col">
        <div class="journey-header ${cls}">${htmlEscape(label)}</div>
        <div class="journey-sub">${htmlEscape(sub)}</div>
        <p class="journey-desc">${htmlEscape(analysis)}</p>
        ${gaps.length > 0 ? `<div class="col-label">${htmlEscape(L.gaps)}</div><ul style="margin:0 0 10px;padding-left:16px;font-size:13px">${gaps.map(g => `<li>${htmlEscape(g)}</li>`).join('')}</ul>` : ''}
        ${recs.length > 0 ? `<div class="col-label">${htmlEscape(L.fix)}</div><ul style="margin:0;padding-left:16px;font-size:13px">${recs.map(r => `<li>${htmlEscape(r)}</li>`).join('')}</ul>` : ''}
      </div>`;
    buyerHtml = `<div class="journey-grid">
      ${buildJourneyCol('cold', L.coldVisitorLabel, L.coldVisitorSub, bj.coldVisitor.analysis, bj.coldVisitor.gaps, bj.coldVisitor.recommendations)}
      ${buildJourneyCol('warm', L.warmVisitorLabel, L.warmVisitorSub, bj.warmVisitor.analysis, bj.warmVisitor.gaps, bj.warmVisitor.recommendations || [])}
      ${buildJourneyCol('hot', L.hotVisitorLabel, L.hotVisitorSub, bj.hotVisitor.analysis, bj.hotVisitor.gaps, bj.hotVisitor.recommendations || [])}
    </div>`;
  }

  let triggersHtml = '';
  if (result.emotionalTriggers && result.emotionalTriggers.length > 0) {
    const rows = result.emotionalTriggers.map(t => {
      const isPresent = t.present === 'yes';
      const isPartial = t.present === 'partial';
      const cellBg = isPresent ? 'background:#DCFCE7;color:#166534' : isPartial ? 'background:#FEF9C3;color:#854D0E' : 'background:#FEE2E2;color:#991B1B';
      const st = isPresent ? '✅ Presente' : isPartial ? '⚠️ Parcial' : '❌ Ausente';
      return `<tr><td>${htmlEscape(t.trigger)}</td><td style="font-weight:600;${cellBg}">${st}</td><td>${htmlEscape(t.implementation)}</td></tr>`;
    }).join('');
    triggersHtml = `<table><thead><tr><th>Trigger</th><th>Estado</th><th>Implementación</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  let pricingHtml = '';
  if (result.pricingPsychology) {
    const pp = result.pricingPsychology;
    pricingHtml = `<p>${htmlEscape(pp.analysis)}</p>
      <div class="two-col">
        <div>
          <div class="col-label">Hallazgos</div>
          ${pp.findings.length > 0 ? `<ul class="issues-list">${pp.findings.map(f => `<li>${htmlEscape(f)}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:#888">—</p>'}
        </div>
        <div>
          <div class="col-label">Recomendaciones</div>
          ${pp.recommendations.length > 0 ? `<ul class="recs-list">${pp.recommendations.map(r => `<li>${htmlEscape(r)}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:#888">—</p>'}
        </div>
      </div>`;
  }

  let geoHtml = '';
  if (result.geoAIReadiness) {
    const g = result.geoAIReadiness;
    geoHtml = `<p>${htmlEscape(g.analysis)}</p>
      <div class="two-col">
        <div>
          <div class="col-label">Hallazgos</div>
          ${g.findings.length > 0 ? `<ul class="issues-list">${g.findings.map(f => `<li>${htmlEscape(f)}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:#888">—</p>'}
        </div>
        <div>
          <div class="col-label">Recomendaciones</div>
          ${g.recommendations.length > 0 ? `<ul class="recs-list">${g.recommendations.map(r => `<li>${htmlEscape(r)}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:#888">—</p>'}
        </div>
      </div>`;
  }

  let mobileHtml = '';
  if (result.mobileAnalysis) {
    const m = result.mobileAnalysis;
    mobileHtml = `<p>${htmlEscape(m.analysis)}</p>
      <div class="two-col">
        <div>
          <div class="col-label">Hallazgos</div>
          ${m.findings.length > 0 ? `<ul class="issues-list">${m.findings.map(f => `<li>${htmlEscape(f)}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:#888">—</p>'}
        </div>
        <div>
          <div class="col-label">Recomendaciones</div>
          ${m.recommendations.length > 0 ? `<ul class="recs-list">${m.recommendations.map(r => `<li>${htmlEscape(r)}</li>`).join('')}</ul>` : '<p style="font-size:13px;color:#888">—</p>'}
        </div>
      </div>`;
  }

  let contentHtml = '';
  if (result.readyToUseContent && result.readyToUseContent.length > 0) {
    contentHtml = result.readyToUseContent.map((b, i) => `
      <div class="rewrite-card">
        <div class="rewrite-label">${i + 1}. ${htmlEscape(b.sectionTitle)}</div>
        <p style="font-size:13px;color:#666;margin:4px 0 8px">Ubicación: ${htmlEscape(b.placement)} · Categoría: ${htmlEscape(b.category)}</p>
        <div style="background:#f0fdf4;padding:12px;border-radius:6px;font-size:14px">${htmlEscape(b.content)}</div>
        <div class="rewrite-rationale">${htmlEscape(b.rationale)}</div>
      </div>`).join('');
  }

  const abGrid = result.abTests.length > 0 ? `<div class="ab-grid">${result.abTests.map((t, idx) => {
    const ic = t.expectedImpact === 'High' ? 'badge-high' : t.expectedImpact === 'Medium' ? 'badge-medium' : 'badge-low';
    const element = (t as any).element || (t as any).test || '';
    const control = (t as any).controlVariant || (t as any).hypothesis || '';
    const variantB = (t as any).variantB || '';
    const metric = (t as any).primaryMetric || (t as any).metric || '';
    const duration = (t as any).suggestedDuration || '';
    return `<div class="ab-card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="width:22px;height:22px;border-radius:50%;background:#111;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${idx + 1}</span>
        <div class="ab-name">${htmlEscape(element)}</div>
        <span class="badge ${ic}" style="margin-left:auto">${t.expectedImpact}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div style="background:#fef2f2;border-left:3px solid #f87171;padding:8px;border-radius:0 4px 4px 0;font-size:13px"><strong style="color:#dc2626;font-size:11px;display:block;margin-bottom:4px;text-transform:uppercase">Control</strong>${htmlEscape(control)}</div>
        <div style="background:#f0fdf4;border-left:3px solid #4ade80;padding:8px;border-radius:0 4px 4px 0;font-size:13px"><strong style="color:#16a34a;font-size:11px;display:block;margin-bottom:4px;text-transform:uppercase">Variante B</strong>${htmlEscape(variantB)}</div>
      </div>
      <div style="font-size:12px;color:#6b7280"><strong>Métrica:</strong> ${htmlEscape(metric)} · <strong>Plazo:</strong> ${htmlEscape(duration)}</div>
    </div>`;
  }).join('')}</div>` : '';

  const glossaryHtml = CRO_GLOSSARY.map(g =>
    `<div class="glossary-item"><span class="glossary-term">${htmlEscape(g.term)}:</span> ${htmlEscape(g.definition)}</div>`
  ).join('');

  const body = `
    <h1>${htmlEscape(brandName)} — CRO Audit</h1>
    <p style="color:#888;font-size:14px">${htmlEscape(targetUrl)} · ${formatDate()}</p>

    <div class="score-hero">
      <div class="score-number" style="color:${badgeColor}">${overall.toFixed(1)}</div>
      <div>
        <div><span class="score-badge" style="background:${badgeColor}">${scoreLabel(overall)}</span></div>
        <p class="score-sub">${scoreExplanation(overall)}</p>
      </div>
    </div>

    ${sectionLabel('A', 'Resumen ejecutivo', 'Estado general de conversión y puntos clave de la página.')}
    <p>${htmlEscape(result.executiveSummary)}</p>
    ${result.contextIdentification ? `
    <table style="margin-top:16px">
      <tr><td><strong>Objetivo de conversión</strong></td><td>${htmlEscape(result.contextIdentification.primaryConversionGoal)}</td></tr>
      <tr><td><strong>Audiencia objetivo</strong></td><td>${htmlEscape(result.contextIdentification.targetAudience)}</td></tr>
      <tr><td><strong>Contexto de tráfico</strong></td><td>${htmlEscape(result.contextIdentification.trafficContext)}</td></tr>
      <tr><td><strong>Mercado / industria</strong></td><td>${htmlEscape(result.contextIdentification.marketIndustry)}</td></tr>
    </table>` : ''}
    <h3>Lo que ya está funcionando bien</h3>
    ${strengthsHtml}
    <h3>¿Qué sigue?</h3>
    ${nextStepsHtml}

    ${sectionLabel('B', 'Recomendaciones prioritarias', 'Los cambios de mayor impacto, ordenados por urgencia y facilidad de implementación.')}
    ${priorityCards}
    <h3 style="margin-top:28px">Tabla de prioridades completa</h3>
    <table>
      <thead><tr><th>#</th><th>Recomendación</th><th>Categoría</th><th>Impacto</th><th>Esfuerzo</th><th>Plazo</th></tr></thead>
      <tbody>${result.priorityTable.map(p => {
        const ic = p.impact === 'High' ? 'badge-high' : p.impact === 'Medium' ? 'badge-medium' : 'badge-low';
        const ec = p.effort === 'High' ? 'badge-high' : p.effort === 'Medium' ? 'badge-medium' : 'badge-low';
        return `<tr>
          <td>${p.priority}</td>
          <td>${htmlEscape(p.recommendation)}</td>
          <td>${htmlEscape(p.category)}</td>
          <td><span class="badge ${ic}">${p.impact}</span></td>
          <td><span class="badge ${ec}">${p.effort}</span></td>
          <td>${htmlEscape(p.timeframe)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>

    ${sectionLabel('C', htmlEscape(L.scoredAssessment.replace(/^[A-Z\d][\.\s–]+\s*/, '')), 'Puntuación ponderada de cada área clave de conversión.')}
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

    ${sectionLabel('D', 'Análisis detallado', 'Diagnóstico profundo de cada dimensión con issues y recomendaciones.')}
    ${detailedHtml}

    ${sectionLabel('E', htmlEscape(L.copyTeardown.replace(/^[A-Z\d][\.\s–]+\s*/, '')), 'Versiones actuales vs. mejoradas listas para implementar.')}
    ${rewritesHtml || '<p style="color:#888;font-size:13px">No hay rewrites disponibles para esta auditoría.</p>'}
    ${includeReadyToUse && contentHtml ? `<h3 style="margin-top:24px">Contenido listo para usar</h3>${contentHtml}` : ''}

    ${result.competitorComparison && result.competitorComparison.length > 0 ? `
    ${sectionLabel('F', 'Análisis competitivo', 'Cómo se compara tu página frente a la competencia.')}
    ${competitorHtml}` : ''}

    ${result.buyerJourneyAnalysis ? `
    ${sectionLabel('G', 'Recorrido del comprador', 'Cómo responde tu página a cada etapa de conciencia del visitante.')}
    ${buyerHtml}` : ''}

    ${result.emotionalTriggers && result.emotionalTriggers.length > 0 ? `
    ${sectionLabel('H', 'Triggers emocionales', 'Cuáles desencadenantes emocionales están activos en tu página.')}
    ${triggersHtml}` : ''}

    ${result.pricingPsychology ? `
    ${sectionLabel('I', 'Psicología de precios', 'Cómo tu estructura de precios influye en la decisión de compra.')}
    ${pricingHtml}` : ''}

    ${result.geoAIReadiness ? `
    ${sectionLabel('J', 'Preparación GEO / IA', 'Qué tan optimizada está tu página para búsqueda semántica e inteligencia artificial.')}
    ${geoHtml}` : ''}

    ${result.mobileAnalysis ? `
    ${sectionLabel('K', 'Análisis mobile', 'Diagnóstico específico de la experiencia en dispositivos móviles.')}
    ${mobileHtml}` : ''}

    ${sectionLabel('L – M', 'Quick wins & Cambios de alto impacto', 'Dos velocidades de mejora: rápido con bajo esfuerzo, y profundo con alto retorno.')}
    <div class="two-col">
      <div>
        <div class="col-label">L — Quick wins</div>
        <ul class="wins-list">
          ${result.quickWins.map(w => `<li><span class="check-icon">✓</span><span>${htmlEscape(w)}</span></li>`).join('')}
        </ul>
      </div>
      <div>
        <div class="col-label">M — Cambios de alto impacto</div>
        <ul class="wins-list">
          ${result.highImpactChanges.map(c => `<li><span class="star-icon">★</span><span>${htmlEscape(c)}</span></li>`).join('')}
        </ul>
      </div>
    </div>

    ${(() => {
      if (!result.pageWireframe) return '';
      const wf = result.pageWireframe;
      const currentStructureHtml = wf.currentStructure && wf.currentStructure.length > 0
        ? `<div style="margin-bottom:16px">
            <div class="col-label">Estructura actual</div>
            <ol class="wireframe-current-list">${wf.currentStructure.map(item => `<li>${htmlEscape(item)}</li>`).join('')}</ol>
          </div>`
        : '';
      const structuralProblemsHtml = wf.structuralProblems && wf.structuralProblems.length > 0
        ? `<div style="margin-bottom:16px">
            <div class="col-label" style="color:#D97706">Problemas estructurales</div>
            <ul class="issues-list">${wf.structuralProblems.map(p => `<li>${htmlEscape(p)}</li>`).join('')}</ul>
          </div>`
        : '';
      const zonesHtml = (wf.recommendedZones ?? []).map(zone => {
        const borderColor = zone.status === 'exists_correct' ? '#22c55e'
          : (zone.status === 'move_up' || zone.status === 'move_down') ? '#3b82f6'
          : zone.status === 'missing' ? '#ef4444'
          : '#d1d5db';
        const badgeBg = zone.status === 'exists_correct' ? '#dcfce7'
          : (zone.status === 'move_up' || zone.status === 'move_down') ? '#dbeafe'
          : zone.status === 'missing' ? '#fee2e2'
          : '#f3f4f6';
        const badgeColor = zone.status === 'exists_correct' ? '#166534'
          : (zone.status === 'move_up' || zone.status === 'move_down') ? '#1d4ed8'
          : zone.status === 'missing' ? '#991b1b'
          : '#6b7280';
        const statusLabel = zone.status === 'exists_correct' ? 'Correcto'
          : zone.status === 'move_up' ? 'Mover arriba'
          : zone.status === 'move_down' ? 'Mover abajo'
          : zone.status === 'missing' ? 'Faltante'
          : zone.status === 'reduce' ? 'Reducir'
          : htmlEscape(zone.status);
        const positionNote = zone.currentPosition != null
          ? `<span style="font-size:12px;color:#9ca3af">(actualmente en posición ${zone.currentPosition})</span>`
          : '';
        return `<div class="wireframe-zone" style="border-left:4px solid ${borderColor}">
          <div class="wireframe-zone-num">${zone.zone}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:14px;font-weight:700;color:#111">${htmlEscape(zone.name)}</span>
              <span class="wireframe-badge" style="background:${badgeBg};color:${badgeColor}">${statusLabel}</span>
              ${positionNote}
            </div>
            <p style="font-size:13px;color:#374151;margin:0">${htmlEscape(zone.description)}</p>
          </div>
        </div>`;
      }).join('');
      return `
    ${sectionLabel('N', 'Prosa Wireframe — Estructura recomendada', 'Diagnóstico visual de la arquitectura actual y el orden óptimo de secciones para maximizar la conversión.')}
    ${currentStructureHtml}
    ${structuralProblemsHtml}
    <div>
      <div class="col-label">Estructura recomendada de página</div>
      <div class="wireframe-zones">${zonesHtml}</div>
    </div>`;
    })()}

    ${sectionLabel('O', 'Tests A/B recomendados', 'Experimentos de alta probabilidad para validar mejoras de conversión.')}
    ${abGrid || '<p style="color:#888;font-size:13px">No hay tests disponibles.</p>'}

    ${sectionLabel('P', 'Plan de acción', 'Roadmap de implementación en 30, 60 y 90 días.')}
    <h3>Primeros 30 días</h3>
    <ul>${result.actionPlan['30days'].map(a => `<li>${htmlEscape(a)}</li>`).join('')}</ul>
    <h3>60 días</h3>
    <ul>${result.actionPlan['60days'].map(a => `<li>${htmlEscape(a)}</li>`).join('')}</ul>
    <h3>90 días</h3>
    <ul>${result.actionPlan['90days'].map(a => `<li>${htmlEscape(a)}</li>`).join('')}</ul>

    ${sectionLabel('Q', 'Resumen final', 'Conclusión y próximos pasos para maximizar la conversión.')}
    <p>${htmlEscape(result.finalSummary)}</p>

    <h2 style="margin-top:44px">Glosario</h2>
    ${glossaryHtml}
  `;

  return body;
}

export function exportCROAuditToHtml(result: AuditResult, brandName: string, targetUrl: string): void {
  const body = buildCROAuditHtmlBody(result, brandName, targetUrl);
  const html = buildHtmlPage(`CRO Audit — ${brandName}`, 'CRO Audit', targetUrl, body);
  const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  triggerHtmlDownload(html, `cro-audit-${slug}-${fileDate()}.html`);
}
