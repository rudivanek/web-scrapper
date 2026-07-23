import type { ExtractedHeadings } from '../htmlExtract';

const MAX_CONTENT_CHARS = 18000;
const MAX_TOKENS_PASS1 = 4000;
const MAX_TOKENS_PASS2 = 6000;

export const COPY_MAX_TOKENS_PASS1 = MAX_TOKENS_PASS1;
export const COPY_MAX_TOKENS_PASS2 = MAX_TOKENS_PASS2;

export const COPY_SYSTEM_PROMPT_PASS1 = `You are a world-class conversion copy analyst. Analyze every piece of copy on the page and return ONLY a compact JSON object with scores — no rewrites, no rationale, no full text.

LANGUAGE RULE: Detect the language of the page content. Write copySummary, assessment strings, and patterns in that same language. Return the detected language code in the "language" field (e.g., "de", "en", "es", "fr").

STEP 1 — Identify every distinct copy block on the page (headlines, subheadlines, body paragraphs, bullets, CTAs, testimonials, captions, form labels). Number them sequentially top to bottom. For each block assign a sectionName: a short human-readable label (2–5 words in the same language as the page) describing what that section is as a visitor would recognise it on the page. Never use generic labels like "Sección 1", "Block 3", or "Section 2". Use descriptive names based on the actual content and purpose. Examples: "Hero principal", "Propuesta de valor", "Testimonios de clientes", "CTA final", "Lista de entregables", "Preguntas frecuentes", "Equipo y experiencia", "Proceso de trabajo", "Servicios principales", "Portfolio — Casos de éxito".

GROUPING RULE — CRITICAL: If the page contains 3 or more structurally identical items (portfolio cards, team member bios, product cards, client logos with labels, feature cards, case study tiles), group ALL of them as ONE SINGLE BLOCK. Label it "[Section name] (X items)" e.g. "Portfolio cards (6 items)". Score the group based on overall quality of the pattern, not individual items. Do NOT create separate blocks for each card — this causes duplicate analysis and inflates block count.

STEP 2 — Score each block on 7 dimensions (1–10):
1. Clarity (weight 20%): Is it instantly understood?
2. Persuasion Strength (weight 25%): Does it move the reader to act?
3. Emotional Tone (weight 15%): Does it connect emotionally?
4. Benefit-to-Feature Ratio (weight 15%): Does it focus on customer outcome vs. product feature?
5. Power Words & Language (weight 10%): Is the language vivid and strong?
6. Active vs Passive Voice (weight 5%): Is it written in active voice?
7. Conversion Relevance (weight 10%): Does it advance the page's conversion goal?

STEP 3 — For each block calculate weighted composite: (clarity*0.20)+(persuasion*0.25)+(emotionalTone*0.15)+(benefitFeature*0.15)+(powerWords*0.10)+(activeVoice*0.05)+(conversionRelevance*0.10)
Color: GREEN (7.0–10.0), YELLOW (4.0–6.9), RED (1.0–3.9)

STEP 4 — Calculate dimension averages across all blocks.

OUTPUT RULES — CRITICAL:
- Return ONLY the raw JSON object. No markdown, no code fences, no preamble. Start with { and end with }.
- Keep total response under ${MAX_TOKENS_PASS1} tokens — use compact JSON formatting.
- The scores array order is always: [clarity, persuasion, emotionalTone, benefitFeature, powerWords, activeVoice, conversionRelevance]
- preview = first 70 characters of the block text

Return this exact JSON structure:
{"language":"string","copySummary":"3-4 sentence summary in page language","pageScore":{"overallScore":number,"totalBlocks":number,"greenBlocks":number,"yellowBlocks":number,"redBlocks":number,"weakestDimension":"string","weakestDimensionAvg":number,"strongestDimension":"string","strongestDimensionAvg":number,"readingLevel":"string","estimatedReadingTime":"string","toneConsistency":"string"},"dimensionAverages":[{"dimension":"string","average":number,"assessment":"short string in page language"}],"copyHeatmap":[{"blockNumber":number,"sectionName":"string","preview":"string","color":"green|yellow|red","composite":number,"scores":[number,number,number,number,number,number,number]}],"patterns":{"dominantWeakness":"string in page language","worstHabit":"string in page language","coachingAdvice":"string in page language"}}`;

