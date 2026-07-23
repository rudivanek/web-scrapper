import type { ExtractedMetaTags, ExtractedImage, ExtractedHeadings } from '../htmlExtract';

const MAX_CONTENT_CHARS = 20000;

export const SEO_SYSTEM_PROMPT = `You are a world-class SEO specialist. Audit this web page and return a structured JSON report.

CRITICAL OUTPUT RULES — follow exactly:
1. Return ONLY a raw JSON object. No markdown, no code fences, no preamble. Start with { and end with }.
2. Every string value MUST be under 100 characters. Use short fragments, not full sentences.
3. Arrays: maximum 4 items per array unless schema requires more.
4. No raw line breaks inside string values.
5. schemaMarkupCode: include ONLY 1 schema type maximum. Keep JSON-LD compact (single line, no pretty-print).
6. Total response must stay under 3000 tokens.

LANGUAGE RULE: Detect the page language. Produce the ENTIRE output in that language.

DIMENSIONS TO ANALYZE:
1. Title Tag & Meta Description (15%) — present? length? keyword near front? compelling?
2. Heading Hierarchy (15%) — one H1? keyword in H1? all H2s logical? map structure.
3. Content Quality & Depth (20%) — word count? E-E-A-T signals? missing subtopics?
4. Keyword Optimization (15%) — primary keyword in H1/title/meta/first100words? 5-8 secondary terms?
5. Internal & External Links (10%) — count, anchor text descriptive? authoritative externals?
6. Image & Media SEO (10%) — alt text keyword-relevant? file names descriptive?
7. Schema & Structured Data (10%) — any present? top 1 missing type + compact JSON-LD.
8. Content Architecture (5%) — scannable? paragraph length? clean URL?

QUICK WINS & HIGH-IMPACT CHANGES RULES:
- "action" = what to do (imperative, brief)
- "estimatedTime" = how long it takes (e.g. "30 min", "2 hours")
- "impact" = the SPECIFIC consequence of NOT doing this action — what the client is actively losing RIGHT NOW. Write a unique, concrete sentence per item in plain Spanish. NEVER use template phrases like "Sin atender esto, [X] continuará siendo una brecha". Instead explain the real business cost (e.g. "Google muestra un fragmento aleatorio de tu página como descripción, no el mensaje que tú elegirías — esto reduce tu CTR directamente."). Each item must have a completely different and specific impact statement.

Return this exact JSON. All strings under 100 chars:
{
  "language": "es|en|pt — ISO 639-1 code of the page language",
  "seoExecutiveSummary": "string",
  "seoContext": {
    "primaryKeywords": ["string"],
    "searchIntent": "string",
    "likelyCompetitors": "string"
  },
  "seoScoreCard": {
    "titleMeta": 0,
    "headingStructure": 0,
    "contentQuality": 0,
    "keywordOptimization": 0,
    "links": 0,
    "imageMedia": 0,
    "schemaStructuredData": 0,
    "contentArchitecture": 0,
    "weightedTotal": 0
  },
  "headingStructureMap": "string",
  "keywordMap": [
    {
      "keyword": "string",
      "type": "primary|secondary",
      "inTitle": false,
      "inH1": false,
      "inMeta": false,
      "inFirst100Words": false,
      "frequency": 0,
      "status": "good|needs work|missing"
    }
  ],
  "detailedAnalysis": [
    {
      "dimension": "string",
      "score": 0,
      "currentState": "string",
      "issues": ["string"],
      "recommendations": ["string"]
    }
  ],
  "metaHeadingRewrites": [
    {
      "element": "string",
      "current": "string",
      "optimized": "string",
      "rationale": "string"
    }
  ],
  "schemaMarkupCode": [
    {
      "schemaType": "string",
      "rationale": "string",
      "code": "string"
    }
  ],
  "contentGapAnalysis": {
    "missingSubtopics": ["string"],
    "unansweredQuestions": ["string"],
    "recommendedSections": ["string"],
    "additionalWordCount": 0
  },
  "seoQuickWins": [
    { "action": "string", "estimatedTime": "string", "impact": "string", "consequence": "string — one specific sentence explaining what happens to SEO/traffic if this is NOT fixed (no generic phrases)" }
  ],
  "seoHighImpactChanges": [
    { "action": "string", "estimatedTime": "string", "impact": "string", "consequence": "string — one specific sentence explaining what happens to SEO/traffic if this is NOT fixed (no generic phrases)" }
  ],
  "seoActionPlan": {
    "week1": { "actions": "string", "impact": "string" },
    "week2to4": { "actions": "string", "impact": "string" },
    "month2to3": { "actions": "string", "impact": "string" }
  },
  "seoFinalSummary": "string"
}`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Content truncated for processing]';
}

