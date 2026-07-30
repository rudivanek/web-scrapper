// Blueprint section types — mirrors the JSON shape emitted by
// BLUEPRINT_SYSTEM_PROMPT in src/lib/prompts/designExtractionPrompts.ts.
// The editor reads and writes this shape so edits flow straight into
// vibePrompt.ts without any translation layer.

export const SECTION_TYPES = [
  'hero', 'features', 'testimonials', 'pricing', 'cta', 'about',
  'portfolio', 'blog', 'contact', 'faq', 'stats', 'team',
  'partners', 'content', 'gallery',
] as const;

export type SectionType = typeof SECTION_TYPES[number];

export const TEXT_BLOCK_ROLES = [
  'h1', 'h2', 'h3', 'h4', 'paragraph', 'list_item', 'label', 'quote', 'button',
] as const;

export type TextBlockRole = typeof TEXT_BLOCK_ROLES[number];

export const ASSET_ROLES = ['hero', 'logo', 'card', 'icon', 'background'] as const;
export type AssetRole = typeof ASSET_ROLES[number];

export const DESKTOP_LAYOUTS = [
  'full-width', 'contained', 'split-left', 'split-right',
  'grid-2col', 'grid-3col', 'grid-4col', 'masonry', 'carousel', 'stack',
] as const;

export const MOBILE_LAYOUTS = ['stack', 'scroll-horizontal', 'collapse', 'same-as-desktop'] as const;

export interface TextBlock {
  role: TextBlockRole;
  content: string;
}

export interface SectionAsset {
  url: string;
  alt: string;
  role: AssetRole;
}

export interface CtaButton {
  text: string;
  style: 'primary' | 'secondary' | 'ghost';
}

export interface SectionMedia {
  has_image: boolean;
  has_video: boolean;
  has_background_image: boolean;
  image_description: string | null;
}

export interface LayoutContract {
  section_role: string;
  desktop_layout: string;
  mobile_layout: string;
  column_structure: string;
  content_position: string;
  image_position: string;
  card_or_grid_structure: string;
  alignment_rules: string;
  spacing_density: string;
  // NOTE: these three are ARRAYS in this app (blueprint-maker used strings).
  // vibePrompt.ts calls .join() on them — never let a bare string in here.
  must_preserve: string[];
  allowed_simplifications: string[];
  do_not_do: string[];
}

export interface BlueprintSection {
  section_index: number;
  section_name: string;
  section_type: SectionType;
  headline: string | null;
  subheadline: string | null;
  body_text: string | null;
  cta_buttons: CtaButton[];
  text_blocks: TextBlock[];
  assets: SectionAsset[];
  media: SectionMedia;
  layout_contract: LayoutContract;
  background_color: string | null;
  background_tone: 'dark' | 'light' | 'mid' | null;
  text_color: string | null;
  estimated_height_desktop: string | null;
  /** Client-only stable React key. Stripped on serialize — never reaches the AI. */
  _uid: string;
}

export const DEFAULT_LAYOUT_CONTRACT: LayoutContract = {
  section_role: '',
  desktop_layout: '',
  mobile_layout: '',
  column_structure: '',
  content_position: '',
  image_position: '',
  card_or_grid_structure: '',
  alignment_rules: '',
  spacing_density: '',
  must_preserve: [],
  allowed_simplifications: [],
  do_not_do: [],
};

export const DEFAULT_MEDIA: SectionMedia = {
  has_image: false,
  has_video: false,
  has_background_image: false,
  image_description: null,
};

let uidCounter = 0;
export function makeUid(): string {
  uidCounter += 1;
  return `sec_${Date.now().toString(36)}_${uidCounter}`;
}

/** Coerce a value that should be string[] but may arrive as a string or null. */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) {
    // Legacy / AI-returned single string — keep the text, don't drop it.
    return [value.trim()];
  }
  return [];
}

function toStringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function normalizeLayoutContract(value: unknown): LayoutContract {
  const raw = (value !== null && typeof value === 'object' && !Array.isArray(value))
    ? value as Record<string, unknown>
    : {};
  return {
    section_role: toStringField(raw.section_role),
    desktop_layout: toStringField(raw.desktop_layout),
    mobile_layout: toStringField(raw.mobile_layout),
    column_structure: toStringField(raw.column_structure),
    content_position: toStringField(raw.content_position),
    image_position: toStringField(raw.image_position),
    card_or_grid_structure: toStringField(raw.card_or_grid_structure),
    alignment_rules: toStringField(raw.alignment_rules),
    spacing_density: toStringField(raw.spacing_density),
    must_preserve: toStringArray(raw.must_preserve),
    allowed_simplifications: toStringArray(raw.allowed_simplifications),
    do_not_do: toStringArray(raw.do_not_do),
  };
}

