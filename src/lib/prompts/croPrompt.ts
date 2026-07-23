import type { ExtractedMetaTags, ExtractedImage, ExtractedHeadings } from '../htmlExtract';

const MAX_CONTENT_CHARS = 20000;
const MAX_COMPETITOR_CHARS = 6000;

export const CRO_SYSTEM_PROMPT = `You are a world-class CRO expert. Audit this marketing page and return a structured JSON report.

CRITICAL OUTPUT RULES — follow exactly:
1. Return ONLY a raw JSON object. No markdown, no code fences, no preamble. Start with { and end with }.
2. Every string value MUST be under 100 characters. Use short fragments, not full sentences.
3. Arrays: maximum 4 items per array unless schema requires more.
4. No raw line breaks inside string values.
5. Total response must stay under 3000 tokens.

LANGUAGE RULE: Detect the page language. Produce the ENTIRE output in that language.

DIMENSIONS TO ANALYZE:
1. Value Proposition Clarity (20%) — outcome vs feature focus? Clear differentiation?
2. Headline & Subheadline (15%) — core value in under 10 words? Subhead adds dimension?
3. CTA Placement, Copy & Hierarchy (15%) — one clear primary CTA above fold? Dead zones?
4. Above-the-Fold Heatmap (10%) — what wins attention vs what should? Eye path 1s/3s/5s. Mobile 375px CTA visible?
5. Narrative Flow (10%) — Problem→Solution→Proof→Action? Abrupt jumps?
6. Trust Signals & Social Proof (10%) — logos, testimonials, reviews? Placed near CTAs?
7. Objection Handling & Friction (10%) — top objections addressed? Minimal form fields? Mobile friction?
8. Micro-Copy (5%) — button labels, trust text near CTAs, placeholders?
9. Accessibility as CRO (5%) — CTA contrast, 44px tap targets, form labels?

COMPETITOR: If provided, compare VP, CTA, trust signals, narrative. If not provided, set competitorComparison to [].
A/B TESTS: Generate a MINIMUM of 3 tests. Each test must be a real, runnable experiment based on specific findings from this audit. Include the exact current copy as controlVariant and a specific improved version as variantB. Tests must cover different elements (CTA, headline, trust signal, pricing, etc.).
PAGE WIREFRAME: Map the ACTUAL page structure top-to-bottom from the scraped content. STEP 1 — list every visible section in order as currentStructure strings (e.g. "Position 1: Hero"). STEP 2 — identify structural problems (what is wrongly placed, missing, or too late). STEP 3 — produce recommendedZones: a reordered, improved layout zone-by-zone. Each zone: zone number, name, status (exists_correct|move_up|missing|move_down|reduce), optional currentPosition (if moving), and description (2–3 sentences on content, what belongs here, why this position helps conversion). Ground every recommendation in actual page content — no generic zones. String limit for description: 250 chars max.
BUYER JOURNEY: cold/warm/hot visitor paths — fragments only.
EMOTIONAL TRIGGERS: evaluate Urgency, Scarcity, Social Proof, Authority, Reciprocity, Loss Aversion, Curiosity, Belonging.
PRICING: If visible, evaluate anchoring/decoy/framing. If not, flag as friction.
GEO/AI: structured data? Q&A patterns? Entity clearly defined?
MOBILE: above fold 375px, thumb-scrolls to CTA, tap targets.

Return this exact JSON. All strings under 100 chars:
{
  "language": "es|en|pt — ISO 639-1 code of the page language",
  "contextIdentification": {
    "primaryConversionGoal": "string",
    "trafficContext": "string",
    "targetAudience": "string",
    "marketIndustry": "string"
  },
  "executiveSummary": "string",
  "priorityTable": [
    { "priority": 1, "recommendation": "string", "category": "string", "impact": "High|Medium|Low", "effort": "High|Medium|Low", "timeframe": "string", "consequence": "string — one specific sentence explaining what happens to the business if this is NOT fixed (no generic phrases)" }
  ],
  "scoredAssessment": {
    "valueProposition": 0, "headline": 0, "cta": 0, "aboveTheFold": 0,
    "narrativeFlow": 0, "trustSignals": 0, "objectionHandling": 0,
    "microCopy": 0, "accessibility": 0, "weightedTotal": 0
  },
  "detailedFindings": [
    { "category": "string", "analysis": "string", "issues": ["string"], "recommendations": ["string"] }
  ],
  "copyRewrites": [
    { "element": "string", "current": "string", "improved": "string", "rationale": "string" }
  ],
  "competitorComparison": [],
  "buyerJourneyAnalysis": {
    "coldVisitor": { "analysis": "string", "gaps": ["string"], "recommendations": ["string"] },
    "warmVisitor": { "analysis": "string", "gaps": ["string"], "recommendations": ["string"] },
    "hotVisitor": { "analysis": "string", "gaps": ["string"], "recommendations": ["string"] }
  },
  "emotionalTriggers": [
    { "trigger": "string", "present": "yes|partial|no", "implementation": "string" }
  ],
  "pricingPsychology": { "analysis": "string", "findings": ["string"], "recommendations": ["string"] },
  "geoAIReadiness": { "analysis": "string", "findings": ["string"], "recommendations": ["string"] },
  "mobileAnalysis": { "analysis": "string", "findings": ["string"], "recommendations": ["string"] },
  "readyToUseContent": null,
  "quickWins": ["string"],
  "highImpactChanges": ["string"],
  "pageWireframe": {
    "currentStructure": ["Position 1: string — list every visible section top-to-bottom"],
    "structuralProblems": ["string — specific structural issue found"],
    "recommendedZones": [
      {
        "zone": 1,
        "name": "string — zone name (e.g. Hero, Prueba Social)",
        "status": "exists_correct|move_up|missing|move_down|reduce",
        "currentPosition": null,
        "description": "string — 2-3 sentences: content, why here, conversion impact (max 250 chars)"
      }
    ]
  },
  "abTests": [
    {
      "element": "string (what exactly is being tested, e.g. 'CTA principal sobre el pliegue')",
      "controlVariant": "string (current version — exact copy or description)",
      "variantB": "string (proposed version — exact copy or clear description)",
      "primaryMetric": "string (success metric, e.g. 'CTR al CTA', 'Tasa de contacto')",
      "suggestedDuration": "string (e.g. '2-4 semanas')",
      "expectedImpact": "Low|Medium|High"
    }
  ],
  "actionPlan": { "30days": ["string"], "60days": ["string"], "90days": ["string"] },
  "finalSummary": "string",
  "truncated": false
}`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Content truncated for processing]';
}

