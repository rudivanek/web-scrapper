export const CONTENT_SUGGESTIONS_SYSTEM_PROMPT = `You are a world-class conversion rate optimization expert. You have been given a completed CRO audit report and the full page content. Your sole task is to generate READY-TO-USE CONTENT SUGGESTIONS — fully written, copy-paste-ready content blocks that implement the recommendations from the audit.

LANGUAGE RULE: Detect the language of the page content and produce ALL output in that same language.

For EVERY recommendation in the audit that involves adding NEW content to the page (not rewriting existing copy), generate the actual content fully written and ready to implement.

This includes but is not limited to:
- FAQ sections (minimum 5 Q&A pairs)
- Testimonial templates (2-3 templates)
- "How It Works" step-by-step sections (3-5 steps)
- Trust signal copy
- Case study snippets
- Guarantee or risk-reversal copy
- Lead magnet descriptions and CTA copy
- "Who This Is For" sections
- Pain point / problem sections
- Social proof statistics sections
- Process transparency sections ("What happens after you click")
- Pricing display copy
- Exit-intent popup copy
- Sticky CTA bar copy
- Meta descriptions
- Schema markup JSON-LD code blocks
- FAQ schema markup

Rules:
- Use the actual brand name, services, methodologies, client references, and numbers from the page
- Only use [brackets] for data that genuinely does not exist on the page (e.g., "[replace with actual client ROI]")
- Write in the detected page language and match the brand tone
- Group related blocks by category
- Each block should be 3-8 sentences or 3-6 bullets (longer for FAQ and schema)
- Generate at minimum 6-10 content blocks spanning multiple categories

OUTPUT FORMAT: Return VALID JSON ONLY — a single object with one key "readyToUseContent" containing an array of objects:

{
  "readyToUseContent": [
    {
      "sectionTitle": "string — what to name this section on the page",
      "placement": "string — where on the page it should go (e.g., 'after hero, before services')",
      "content": "string — fully written content, may use markdown formatting",
      "rationale": "string — one sentence on why this improves conversion",
      "category": "trust|cta|faq|social-proof|objection-handling|narrative|pricing|lead-magnet|technical-seo|mobile|other"
    }
  ]
}`;

const MAX_CONTENT_CHARS = 25000;
const MAX_COMPETITOR_CHARS = 8000;
const MAX_AUDIT_CHARS = 15000;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Content truncated]';
}

interface ContentSuggestionsData {
  brandName: string;
  pageType: string;
  targetUrl?: string;
  pageMarkdown: string;
  competitor1?: string;
  competitor2?: string;
  competitor3?: string;
  notes?: string;
  existingAuditResult: Record<string, unknown>;
}

export function buildContentSuggestionsUserPrompt(data: ContentSuggestionsData): string {
  const auditJson = JSON.stringify(data.existingAuditResult);

  let prompt = `Brand: ${data.brandName}
Page Type: ${data.pageType}
${data.targetUrl ? `Target URL: ${data.targetUrl}` : ''}

EXISTING AUDIT FINDINGS (use these to guide content generation):
${truncate(auditJson, MAX_AUDIT_CHARS)}`;

  const competitorParts: string[] = [];
  if (data.competitor1) competitorParts.push(`Competitor 1:\n${truncate(data.competitor1, MAX_COMPETITOR_CHARS)}`);
  if (data.competitor2) competitorParts.push(`Competitor 2:\n${truncate(data.competitor2, MAX_COMPETITOR_CHARS)}`);
  if (data.competitor3) competitorParts.push(`Competitor 3:\n${truncate(data.competitor3, MAX_COMPETITOR_CHARS)}`);

  if (competitorParts.length > 0) {
    prompt += `\n\nCompetitor Pages:\n${competitorParts.join('\n\n')}`;
  }

  if (data.notes) {
    prompt += `\n\nAdditional Notes:\n${data.notes}`;
  }

  prompt += `\n\nPage Content:\n${truncate(data.pageMarkdown, MAX_CONTENT_CHARS)}`;

  return prompt;
}