export interface SEOAuditData {
  brandName: string;
  pageType: string;
  targetUrl?: string;
  pageMarkdown: string;
  metaTags?: ExtractedMetaTags;
  images?: ExtractedImage[];
  headings?: ExtractedHeadings;
}

function buildExtractedDataSection(data: SEOAuditData): string {
  if (!data.metaTags && !data.headings && !data.images) return '';

  const lines: string[] = ['=== EXTRACTED FROM HTML (authoritative — use these values directly) ==='];

  if (data.metaTags) {
    const m = data.metaTags;
    lines.push('META TAGS:');
    lines.push(`  Title tag: ${m.title || '(missing)'}`)
    lines.push(`  Meta description: ${m.metaDescription || '(missing)'}`)
    lines.push(`  Meta keywords: ${m.metaKeywords || '(none)'}`)
    lines.push(`  Canonical URL: ${m.canonical || '(not set)'}`)
    lines.push(`  Robots: ${m.robots || '(not set — defaults to index,follow)'}`)
    lines.push(`  OG Title: ${m.ogTitle || '(missing)'}`)
    lines.push(`  OG Description: ${m.ogDescription || '(missing)'}`)
    lines.push(`  OG Image: ${m.ogImage || '(missing)'}`)
    lines.push(`  Schema types detected: ${m.schemaTypes.length > 0 ? m.schemaTypes.join(', ') : 'none'}`)
  }

  if (data.headings) {
    const h = data.headings;
    lines.push('HEADING STRUCTURE (from HTML — more reliable than markdown):');
    lines.push(`  H1 (${h.h1.length}): ${h.h1.length > 0 ? h.h1.join(' | ') : '(none found)'}`)
    lines.push(`  H2 (${h.h2.length}): ${h.h2.slice(0, 8).join(' | ') || '(none)'}`)
    lines.push(`  H3 (${h.h3.length}): ${h.h3.slice(0, 5).join(' | ') || '(none)'}`)
  }

  if (data.images) {
    const total = data.images.length;
    const withAlt = data.images.filter(i => i.hasAlt).length;
    const missing = total - withAlt;
    lines.push('IMAGE ALT AUDIT:');
    lines.push(`  Total images: ${total}`)
    lines.push(`  With alt text: ${withAlt}`)
    lines.push(`  Missing alt text: ${missing}`)
    if (missing > 0) {
      const missingImgs = data.images.filter(i => !i.hasAlt).slice(0, 4);
      missingImgs.forEach(img => lines.push(`  [MISSING ALT] ${img.src}`));
    }
  }

  lines.push('=== END EXTRACTED DATA ===');
  return lines.join('\n');
}

export function buildSEOUserPrompt(data: SEOAuditData): string {
  const extractedSection = buildExtractedDataSection(data);
  return `IMPORTANT: Return ONLY a raw JSON object. No markdown. No code fences. No backticks. Start your response with { and end with }. Any other format will break the system.

Brand: ${data.brandName}
Page Type: ${data.pageType}
URL: ${data.targetUrl || 'Not provided'}
${extractedSection ? '\n' + extractedSection : ''}

Page Content (markdown — use for body text analysis):
${truncate(data.pageMarkdown, MAX_CONTENT_CHARS)}`;
}
