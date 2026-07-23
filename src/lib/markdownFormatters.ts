import type { AuditResult, SEOAuditResult } from '../types/audit';
import type { CopyAnalysisResult } from '../types/copyAnalysis';
import { glossaryToMarkdown, CRO_GLOSSARY, SEO_GLOSSARY, COPY_GLOSSARY } from './glossaries';
import { getLabels } from './i18n';
import { callClaude } from './callClaude';
import type { FontFileInfo, CssExtractResult } from './firecrawl';

// ─── Branding .md export ──────────────────────────────────────────────────────

interface BrandingForExport {
  colorScheme?: string;
  colors?: Record<string, string> | Array<{ name?: string; value?: string; hex?: string; [k: string]: string | undefined }>;
  fonts?: Array<{ family?: string; [k: string]: string | undefined }>;
  typography?: {
    fontFamilies?: Record<string, string>;
    fontSizes?: Record<string, string>;
    fontWeights?: Record<string, string | number>;
    lineHeights?: Record<string, string | number>;
  };
  spacing?: {
    baseUnit?: string | number;
    borderRadius?: string;
    scale?: Record<string, string>;
    [k: string]: unknown;
  };
  components?: Record<string, unknown>;
  animations?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  personality?: Record<string, unknown>;
  logo?: string;
  favicon?: string;
  ogImage?: string;
  images?: { logo?: string; favicon?: string; ogImage?: string };
}

function resolveColors(
  colors: BrandingForExport['colors']
): Array<{ name: string; value: string }> {
  if (!colors) return [];
  if (Array.isArray(colors)) {
    return colors.flatMap((c, i) => {
      const name = c.name || c.label || `color${i + 1}`;
      const value = c.value || c.hex || c.color || '';
      return value ? [{ name: String(name), value: String(value) }] : [];
    });
  }
  return Object.entries(colors).flatMap(([n, v]) => v ? [{ name: n, value: v }] : []);
}

function toYamlValue(v: unknown): string {
  if (typeof v === 'string') return v.includes('\n') || v.includes(':') ? `"${v.replace(/"/g, '\\"')}"` : v;
  return String(v);
}

function buildBrandingYamlFrontmatter(data: BrandingForExport, siteName: string): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`version: alpha`);
  lines.push(`name: ${siteName}`);

  // description from personality
  const desc = data.personality?.tagline || data.personality?.description || data.personality?.voice || '';
  if (desc) lines.push(`description: "${String(desc).replace(/"/g, '\\"')}"`);

  // colors
  const colorEntries = resolveColors(data.colors);
  if (colorEntries.length > 0) {
    lines.push('colors:');
    colorEntries.forEach(({ name, value }) => {
      const key = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      lines.push(`  ${key}: "${value}"`);
    });
  }

  // typography — build structured roles from fontSizes + fontFamilies
  const typo = data.typography;
  if (typo) {
    const families = typo.fontFamilies ?? {};
    const sizes = typo.fontSizes ?? {};
    const weights = typo.fontWeights ?? {};
    const lineHeights = typo.lineHeights ?? {};

    // Try to identify display/h1/body/label roles
    const roles: Record<string, { fontFamily?: string; fontSize?: string; fontWeight?: string | number; lineHeight?: string | number }> = {};

    const assignRole = (key: string, label: string) => {
      roles[label] = {
        fontFamily: families[key] || families['body'] || families['base'] || Object.values(families)[0],
        fontSize: sizes[key],
        fontWeight: weights[key],
        lineHeight: lineHeights[key],
      };
    };

    ['display', 'heading', 'h1', 'h2', 'h3', 'body', 'base', 'label', 'caption', 'small'].forEach(role => {
      if (sizes[role] || families[role]) assignRole(role, role);
    });

    // If no roles matched, synthesize from raw keys
    if (Object.keys(roles).length === 0) {
      const sizeKeys = Object.keys(sizes);
      if (sizeKeys.length > 0) {
        sizeKeys.forEach(k => {
          roles[k] = {
            fontFamily: families[k] || Object.values(families)[0],
            fontSize: sizes[k],
            fontWeight: weights[k],
            lineHeight: lineHeights[k],
          };
        });
      } else if (Object.keys(families).length > 0) {
        Object.entries(families).forEach(([k, v]) => {
          roles[k] = { fontFamily: v };
        });
      }
    }

    if (Object.keys(roles).length > 0) {
      lines.push('typography:');
      Object.entries(roles).forEach(([role, props]) => {
        lines.push(`  ${role}:`);
        if (props.fontFamily) lines.push(`    fontFamily: ${props.fontFamily}`);
        if (props.fontSize) lines.push(`    fontSize: ${props.fontSize}`);
        if (props.fontWeight !== undefined) lines.push(`    fontWeight: ${props.fontWeight}`);
        if (props.lineHeight !== undefined) lines.push(`    lineHeight: ${props.lineHeight}`);
      });
    }
  }

  // spacing / rounded
  const sp = data.spacing;
  if (sp) {
    const scale = sp.scale ?? {};
    const smKeys = ['sm', 'small', 'xs'];
    const mdKeys = ['md', 'medium', 'base', 'default'];
    const lgKeys = ['lg', 'large', 'xl'];
    const sm = smKeys.map(k => scale[k]).find(Boolean) ?? (sp.baseUnit ? `${sp.baseUnit}px` : undefined);
    const md = mdKeys.map(k => scale[k]).find(Boolean);
    const lg = lgKeys.map(k => scale[k]).find(Boolean);
    if (sm || md || lg) {
      lines.push('spacing:');
      if (sm) lines.push(`  sm: ${sm}`);
      if (md) lines.push(`  md: ${md}`);
      if (lg) lines.push(`  lg: ${lg}`);
    }
    if (sp.borderRadius) {
      lines.push('rounded:');
      lines.push(`  default: ${sp.borderRadius}`);
    }
  }

  // components
  const comps = data.components ?? {};
  if (Object.keys(comps).length > 0) {
    lines.push('components:');
    Object.entries(comps).forEach(([name, styles]) => {
      if (!styles || typeof styles !== 'object') return;
      lines.push(`  ${name}:`);
      Object.entries(styles as Record<string, unknown>).forEach(([prop, val]) => {
        if (val === null || val === undefined) return;
        lines.push(`    ${prop}: ${toYamlValue(val)}`);
      });
    });
  }

  lines.push('---');
  return lines.join('\n');
}