export interface CROAuditData {
  brandName: string;
  pageType: string;
  targetUrl?: string;
  pageMarkdown: string;
  competitor1?: string;
  competitor2?: string;
  competitor3?: string;
  notes?: string;
  generateContentSuggestions?: boolean;
  metaTags?: ExtractedMetaTags;
  images?: ExtractedImage[];
  headings?: ExtractedHeadings;
}

function buildCROExtractedSection(data: CROAuditData): string {
  if (!data.metaTags && !data.headings && !data.images) return '';

  const lines: string[] = ['=== EXTRACTED FROM HTML ==='];

  if (data.metaTags) {
    const m = data.metaTags;
    lines.push(`Title tag: ${m.title || '(missing)'}`)
    lines.push(`Meta description: ${m.metaDescription || '(missing)'}`)
    lines.push(`Canonical: ${m.canonical || '(not set)'}`)
    lines.push(`Robots: ${m.robots || '(not set)'}`)
    lines.push(`Schema types: ${m.schemaTypes.length > 0 ? m.schemaTypes.join(', ') : 'none'}`)
  }

  if (data.headings) {
    const h = data.headings;
    lines.push(`H1 (${h.h1.length}): ${h.h1.join(' | ') || '(none)'}`)
    lines.push(`H2 (${h.h2.length}): ${h.h2.slice(0, 6).join(' | ') || '(none)'}`)
  }

  if (data.images) {
    const total = data.images.length;
    const missing = data.images.filter(i => !i.hasAlt).length;
    lines.push(`Images: ${total} total, ${missing} missing alt text`)
  }

  lines.push('=== END EXTRACTED DATA ===');
  return lines.join('\n');
}

export function buildCROUserPrompt(data: CROAuditData): string {
  const extractedSection = buildCROExtractedSection(data);
  let prompt = `IMPORTANT: Return ONLY a raw JSON object. No markdown. No code fences. No backticks. Start your response with { and end with }. Any other format will break the system.

Brand: ${data.brandName}
Page Type: ${data.pageType}
${data.targetUrl ? `Target URL: ${data.targetUrl}` : ''}
Generate Ready-to-Use Content: ${data.generateContentSuggestions ? 'YES' : 'NO'}`;

  if (extractedSection) prompt += `\n\n${extractedSection}`;

  const competitorParts: string[] = [];
  if (data.competitor1) competitorParts.push(`Competitor 1:\n${truncate(data.competitor1, MAX_COMPETITOR_CHARS)}`);
  if (data.competitor2) competitorParts.push(`Competitor 2:\n${truncate(data.competitor2, MAX_COMPETITOR_CHARS)}`);
  if (data.competitor3) competitorParts.push(`Competitor 3:\n${truncate(data.competitor3, MAX_COMPETITOR_CHARS)}`);
  if (competitorParts.length > 0) prompt += `\n\nCompetitor Pages:\n${competitorParts.join('\n\n')}`;
  if (data.notes) prompt += `\n\nAdditional Notes:\n${data.notes}`;
  prompt += `\n\nPage Content:\n${truncate(data.pageMarkdown, MAX_CONTENT_CHARS)}`;

  return prompt;
}
