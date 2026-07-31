// Fabrication check.
//
// Every piece of text in the blueprint should have come from the scraped page.
// Anything present in the blueprint but absent from copy.md was invented by the
// model — which is the failure mode that matters most in a client deliverable.
//
// This is deliberately conservative: it only reports text it is confident is
// absent. A checker that cries wolf gets ignored, and an ignored checker is
// worse than none.

export interface FabricationFinding {
  sectionIndex: number;
  sectionName: string;
  /** Where in the section the text lives, e.g. "headline" or "text_blocks[2] (h3)". */
  field: string;
  /** The offending text, truncated for display. */
  text: string;
}

/**
 * Normalize for comparison: lowercase, unify unicode punctuation the scraper and
 * the model render differently, collapse all whitespace. Deliberately keeps letters
 * and digits so a fabricated statistic cannot slip through.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    // curly quotes and apostrophes → straight
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    // dashes of every width → hyphen
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    // non-breaking and exotic spaces → space
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    // ellipsis → three dots
    .replace(/\u2026/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Text shorter than this is skipped — too generic to judge (e.g. "Ver", "SEO"). */
const MIN_LENGTH = 12;

/**
 * Fragments the model legitimately produces that are not verbatim page copy:
 * structural labels and enum-ish values that never appear in copy.md.
 */
function isStructuralValue(text: string): boolean {
  return /^\[reescribir[^\]]*\]$/i.test(text.trim());
}

interface BlueprintSectionLike {
  section_index?: number;
  section_name?: string;
  headline?: string | null;
  subheadline?: string | null;
  body_text?: string | null;
  text_blocks?: Array<{ role?: string; content?: string }>;
  cta_buttons?: Array<{ text?: string }>;
}

function collectTexts(section: BlueprintSectionLike): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [];
  const push = (field: string, value: unknown) => {
    if (typeof value === 'string' && value.trim()) out.push({ field, text: value });
  };

  push('headline', section.headline);
  push('subheadline', section.subheadline);
  push('body_text', section.body_text);

  if (Array.isArray(section.text_blocks)) {
    section.text_blocks.forEach((b, i) => {
      push(`text_blocks[${i}] (${b?.role ?? 'unknown'})`, b?.content);
    });
  }
  if (Array.isArray(section.cta_buttons)) {
    section.cta_buttons.forEach((b, i) => {
      push(`cta_buttons[${i}]`, b?.text);
    });
  }
  return out;
}

/**
 * Returns text found in the blueprint but not in the scraped copy.
 *
 * Pass the ORIGINAL copy.md, not the prompt. Returns an empty array when either
 * input is missing, so callers can run it unconditionally.
 */
export function detectFabricatedText(blueprintJson: string, copyMd: string): FabricationFinding[] {
  if (!blueprintJson?.trim() || !copyMd?.trim()) return [];

  let parsed: { sections?: unknown };
  try {
    parsed = JSON.parse(blueprintJson);
  } catch {
    return [];
  }
  if (!parsed || !Array.isArray(parsed.sections)) return [];

  const haystack = normalize(copyMd);
  const haystackNoSpace = haystack.replace(/\s+/g, '');
  const findings: FabricationFinding[] = [];

  (parsed.sections as BlueprintSectionLike[]).forEach((section, idx) => {
    const sectionIndex = typeof section?.section_index === 'number' ? section.section_index : idx + 1;
    const sectionName = typeof section?.section_name === 'string' ? section.section_name : `Section ${idx + 1}`;

    for (const { field, text } of collectTexts(section ?? {})) {
      const needle = normalize(text);
      if (needle.length < MIN_LENGTH) continue;
      if (isStructuralValue(text)) continue;
      if (haystack.includes(needle)) continue;

      // Whitespace-insensitive retry. The scraper and the model disagree about line
      // breaks more often than either invents text — "Meant<br>To Be" is one word to
      // one and two to the other. Fabricated text will not match either way.
      if (haystackNoSpace.includes(needle.replace(/\s+/g, ''))) continue;

      // The scraper sometimes splits a paragraph the model kept whole (or vice
      // versa). Before reporting, check whether every sentence-length chunk is
      // present individually — if so, it is a formatting difference, not invention.
      const chunks = needle.split(/(?<=[.!?])\s+/).filter(c => c.length >= MIN_LENGTH);
      if (chunks.length > 1 && chunks.every(c => haystack.includes(c))) continue;

      findings.push({
        sectionIndex,
        sectionName,
        field,
        text: text.length > 120 ? `${text.slice(0, 120)}…` : text,
      });
    }
  });

  return findings;
}