function buildCssSection(css: CssExtractResult | null): string {
  if (!css) return '';

  const hasTokens = css.customProperties.length > 0;
  const hasColors = css.colors.length > 0;
  if (!hasTokens && !hasColors) return '';

  const lines: string[] = ['', '---', '', '## CSS Design Tokens', ''];

  if (hasTokens) {
    lines.push('### Custom Properties');
    lines.push('');
    lines.push('| Variable | Value | Selector |');
    lines.push('|----------|-------|----------|');
    css.customProperties.slice(0, 100).forEach(cp => {
      const sel = cp.selector.length > 50 ? cp.selector.slice(0, 50) + '…' : cp.selector;
      lines.push(`| \`${cp.name}\` | \`${cp.value}\` | \`${sel}\` |`);
    });
    if (css.customProperties.length > 100) {
      lines.push(`| *(${css.customProperties.length - 100} more…)* | | |`);
    }
    lines.push('');
  }

  if (hasColors) {
    lines.push('### Implemented Colors');
    lines.push('');
    lines.push('Top 20 colors by frequency of use in the codebase.');
    lines.push('');
    lines.push('| Color | Used × |');
    lines.push('|-------|--------|');
    css.colors.slice(0, 20).forEach(c => {
      lines.push(`| \`${c.value}\` | ${c.count} |`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

export async function generateBrandingMarkdown(
  data: BrandingForExport,
  siteName: string,
  siteUrl: string,
  anthropicKey: string,
  fontFiles: FontFileInfo[] = [],
  cssData: CssExtractResult | null = null
): Promise<string> {
  const frontmatter = buildBrandingYamlFrontmatter(data, siteName);

  const colorEntries = resolveColors(data.colors);
  const colorSummary = colorEntries.map(({ name, value }) => `${name}: ${value}`).join(', ');
  const fontFamilies: string[] = [];
  (data.fonts ?? []).forEach(f => { if (f.family && !fontFamilies.includes(f.family)) fontFamilies.push(f.family); });
  Object.values(data.typography?.fontFamilies ?? {}).forEach(f => { if (f && !fontFamilies.includes(f)) fontFamilies.push(f); });

  const systemPrompt = `You are a senior brand strategist writing design-system documentation in Markdown.
Write concise, editorial, opinionated copy — not generic filler.
The output must contain EXACTLY these sections, nothing else, no extra headers:
## Overview
## Colors
## Typography
## Do's and Don'ts

Rules:
- Overview: 1–2 sentences. Describe the visual mood and design philosophy. Be specific and evocative.
- Colors: 2–3 sentences introducing the palette philosophy, then a bullet per color using bold name + hex. Describe each color's role and usage intent.
- Typography: 1–2 sentences on the typographic system, then bullets per role/scale entry. Each bullet: bold role + font + size if known.
- Do's and Don'ts: 3–4 bullet pairs (Do / Don't). Infer from the actual palette and type choices. Be prescriptive and opinionated.
- No placeholders, no "N/A", no meta-commentary.`;

  const userPrompt = `Generate brand documentation for: ${siteName} (${siteUrl})

Color palette: ${colorSummary || 'not detected'}
Font families: ${fontFamilies.join(', ') || 'not detected'}
Font sizes: ${JSON.stringify(data.typography?.fontSizes ?? {})}
Font weights: ${JSON.stringify(data.typography?.fontWeights ?? {})}
Components: ${Object.keys(data.components ?? {}).join(', ') || 'none detected'}
Color scheme: ${data.colorScheme ?? 'unknown'}
Brand personality: ${JSON.stringify(data.personality ?? {})}
Spacing/border radius: ${JSON.stringify(data.spacing ?? {})}

Write the four sections now. Be specific to this brand — do not write generic advice.`;

  const narrative = await callClaude(anthropicKey, systemPrompt, userPrompt, 2000);

  let fontSection = '';
  if (fontFiles.length > 0) {
    const byFamily: Record<string, FontFileInfo[]> = {};
    for (const ff of fontFiles) {
      if (!byFamily[ff.family]) byFamily[ff.family] = [];
      byFamily[ff.family].push(ff);
    }
    const lines: string[] = ['', '## Font Files (Self-Hosted)', ''];
    for (const [family, files] of Object.entries(byFamily)) {
      lines.push(`### ${family}`);
      lines.push('');
      for (const ff of files) {
        lines.push(`- [\`${ff.url.split('/').pop()?.split('?')[0]}\`](${ff.url}) — \`${ff.format.toUpperCase()}\``);
      }
      lines.push('');
    }
    fontSection = lines.join('\n');
  }

  const cssSection = buildCssSection(cssData);

  return `${frontmatter}\n${narrative.trim()}\n${fontSection}${cssSection}`;
}


function statusTag(score: number): string {
  if (score < 6.0) return '🔴 Atención urgente';
  if (score < 7.5) return '🟡 Necesita mejora';
  return '🟢 Funcionando bien';
}

function firstSentence(text: string): string {
  if (!text) return '';
  const s = text.split(/[.!?]/)[0].trim();
  return s.length > 10 ? s : text.substring(0, 80).trim();
}

function buildCROClientSummary(result: AuditResult): string[] {
  const lines: string[] = [];
  const sa = result.scoredAssessment;

  const conversionScore = ((sa.cta + sa.aboveTheFold) / 2) / 10;
  const disenioScore = ((sa.headline + sa.valueProposition) / 2) / 10;
  const confianzaScore = sa.trustSignals / 10;

  const findingFor = (keywords: string[]): string => {
    const match = result.detailedFindings.find(f =>
      keywords.some(k => f.category.toLowerCase().includes(k.toLowerCase()))
    );
    if (match?.issues[0]) return firstSentence(match.issues[0]);
    if (match?.analysis) return firstSentence(match.analysis);
    return '';
  };

  const conversionNote = findingFor(['cta', 'call to action', 'above the fold', 'fold']) || 'Revisión necesaria en elementos de conversión';
  const disenioNote = findingFor(['headline', 'value proposition', 'heading', 'title']) || 'Revisión necesaria en elementos de diseño';
  const confianzaNote = findingFor(['trust', 'testimonial', 'review', 'social proof', 'credibility']) || 'Revisión necesaria en señales de confianza';

  lines.push('---');
  lines.push('');
  lines.push('## Estado general');
  lines.push('');
  lines.push('| Dimensión | Estado | Nota |');
  lines.push('|-----------|--------|------|');
  lines.push(`| Conversión | ${statusTag(conversionScore)} | ${conversionNote} |`);
  lines.push(`| Diseño | ${statusTag(disenioScore)} | ${disenioNote} |`);
  lines.push(`| Confianza | ${statusTag(confianzaScore)} | ${confianzaNote} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Prioridades principales');
  lines.push('');

  const topPriorities = [...result.priorityTable]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  topPriorities.forEach((item, idx) => {
    const matchingFinding = result.detailedFindings.find(f =>
      f.category.toLowerCase().includes(item.category.toLowerCase()) ||
      item.category.toLowerCase().includes(f.category.toLowerCase())
    );
    let businessImpact = '';
    if (matchingFinding?.issues[0]) {
      businessImpact = firstSentence(matchingFinding.issues[0]);
    } else if (matchingFinding?.analysis) {
      businessImpact = firstSentence(matchingFinding.analysis);
    } else {
      businessImpact = firstSentence(item.recommendation);
    }

    lines.push(`### ${idx + 1}. ${item.recommendation}`);
    lines.push(`${firstSentence(item.recommendation)}.`);
    lines.push('');
    lines.push(`**Lo que esto significa para tu negocio:** ${businessImpact}.`);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('## Lo que ya está funcionando bien');
  lines.push('');

  const scoreEntries: Array<{ name: string; score: number; key: keyof typeof sa }> = [
    { name: 'Value Proposition', score: sa.valueProposition / 10, key: 'valueProposition' },
    { name: 'Headline', score: sa.headline / 10, key: 'headline' },
    { name: 'Call to Action', score: sa.cta / 10, key: 'cta' },
    { name: 'Above the Fold', score: sa.aboveTheFold / 10, key: 'aboveTheFold' },
    { name: 'Narrative Flow', score: sa.narrativeFlow / 10, key: 'narrativeFlow' },
    { name: 'Trust Signals', score: sa.trustSignals / 10, key: 'trustSignals' },
    { name: 'Objection Handling', score: sa.objectionHandling / 10, key: 'objectionHandling' },
    { name: 'Micro Copy', score: sa.microCopy / 10, key: 'microCopy' },
    { name: 'Accessibility', score: sa.accessibility / 10, key: 'accessibility' },
  ];

  const strengths = scoreEntries
    .filter(e => e.score >= 7.0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (strengths.length > 0) {
    strengths.forEach(s => {
      const finding = result.detailedFindings.find(f =>
        f.category.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
      );
      const note = finding?.analysis ? firstSentence(finding.analysis) : `${s.name} está bien ejecutado con un puntaje de ${s.score.toFixed(1)}/10`;
      lines.push(`- ${note}`);
    });
  } else {
    lines.push('- El análisis muestra oportunidades de mejora en la mayoría de las dimensiones evaluadas');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## ¿Qué sigue?');
  lines.push('');

  const next30 = result.actionPlan['30days'][0] || '';
  const next60 = result.actionPlan['60days'][0] || '';
  lines.push(`El siguiente paso es implementar las acciones de los primeros 30 días: ${next30}. ${next60 ? `Esto abrirá camino para ${next60}, con un impacto directo en tu tasa de conversión.` : 'Aplica estos cambios de forma consistente para ver mejoras medibles en tu tasa de conversión.'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  return lines;
}

function buildSEOClientSummary(result: SEOAuditResult): string[] {
  const lines: string[] = [];
  const sc = result.seoScoreCard;

  const visibilidadScore = sc.titleMeta / 10;
  const estructuraScore = sc.headingStructure / 10;
  const contenidoScore = sc.contentQuality / 10;

  const findingFor = (key: string): string => {
    const match = result.detailedAnalysis.find(f =>
      f.dimension.toLowerCase().includes(key.toLowerCase())
    );
    if (match?.issues[0]) return firstSentence(match.issues[0]);
    if (match?.currentState) return firstSentence(match.currentState);
    return '';
  };

  const visibilidadNote = findingFor('title') || findingFor('meta') || 'Revisión necesaria en título y meta descripción';
  const estructuraNote = findingFor('heading') || 'Revisión necesaria en estructura de encabezados';
  const contenidoNote = findingFor('content quality') || findingFor('content') || 'Revisión necesaria en calidad de contenido';

  lines.push('---');
  lines.push('');
  lines.push('## Estado general');
  lines.push('');
  lines.push('| Dimensión | Estado | Nota |');
  lines.push('|-----------|--------|------|');
  lines.push(`| Visibilidad | ${statusTag(visibilidadScore)} | ${visibilidadNote} |`);
  lines.push(`| Estructura | ${statusTag(estructuraScore)} | ${estructuraNote} |`);
  lines.push(`| Contenido | ${statusTag(contenidoScore)} | ${contenidoNote} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Prioridades principales');
  lines.push('');

  const topChanges = result.seoHighImpactChanges.slice(0, 3);

  topChanges.forEach((item, idx) => {
    const businessImpact = item.impact ? firstSentence(item.impact) : firstSentence(item.action);
    lines.push(`### ${idx + 1}. ${item.action}`);
    lines.push(`${firstSentence(item.action)}.`);
    lines.push('');
    lines.push(`**Lo que esto significa para tu negocio:** ${businessImpact}.`);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('## Lo que ya está funcionando bien');
  lines.push('');

  const scoreEntries = [
    { name: 'Title & Meta', score: sc.titleMeta / 10, dimKey: 'title' },
    { name: 'Heading Structure', score: sc.headingStructure / 10, dimKey: 'heading' },
    { name: 'Content Quality', score: sc.contentQuality / 10, dimKey: 'content quality' },
    { name: 'Keyword Optimization', score: sc.keywordOptimization / 10, dimKey: 'keyword' },
    { name: 'Links', score: sc.links / 10, dimKey: 'link' },
    { name: 'Image & Media', score: sc.imageMedia / 10, dimKey: 'image' },
    { name: 'Schema', score: sc.schemaStructuredData / 10, dimKey: 'schema' },
    { name: 'Content Architecture', score: sc.contentArchitecture / 10, dimKey: 'architecture' },
  ];

  const strengths = scoreEntries
    .filter(e => e.score >= 7.0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (strengths.length > 0) {
    strengths.forEach(s => {
      const finding = result.detailedAnalysis.find(f =>
        f.dimension.toLowerCase().includes(s.dimKey)
      );
      const note = finding?.currentState
        ? firstSentence(finding.currentState)
        : `${s.name} está bien optimizado con un puntaje de ${s.score.toFixed(1)}/10`;
      lines.push(`- ${note}`);
    });
  } else {
    lines.push('- El análisis identifica áreas clave de mejora para aumentar la visibilidad en buscadores');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## ¿Qué sigue?');
  lines.push('');

  const week1 = result.seoActionPlan.week1.actions ? firstSentence(result.seoActionPlan.week1.actions) : '';
  const week1Impact = result.seoActionPlan.week1.impact ? firstSentence(result.seoActionPlan.week1.impact) : '';
  lines.push(`El primer paso es enfocarse en la semana 1: ${week1 || 'implementar las correcciones técnicas prioritarias'}. ${week1Impact ? `Esto se traduce en: ${week1Impact}.` : 'Con estos cambios aplicados verás una mejora medible en el posicionamiento orgánico.'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  return lines;
}

function buildCopyClientSummary(result: CopyAnalysisResult): string[] {
  const lines: string[] = [];

  const getDimScore = (name: string): number => {
    const dim = result.dimensionAverages.find(d =>
      d.dimension.toLowerCase().includes(name.toLowerCase())
    );
    return dim ? Number(dim.average) : 5.0;
  };

  const mensajeScore = getDimScore('clarity') || getDimScore('claridad');
  const tonoScore = getDimScore('emotional') || getDimScore('emocional');
  const persuasionScore = getDimScore('persuasion') || getDimScore('persuasion strength');

  const getDimNote = (name: string): string => {
    const dim = result.dimensionAverages.find(d =>
      d.dimension.toLowerCase().includes(name.toLowerCase())
    );
    return dim?.assessment ? firstSentence(dim.assessment) : '';
  };

  const mensajeNote = getDimNote('clarity') || getDimNote('claridad') || 'Revisión necesaria en claridad del mensaje';
  const tonoNote = getDimNote('emotional') || getDimNote('emocional') || 'Revisión necesaria en tono emocional';
  const persuasionNote = getDimNote('persuasion') || 'Revisión necesaria en persuasión';

  lines.push('---');
  lines.push('');
  lines.push('## Estado general');
  lines.push('');
  lines.push('| Dimensión | Estado | Nota |');
  lines.push('|-----------|--------|------|');
  lines.push(`| Mensaje | ${statusTag(mensajeScore)} | ${mensajeNote} |`);
  lines.push(`| Tono | ${statusTag(tonoScore)} | ${tonoNote} |`);
  lines.push(`| Persuasión | ${statusTag(persuasionScore)} | ${persuasionNote} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Prioridades principales');
  lines.push('');

  const topPriorities = result.topPriorityRewrites.slice(0, 3);

  topPriorities.forEach((item, idx) => {
    const businessImpact = firstSentence(item.issue);
    lines.push(`### ${idx + 1}. Sección ${item.blockNumber} — ${item.issue}`);
    lines.push(`${firstSentence(item.issue)}.`);
    lines.push('');
    lines.push(`**Lo que esto significa para tu negocio:** ${businessImpact}.`);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('## Lo que ya está funcionando bien');
  lines.push('');

  const strengths = result.dimensionAverages
    .filter(d => Number(d.average) >= 7.0)
    .sort((a, b) => Number(b.average) - Number(a.average))
    .slice(0, 3);

  if (strengths.length > 0) {
    strengths.forEach(s => {
      const note = s.assessment ? firstSentence(s.assessment) : `${s.dimension} está bien ejecutado con un promedio de ${s.average}`;
      lines.push(`- ${note}`);
    });
  } else {
    const bestBlock = [...result.detailedBlocks]
      .sort((a, b) => b.compositeScore - a.compositeScore)[0];
    if (bestBlock) {
      lines.push(`- La Sección ${bestBlock.blockNumber} es el bloque más fuerte con una puntuación de ${bestBlock.compositeScore}/10`);
    } else {
      lines.push('- El análisis identificó oportunidades de mejora claras que impactarán positivamente en la conversión');
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## ¿Qué sigue?');
  lines.push('');

  const action1 = result.actionPlan[0]?.action ? firstSentence(result.actionPlan[0].action) : '';
  const action2 = result.actionPlan[1]?.action ? firstSentence(result.actionPlan[1].action) : '';
  lines.push(`El siguiente paso es: ${action1 || 'revisar y reescribir los bloques de menor puntuación'}. ${action2 ? `A continuación, ${action2}, lo que generará una mejora medible en la tasa de conversión de la página.` : 'Aplicar estos cambios de forma consistente generará una mejora medible en la efectividad del copy.'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  return lines;
}

export function formatCROAuditToMarkdown(result: AuditResult, brandName: string): string {
  const lines: string[] = [];
  const sa = result.scoredAssessment;
  const L = getLabels(result.language);

  lines.push(`# CRO Audit Report: ${brandName}`);
  lines.push('');

  lines.push(...buildCROClientSummary(result));

  if (result.contextIdentification) {
    lines.push('## Context');
    lines.push('');
    lines.push(`**Primary Conversion Goal:** ${result.contextIdentification.primaryConversionGoal}`);
    lines.push(`**Traffic Context:** ${result.contextIdentification.trafficContext}`);
    lines.push(`**Target Audience:** ${result.contextIdentification.targetAudience}`);
    lines.push(`**Market/Industry:** ${result.contextIdentification.marketIndustry}`);
    lines.push('');
  }

  lines.push('## Executive Summary');
  lines.push('');
  lines.push(result.executiveSummary);
  lines.push('');

  lines.push('## Scorecard');
  lines.push('');
  lines.push('| Dimension | Score |');
  lines.push('|-----------|-------|');
  lines.push(`| ${L.croScoreRowLabels.valueProposition} | ${(sa.valueProposition / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.headline} | ${(sa.headline / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.cta} | ${(sa.cta / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.aboveTheFold} | ${(sa.aboveTheFold / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.narrativeFlow} | ${(sa.narrativeFlow / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.trustSignals} | ${(sa.trustSignals / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.objectionHandling} | ${(sa.objectionHandling / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.microCopy} | ${(sa.microCopy / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.croScoreRowLabels.accessibility} | ${(sa.accessibility / 10).toFixed(1)}/10 |`);
  lines.push(`| **${L.weightedTotal}** | **${(sa.weightedTotal / 10).toFixed(1)}/100** |`);
  lines.push('');

  lines.push('## Detailed Findings');
  lines.push('');
  result.detailedFindings.forEach((finding) => {
    lines.push(`### ${finding.category}`);
    lines.push('');
    if (finding.analysis) {
      lines.push(finding.analysis);
      lines.push('');
    }
    if (finding.issues.length > 0) {
      lines.push('**Issues:**');
      finding.issues.forEach((issue) => lines.push(`- ${issue}`));
      lines.push('');
    }
    if (finding.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      finding.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }
  });

  if (result.buyerJourneyAnalysis) {
    lines.push('## Buyer Journey Analysis');
    lines.push('');

    lines.push('### Cold Visitor');
    lines.push('');
    lines.push(result.buyerJourneyAnalysis.coldVisitor.analysis);
    lines.push('');
    if (result.buyerJourneyAnalysis.coldVisitor.gaps.length > 0) {
      lines.push('**Gaps:**');
      result.buyerJourneyAnalysis.coldVisitor.gaps.forEach((gap) => lines.push(`- ${gap}`));
      lines.push('');
    }
    if (result.buyerJourneyAnalysis.coldVisitor.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      result.buyerJourneyAnalysis.coldVisitor.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }

    lines.push('### Warm Visitor');
    lines.push('');
    lines.push(result.buyerJourneyAnalysis.warmVisitor.analysis);
    lines.push('');
    if (result.buyerJourneyAnalysis.warmVisitor.gaps.length > 0) {
      lines.push('**Gaps:**');
      result.buyerJourneyAnalysis.warmVisitor.gaps.forEach((gap) => lines.push(`- ${gap}`));
      lines.push('');
    }
    if (result.buyerJourneyAnalysis.warmVisitor.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      result.buyerJourneyAnalysis.warmVisitor.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }

    lines.push('### Hot Visitor');
    lines.push('');
    lines.push(result.buyerJourneyAnalysis.hotVisitor.analysis);
    lines.push('');
    if (result.buyerJourneyAnalysis.hotVisitor.gaps.length > 0) {
      lines.push('**Gaps:**');
      result.buyerJourneyAnalysis.hotVisitor.gaps.forEach((gap) => lines.push(`- ${gap}`));
      lines.push('');
    }
    if (result.buyerJourneyAnalysis.hotVisitor.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      result.buyerJourneyAnalysis.hotVisitor.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }
  }

  if (result.emotionalTriggers && result.emotionalTriggers.length > 0) {
    lines.push('## Emotional Triggers');
    lines.push('');
    lines.push('| Trigger | Present | Implementation |');
    lines.push('|---------|---------|----------------|');
    result.emotionalTriggers.forEach((trigger) => {
      lines.push(`| ${trigger.trigger} | ${trigger.present} | ${trigger.implementation} |`);
    });
    lines.push('');
  }

  if (result.pricingPsychology) {
    lines.push('## Pricing Psychology');
    lines.push('');
    lines.push(result.pricingPsychology.analysis);
    lines.push('');
    if (result.pricingPsychology.findings.length > 0) {
      lines.push('**Findings:**');
      result.pricingPsychology.findings.forEach((finding) => lines.push(`- ${finding}`));
      lines.push('');
    }
    if (result.pricingPsychology.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      result.pricingPsychology.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }
  }

  if (result.geoAIReadiness) {
    lines.push('## AI & Geo-Specific Readiness');
    lines.push('');
    lines.push(result.geoAIReadiness.analysis);
    lines.push('');
    if (result.geoAIReadiness.findings.length > 0) {
      lines.push('**Findings:**');
      result.geoAIReadiness.findings.forEach((finding) => lines.push(`- ${finding}`));
      lines.push('');
    }
    if (result.geoAIReadiness.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      result.geoAIReadiness.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }
  }

  if (result.mobileAnalysis) {
    lines.push('## Mobile Analysis');
    lines.push('');
    lines.push(result.mobileAnalysis.analysis);
    lines.push('');
    if (result.mobileAnalysis.findings.length > 0) {
      lines.push('**Findings:**');
      result.mobileAnalysis.findings.forEach((finding) => lines.push(`- ${finding}`));
      lines.push('');
    }
    if (result.mobileAnalysis.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      result.mobileAnalysis.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }
  }

  lines.push('## Copy Rewrites');
  lines.push('');
  result.copyRewrites.forEach((rewrite, idx) => {
    lines.push(`### ${idx + 1}. ${rewrite.element}`);
    lines.push('');
    lines.push(`**Current:** ${rewrite.current}`);
    lines.push('');
    lines.push(`**Improved:** ${rewrite.improved}`);
    lines.push('');
    lines.push(`**Rationale:** ${rewrite.rationale}`);
    lines.push('');
  });

  if (result.readyToUseContent && result.readyToUseContent.length > 0) {
    lines.push('## Ready-to-Use Content Suggestions');
    lines.push('');
    result.readyToUseContent.forEach((block, idx) => {
      lines.push(`### ${idx + 1}. ${block.sectionTitle}`);
      lines.push('');
      lines.push(`**Placement:** ${block.placement}`);
      lines.push('');
      lines.push(`**Category:** ${block.category}`);
      lines.push('');
      lines.push('**Content:**');
      lines.push('');
      lines.push(block.content);
      lines.push('');
      lines.push(`**Rationale:** ${block.rationale}`);
      lines.push('');
    });
  }

  if (result.competitorComparison && result.competitorComparison.length > 0) {
    lines.push('## Competitor Analysis');
    lines.push('');
    result.competitorComparison.forEach((comp) => {
      lines.push(`### ${comp.competitor}`);
      lines.push('');
      if (comp.strengths.length > 0) {
        lines.push('**Strengths:**');
        comp.strengths.forEach((s) => lines.push(`- ${s}`));
        lines.push('');
      }
      if (comp.weaknesses.length > 0) {
        lines.push('**Weaknesses:**');
        comp.weaknesses.forEach((w) => lines.push(`- ${w}`));
        lines.push('');
      }
      if (comp.whatTheyDoBetter.length > 0) {
        lines.push('**What They Do Better:**');
        comp.whatTheyDoBetter.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
      }
      if (comp.whatYouDoBetter.length > 0) {
        lines.push('**What You Do Better:**');
        comp.whatYouDoBetter.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
      }
    });
  }

  lines.push('## Quick Wins');
  lines.push('');
  result.quickWins.forEach((win) => lines.push(`- ${win}`));
  lines.push('');

  lines.push('## High Impact Changes');
  lines.push('');
  result.highImpactChanges.forEach((change) => lines.push(`- ${change}`));
  lines.push('');

  lines.push(`## ${L.abTestsSection.replace(/^[A-Z\d][\.\s–]+\s*/, '')}`);
  lines.push('');
  lines.push(`| Elemento | ${L.abControlLabel} | ${L.abVariantBLabel} | ${L.abPrimaryMetric.replace(/:$/, '')} | Plazo | ${L.tableImpact} |`);
  lines.push('|----------|-----------------|------------|-------------------|-------|-----------------|');
  result.abTests.forEach((test) => {
    const element = (test as any).element || (test as any).test || '';
    const control = (test as any).controlVariant || (test as any).hypothesis || '';
    const variant = (test as any).variantB || '';
    const metric = (test as any).primaryMetric || (test as any).metric || '';
    const duration = (test as any).suggestedDuration || '';
    lines.push(`| ${element} | ${control} | ${variant} | ${metric} | ${duration} | ${test.expectedImpact} |`);
  });
  lines.push('');

  lines.push('## Action Plan');
  lines.push('');
  lines.push('### 30 Days');
  lines.push('');
  result.actionPlan['30days'].forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('### 60 Days');
  lines.push('');
  result.actionPlan['60days'].forEach((action) => lines.push(`- ${action}`));
  lines.push('');
  lines.push('### 90 Days');
  lines.push('');
  result.actionPlan['90days'].forEach((action) => lines.push(`- ${action}`));
  lines.push('');

  lines.push('## Priority Table');
  lines.push('');
  lines.push('| Priority | Recommendation | Category | Impact | Effort | Timeframe |');
  lines.push('|----------|----------------|----------|--------|--------|-----------|');
  result.priorityTable.forEach((item) => {
    lines.push(`| ${item.priority} | ${item.recommendation} | ${item.category} | ${item.impact} | ${item.effort} | ${item.timeframe} |`);
  });
  lines.push('');

  lines.push('## Final Summary');
  lines.push('');
  lines.push(result.finalSummary);
  lines.push('');

  lines.push(glossaryToMarkdown(CRO_GLOSSARY));

  return lines.join('\n');
}

export function formatSEOAuditToMarkdown(result: SEOAuditResult, brandName: string): string {
  const lines: string[] = [];
  const sc = result.seoScoreCard;
  const L = getLabels(result.language);

  lines.push(`# SEO Audit Report: ${brandName}`);
  lines.push('');

  lines.push(...buildSEOClientSummary(result));

  lines.push('## Executive Summary');
  lines.push('');
  lines.push(result.seoExecutiveSummary);
  lines.push('');

  lines.push('## SEO Context');
  lines.push('');
  lines.push(`**Primary Keywords:** ${result.seoContext.primaryKeywords.join(', ')}`);
  lines.push('');
  lines.push(`**Search Intent:** ${result.seoContext.searchIntent}`);
  lines.push('');
  lines.push(`**Likely Competitors:** ${result.seoContext.likelyCompetitors}`);
  lines.push('');

  lines.push('## Scorecard');
  lines.push('');
  lines.push('| Dimension | Score |');
  lines.push('|-----------|-------|');
  lines.push(`| ${L.seoScoreRowLabels.titleMeta} | ${(sc.titleMeta / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.seoScoreRowLabels.headingStructure} | ${(sc.headingStructure / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.seoScoreRowLabels.contentQuality} | ${(sc.contentQuality / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.seoScoreRowLabels.keywordOptimization} | ${(sc.keywordOptimization / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.seoScoreRowLabels.links} | ${(sc.links / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.seoScoreRowLabels.imageMedia} | ${(sc.imageMedia / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.seoScoreRowLabels.schemaStructuredData} | ${(sc.schemaStructuredData / 10).toFixed(1)}/10 |`);
  lines.push(`| ${L.seoScoreRowLabels.contentArchitecture} | ${(sc.contentArchitecture / 10).toFixed(1)}/10 |`);
  lines.push(`| **${L.weightedTotal}** | **${(sc.weightedTotal / 10).toFixed(1)}/100** |`);
  lines.push('');

  lines.push('## Heading Structure Map');
  lines.push('');
  lines.push(result.headingStructureMap);
  lines.push('');

  lines.push('## Keyword Map');
  lines.push('');
  lines.push('| Keyword | Type | Status | Frequency | In H1 | In Title | In Meta |');
  lines.push('|---------|------|--------|-----------|-------|----------|---------|');
  result.keywordMap.forEach((kw) => {
    lines.push(`| ${kw.keyword} | ${kw.type} | ${kw.status} | ${kw.frequency} | ${kw.inH1 ? '✓' : '✗'} | ${kw.inTitle ? '✓' : '✗'} | ${kw.inMeta ? '✓' : '✗'} |`);
  });
  lines.push('');

  lines.push('## Detailed Analysis');
  lines.push('');
  result.detailedAnalysis.forEach((finding) => {
    lines.push(`### ${finding.dimension} (Score: ${(finding.score / 10).toFixed(1)}/10)`);
    lines.push('');
    lines.push(`**Current State:** ${finding.currentState}`);
    lines.push('');
    if (finding.issues.length > 0) {
      lines.push('**Issues:**');
      finding.issues.forEach((issue) => lines.push(`- ${issue}`));
      lines.push('');
    }
    if (finding.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      finding.recommendations.forEach((rec) => lines.push(`- ${rec}`));
      lines.push('');
    }
  });

  lines.push('## Meta & Heading Rewrites');
  lines.push('');
  result.metaHeadingRewrites.forEach((rewrite, idx) => {
    lines.push(`### ${idx + 1}. ${rewrite.element}`);
    lines.push('');
    lines.push(`**Current:** ${rewrite.current}`);
    lines.push('');
    lines.push(`**Optimized:** ${rewrite.optimized}`);
    lines.push('');
    lines.push(`**Rationale:** ${rewrite.rationale}`);
    lines.push('');
  });

  if (result.schemaMarkupCode && result.schemaMarkupCode.length > 0) {
    lines.push('## Schema Markup Recommendations');
    lines.push('');
    result.schemaMarkupCode.forEach((schema, idx) => {
      lines.push(`### ${idx + 1}. ${schema.schemaType}`);
      lines.push('');
      lines.push(`**Rationale:** ${schema.rationale}`);
      lines.push('');
      lines.push('**Code:**');
      lines.push('');
      lines.push('```json');
      lines.push(schema.code);
      lines.push('```');
      lines.push('');
    });
  }

  lines.push('## Content Gap Analysis');
  lines.push('');
  if (result.contentGapAnalysis.missingSubtopics.length > 0) {
    lines.push('**Missing Subtopics:**');
    result.contentGapAnalysis.missingSubtopics.forEach((topic) => lines.push(`- ${topic}`));
    lines.push('');
  }
  if (result.contentGapAnalysis.unansweredQuestions.length > 0) {
    lines.push('**Unanswered Questions:**');
    result.contentGapAnalysis.unansweredQuestions.forEach((q) => lines.push(`- ${q}`));
    lines.push('');
  }
  if (result.contentGapAnalysis.recommendedSections.length > 0) {
    lines.push('**Recommended Sections:**');
    result.contentGapAnalysis.recommendedSections.forEach((section) => lines.push(`- ${section}`));
    lines.push('');
  }
  lines.push(`**Additional Word Count Needed:** ${result.contentGapAnalysis.additionalWordCount} words`);
  lines.push('');

  lines.push('## Quick Wins');
  lines.push('');
  lines.push('| Action | Time | Impact |');
  lines.push('|--------|------|--------|');
  result.seoQuickWins.forEach((win) => {
    lines.push(`| ${win.action} | ${win.estimatedTime} | ${win.impact} |`);
  });
  lines.push('');

  lines.push('## High Impact Changes');
  lines.push('');
  lines.push('| Action | Time | Impact |');
  lines.push('|--------|------|--------|');
  result.seoHighImpactChanges.forEach((change) => {
    lines.push(`| ${change.action} | ${change.estimatedTime} | ${change.impact} |`);
  });
  lines.push('');

  lines.push('## Action Plan');
  lines.push('');
  lines.push('### Week 1');
  lines.push('');
  lines.push(`**Actions:** ${result.seoActionPlan.week1.actions}`);
  lines.push('');
  lines.push(`**Impact:** ${result.seoActionPlan.week1.impact}`);
  lines.push('');
  lines.push('### Week 2-4');
  lines.push('');
  lines.push(`**Actions:** ${result.seoActionPlan.week2to4.actions}`);
  lines.push('');
  lines.push(`**Impact:** ${result.seoActionPlan.week2to4.impact}`);
  lines.push('');
  lines.push('### Month 2-3');
  lines.push('');
  lines.push(`**Actions:** ${result.seoActionPlan.month2to3.actions}`);
  lines.push('');
  lines.push(`**Impact:** ${result.seoActionPlan.month2to3.impact}`);
  lines.push('');

  lines.push('## Final Summary');
  lines.push('');
  lines.push(result.seoFinalSummary);
  lines.push('');

  lines.push(glossaryToMarkdown(SEO_GLOSSARY));

  return lines.join('\n');
}

const COPY_DIMENSION_TRANSLATIONS: Record<string, string> = {
  'Clarity': 'Claridad',
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

function translateCopyDimension(dim: string): string {
  return COPY_DIMENSION_TRANSLATIONS[dim] || dim;
}

export function formatCopyAnalysisToMarkdown(result: CopyAnalysisResult, brandName: string): string {
  const lines: string[] = [];
  const L = getLabels(result.language);

  lines.push(`# Copy Analysis Report: ${brandName}`);
  lines.push('');

  lines.push(...buildCopyClientSummary(result));

  lines.push('## Summary');
  lines.push('');
  lines.push(result.copySummary);
  lines.push('');

  lines.push('## Page Score Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Overall Score | **${(result.pageScore.overallScore / 10).toFixed(1)}/10** |`);
  lines.push(`| Total Blocks | ${result.pageScore.totalBlocks} |`);
  lines.push(`| Green Blocks (8.0–10) | ${result.pageScore.greenBlocks} (${result.pageScore.greenPercent}%) |`);
  lines.push(`| Yellow Blocks (6.0–7.9) | ${result.pageScore.yellowBlocks} (${result.pageScore.yellowPercent}%) |`);
  lines.push(`| Red Blocks (0–5.9) | ${result.pageScore.redBlocks} (${result.pageScore.redPercent}%) |`);
  lines.push(`| Weakest Dimension | ${translateCopyDimension(result.pageScore.weakestDimension)} (${result.pageScore.weakestDimensionAvg}) |`);
  lines.push(`| Strongest Dimension | ${translateCopyDimension(result.pageScore.strongestDimension)} (${result.pageScore.strongestDimensionAvg}) |`);
  lines.push(`| Reading Level | ${result.pageScore.readingLevel} |`);
  lines.push(`| Est. Reading Time | ${result.pageScore.estimatedReadingTime} |`);
  lines.push(`| Tone Consistency | ${result.pageScore.toneConsistency} |`);
  lines.push('');

  lines.push('## Dimension Averages');
  lines.push('');
  lines.push('| Dimension | Average | Assessment |');
  lines.push('|-----------|---------|------------|');
  result.dimensionAverages.forEach((dim) => {
    lines.push(`| ${translateCopyDimension(dim.dimension)} | ${dim.average} | ${dim.assessment} |`);
  });
  lines.push('');

  lines.push('## Copy Heatmap');
  lines.push('');
  result.copyHeatmap.forEach((block) => {
    const colorEmoji = block.color === 'green' ? '🟢' : block.color === 'yellow' ? '🟡' : '🔴';
    lines.push(`### Sección ${block.blockNumber} de tu página ${colorEmoji} (Score: ${block.compositeScore})`);
    lines.push('');
    lines.push(`**Preview:** ${block.blockTextPreview}`);
    lines.push('');
  });

  lines.push('## Detailed Block Analysis');
  lines.push('');
  result.detailedBlocks.forEach((block) => {
    const colorEmoji = block.color === 'green' ? '🟢' : block.color === 'yellow' ? '🟡' : '🔴';
    lines.push(`### Sección ${block.blockNumber} de tu página ${colorEmoji}`);
    lines.push('');
    lines.push(`**Score:** ${block.compositeScore}/10`);
    lines.push('');
    lines.push('**Original Text:**');
    lines.push('');
    lines.push(`> ${block.originalText}`);
    lines.push('');
    lines.push('**Dimension Scores:**');
    lines.push('');
    lines.push(`- Claridad: ${block.scores.clarity}`);
    lines.push(`- Fuerza Persuasiva: ${block.scores.persuasion}`);
    lines.push(`- Tono Emocional: ${block.scores.emotionalTone}`);
    lines.push(`- Proporción Beneficio–Característica: ${block.scores.benefitFeatureRatio}`);
    lines.push(`- Lenguaje de Alto Impacto: ${block.scores.powerWords}`);
    lines.push(`- Voz Activa: ${block.scores.activeVoice}`);
    lines.push(`- Relevancia de Conversión: ${block.scores.conversionRelevance}`);
    lines.push('');

    if (block.issues.length > 0) {
      lines.push('**Issues:**');
      block.issues.forEach((issue) => lines.push(`- ${issue}`));
      lines.push('');
    }

    if (block.rewrite) {
      lines.push('**Suggested Rewrite:**');
      lines.push('');
      lines.push(`> ${block.rewrite}`);
      lines.push('');
      if (block.rewriteRationale) {
        lines.push(`**Rationale:** ${block.rewriteRationale}`);
        lines.push('');
      }
      if (block.projectedScore) {
        lines.push(`**Projected Score:** ${block.projectedScore}/10`);
        lines.push('');
      }
    }
  });

  lines.push('## Top Priority Rewrites');
  lines.push('');
  lines.push('| Priority | Sección | Current Score | Issue | Projected Score |');
  lines.push('|----------|---------|---------------|-------|-----------------|');
  result.topPriorityRewrites.forEach((rewrite) => {
    lines.push(`| ${rewrite.priority} | Sección ${rewrite.blockNumber} de tu página | ${rewrite.currentScore} | ${rewrite.issue} | ${rewrite.projectedScore} |`);
  });
  lines.push('');

  lines.push('## Pattern Analysis');
  lines.push('');
  lines.push(`**Dominant Weakness:** ${result.patternAnalysis.dominantWeakness}`);
  lines.push('');
  lines.push(`**Worst Habit:** ${result.patternAnalysis.worstHabit}`);
  lines.push('');
  if (result.patternAnalysis.recurringPatterns.length > 0) {
    lines.push('**Recurring Patterns:**');
    result.patternAnalysis.recurringPatterns.forEach((pattern) => lines.push(`- ${pattern}`));
    lines.push('');
  }
  lines.push('**Coaching Advice:**');
  lines.push('');
  lines.push(result.patternAnalysis.coachingAdvice);
  lines.push('');

  lines.push('## Action Plan');
  lines.push('');
  lines.push('| Priority | Action | Blocks Affected | Impact |');
  lines.push('|----------|--------|-----------------|--------|');
  result.actionPlan.forEach((item) => {
    lines.push(`| ${item.priority} | ${item.action} | ${item.blocksAffected} | ${item.impact} |`);
  });
  lines.push('');

  lines.push('## Final Summary');
  lines.push('');
  lines.push(result.finalSummary);
  lines.push('');

  lines.push(glossaryToMarkdown(COPY_GLOSSARY));

  return lines.join('\n');
}