function normalizeMedia(value: unknown): SectionMedia {
  const raw = (value !== null && typeof value === 'object' && !Array.isArray(value))
    ? value as Record<string, unknown>
    : {};
  return {
    has_image: raw.has_image === true,
    has_video: raw.has_video === true,
    has_background_image: raw.has_background_image === true,
    image_description: toNullableString(raw.image_description),
  };
}

function normalizeTextBlocks(value: unknown): TextBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((b): b is Record<string, unknown> => b !== null && typeof b === 'object')
    .map(b => ({
      role: (TEXT_BLOCK_ROLES as readonly string[]).includes(String(b.role))
        ? b.role as TextBlockRole
        : 'paragraph',
      content: toStringField(b.content),
    }));
}

function normalizeAssets(value: unknown): SectionAsset[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => a !== null && typeof a === 'object')
    .map(a => ({
      url: toStringField(a.url),
      alt: toStringField(a.alt),
      role: (ASSET_ROLES as readonly string[]).includes(String(a.role))
        ? a.role as AssetRole
        : 'card',
    }));
}

function normalizeCtaButtons(value: unknown): CtaButton[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((b): b is Record<string, unknown> => b !== null && typeof b === 'object')
    .map(b => ({
      text: toStringField(b.text),
      style: b.style === 'secondary' || b.style === 'ghost'
        ? b.style
        : 'primary' as const,
    }));
}

export function normalizeSection(raw: unknown, fallbackIndex: number): BlueprintSection {
  const s = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {};
  const type = String(s.section_type);
  return {
    section_index: typeof s.section_index === 'number' ? s.section_index : fallbackIndex,
    section_name: toStringField(s.section_name) || `Section ${fallbackIndex}`,
    section_type: (SECTION_TYPES as readonly string[]).includes(type)
      ? type as SectionType
      : 'content',
    headline: toNullableString(s.headline),
    subheadline: toNullableString(s.subheadline),
    body_text: toNullableString(s.body_text),
    cta_buttons: normalizeCtaButtons(s.cta_buttons),
    text_blocks: normalizeTextBlocks(s.text_blocks),
    assets: normalizeAssets(s.assets),
    media: normalizeMedia(s.media),
    layout_contract: normalizeLayoutContract(s.layout_contract),
    background_color: toNullableString(s.background_color),
    background_tone: s.background_tone === 'dark' || s.background_tone === 'light' || s.background_tone === 'mid'
      ? s.background_tone
      : null,
    text_color: toNullableString(s.text_color),
    estimated_height_desktop: toNullableString(s.estimated_height_desktop),
    _uid: makeUid(),
  };
}

/** A blank section. Deliberately EMPTY of copy — no invented content, ever. */
export function createEmptySection(index: number): BlueprintSection {
  return {
    section_index: index,
    section_name: `Section ${index}`,
    section_type: 'content',
    headline: null,
    subheadline: null,
    body_text: null,
    cta_buttons: [],
    text_blocks: [],
    assets: [],
    media: { ...DEFAULT_MEDIA },
    layout_contract: { ...DEFAULT_LAYOUT_CONTRACT },
    background_color: null,
    background_tone: null,
    text_color: null,
    estimated_height_desktop: null,
    _uid: makeUid(),
  };
}

export interface ParsedBlueprint {
  /** Everything in the blueprint that is NOT the sections array (page_title, globals, ...). */
  envelope: Record<string, unknown>;
  sections: BlueprintSection[];
  error: string | null;
}

export function parseBlueprint(json: string): ParsedBlueprint {
  if (!json || !json.trim()) {
    return { envelope: {}, sections: [], error: null };
  }
  try {
    const parsed = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { envelope: {}, sections: [], error: 'Blueprint is not a JSON object.' };
    }
    const obj = parsed as Record<string, unknown>;
    const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
    const { sections: _drop, ...envelope } = obj;
    void _drop;
    return {
      envelope,
      sections: rawSections.map((s, i) => normalizeSection(s, i + 1)),
      error: null,
    };
  } catch (e) {
    return {
      envelope: {},
      sections: [],
      error: e instanceof Error ? e.message : 'Invalid JSON.',
    };
  }
}

/**
 * Rebuild the blueprint JSON string. Strips _uid and renumbers section_index
 * from 1 with no gaps (the blueprint prompt requires this).
 */
export function serializeBlueprint(envelope: Record<string, unknown>, sections: BlueprintSection[]): string {
  const clean = sections.map((s, i) => {
    const { _uid: _ignored, ...rest } = s;
    void _ignored;
    return { ...rest, section_index: i + 1 };
  });
  return JSON.stringify({ ...envelope, sections: clean }, null, 2);
}