export const COPY_SYSTEM_PROMPT_PASS2 = `You are a world-class conversion copywriter. You are given copy block scores from a previous analysis. Generate rewrites ONLY for the 5 lowest-scoring blocks.

LANGUAGE RULE: Write ALL rewrites, rationale, and issues in the same language as the original text provided. Match the language exactly.

For each of the 5 blocks:
- Find the exact original text in the page content and copy it verbatim into originalText (max 200 characters, truncate with "..." if longer — never paraphrase, never summarise, use the exact words from the page)
- Write a high-converting rewrite that fixes the specific weaknesses
- List 2-3 specific issues with the current copy
- Project the new score after rewriting

OUTPUT RULES — CRITICAL:
- Return ONLY the raw JSON object. No markdown, no code fences, no preamble. Start with { and end with }.
- Keep total response under ${MAX_TOKENS_PASS2} tokens.

Return this exact JSON structure:
{"rewrites":[{"blockNumber":number,"originalText":"full original text","currentScore":number,"issues":["string","string"],"rewrite":"improved version in same language","rationale":"why this is better in same language","projectedScore":number}],"actionPlan":[{"priority":number,"action":"string in page language","blocksAffected":"string","impact":"string in page language"}],"finalSummary":"one paragraph assessment in page language"}`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Content truncated]';
}

export interface CopyAnalysisData {
  brandName: string;
  pageType: string;
  targetUrl?: string;
  pageMarkdown: string;
  headings?: ExtractedHeadings;
}

export function buildCopyPass1UserPrompt(data: CopyAnalysisData): string {
  let headingsSection = '';
  if (data.headings) {
    const h = data.headings;
    headingsSection = `\nHEADING STRUCTURE (from HTML):
H1: ${h.h1.join(' | ') || '(none)'}
H2: ${h.h2.slice(0, 8).join(' | ') || '(none)'}
H3: ${h.h3.slice(0, 5).join(' | ') || '(none)'}
`;
  }
  return `IMPORTANT: Return ONLY a raw JSON object. No markdown. No code fences. No backticks. Start your response with { and end with }. Any other format will break the system.

Brand: ${data.brandName}
Page Type: ${data.pageType}
URL: ${data.targetUrl || 'Not provided'}
${headingsSection}
Page Content:
${truncate(data.pageMarkdown, MAX_CONTENT_CHARS)}`;
}

export function buildCopyPass2UserPrompt(pass1Result: any, data: CopyAnalysisData): string {
  const language = pass1Result.language || 'en';
  const bottom5 = [...pass1Result.copyHeatmap]
    .sort((a: any, b: any) => a.composite - b.composite)
    .slice(0, 5);
  return `IMPORTANT: Return ONLY a raw JSON object. No markdown. No code fences. No backticks. Start your response with { and end with }. Any other format will break the system.

Language: ${language}
Write ALL rewrites, issues, rationale, actionPlan, and finalSummary in this language: ${language}

These are the 5 lowest-scoring copy blocks to rewrite (block numbers: ${bottom5.map((b: any) => b.blockNumber).join(', ')}):
${JSON.stringify(bottom5)}

Original page content (find the exact block text here):
${truncate(data.pageMarkdown, MAX_CONTENT_CHARS)}`;
}

export function mergePassResults(pass1: any, pass2: any | null): any {
  const { greenBlocks, yellowBlocks, redBlocks, totalBlocks } = pass1.pageScore;
  const pageScore = {
    ...pass1.pageScore,
    greenPercent: totalBlocks > 0 ? Math.round((greenBlocks / totalBlocks) * 1000) / 10 : 0,
    yellowPercent: totalBlocks > 0 ? Math.round((yellowBlocks / totalBlocks) * 1000) / 10 : 0,
    redPercent: totalBlocks > 0 ? Math.round((redBlocks / totalBlocks) * 1000) / 10 : 0,
  };

  const copyHeatmap = (pass1.copyHeatmap || []).map((block: any) => ({
    blockNumber: block.blockNumber,
    sectionName: block.sectionName || undefined,
    blockText: null,
    blockTextPreview: block.preview || '',
    color: block.color,
    compositeScore: block.composite,
    scores: {
      clarity: block.scores?.[0] ?? 5,
      persuasion: block.scores?.[1] ?? 5,
      emotionalTone: block.scores?.[2] ?? 5,
      benefitFeatureRatio: block.scores?.[3] ?? 5,
      powerWords: block.scores?.[4] ?? 5,
      activeVoice: block.scores?.[5] ?? 5,
      conversionRelevance: block.scores?.[6] ?? 5,
    },
  }));

  const heatmapScoreMap = new Map(copyHeatmap.map((b: any) => [b.blockNumber, b.scores]));
  const heatmapSectionMap = new Map(copyHeatmap.map((b: any) => [b.blockNumber, b.sectionName]));
  const detailedBlocks: any[] = [];
  const topPriorityRewrites: any[] = [];

  if (pass2?.rewrites) {
    pass2.rewrites.forEach((r: any, idx: number) => {
      const blockScores = heatmapScoreMap.get(r.blockNumber) || { clarity: 5, persuasion: 5, emotionalTone: 5, benefitFeatureRatio: 5, powerWords: 5, activeVoice: 5, conversionRelevance: 5 };
      const color = r.currentScore >= 7 ? 'green' : r.currentScore >= 4 ? 'yellow' : 'red';
      const sectionName = heatmapSectionMap.get(r.blockNumber);
      detailedBlocks.push({
        blockNumber: r.blockNumber,
        sectionName: sectionName || undefined,
        originalText: r.originalText || '',
        compositeScore: r.currentScore,
        color,
        scores: blockScores,
        issues: r.issues || [],
        rewrite: r.rewrite || null,
        rewriteRationale: r.rationale || null,
        projectedScore: r.projectedScore || null,
      });
      topPriorityRewrites.push({
        priority: idx + 1,
        blockNumber: r.blockNumber,
        sectionName: sectionName || undefined,
        currentScore: r.currentScore,
        issue: r.issues?.[0] || '',
        rewrite: r.rewrite || '',
        projectedScore: r.projectedScore || r.currentScore,
      });
    });
  }

  return {
    _partial: pass2 === null,
    copySummary: pass1.copySummary,
    pageScore,
    copyHeatmap,
    dimensionAverages: pass1.dimensionAverages || [],
    detailedBlocks,
    topPriorityRewrites,
    patternAnalysis: {
      recurringPatterns: [pass1.patterns?.dominantWeakness, pass1.patterns?.worstHabit].filter(Boolean),
      dominantWeakness: pass1.patterns?.dominantWeakness || '',
      worstHabit: pass1.patterns?.worstHabit || '',
      coachingAdvice: pass1.patterns?.coachingAdvice || '',
    },
    actionPlan: pass2?.actionPlan || [],
    finalSummary: pass2?.finalSummary || pass1.copySummary,
  };
}

export function reconstructPass1Synthetic(existingResult: any): any {
  return {
    language: 'en',
    copySummary: existingResult.copySummary,
    pageScore: existingResult.pageScore,
    dimensionAverages: existingResult.dimensionAverages,
    copyHeatmap: (existingResult.copyHeatmap || []).map((b: any) => ({
      blockNumber: b.blockNumber,
      sectionName: b.sectionName || undefined,
      preview: b.blockTextPreview || '',
      color: b.color,
      composite: b.compositeScore,
      scores: [
        b.scores?.clarity ?? 5,
        b.scores?.persuasion ?? 5,
        b.scores?.emotionalTone ?? 5,
        b.scores?.benefitFeatureRatio ?? 5,
        b.scores?.powerWords ?? 5,
        b.scores?.activeVoice ?? 5,
        b.scores?.conversionRelevance ?? 5,
      ],
    })),
    patterns: {
      dominantWeakness: existingResult.patternAnalysis?.dominantWeakness || '',
      worstHabit: existingResult.patternAnalysis?.worstHabit || '',
      coachingAdvice: existingResult.patternAnalysis?.coachingAdvice || '',
    },
  };
}
