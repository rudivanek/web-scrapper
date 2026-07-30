// Section templates — STRUCTURE ONLY.
//
// Hard rule: no template may contain a single word of invented content.
// Every text_block ships with content: '' and every asset with url: ''.
// What a template DOES supply is the skeleton: how many blocks, in what order,
// with what semantic role, and the layout contract that governs them.
//
// The source project these were adapted from shipped templates full of fake
// copy ("Jane Smith, CEO at Acme", "99.9% Uptime SLA", "$29/month"). Dropped
// into a client blueprint, that reads as extracted fact. Do not reintroduce it.

import type { BlueprintSection, LayoutContract, TextBlock, TextBlockRole } from '../types/sections';
import { DEFAULT_LAYOUT_CONTRACT } from '../types/sections';

export interface SectionTemplate {
  /** Stable key used by the modal. */
  id: string;
  /** Label shown in the picker. */
  label: string;
  /** One-line description of the STRUCTURE, not the content. */
  description: string;
  /** Single-character glyph for the picker tile. */
  glyph: string;
  /** Tile accent colour. */
  color: string;
  /** Value written to section_type. */
  sectionType: BlueprintSection['section_type'];
  /** Default section_name. */
  sectionName: string;
  /** Layout contract overrides merged over DEFAULT_LAYOUT_CONTRACT. */
  contract: Partial<LayoutContract>;
  /** Text blocks that exist once, regardless of item count. */
  fixedBlocks: TextBlockRole[];
  /**
   * Repeating unit, e.g. one feature card = ['h3', 'paragraph'].
   * Empty array means the template does not repeat.
   */
  repeatBlocks: TextBlockRole[];
  /** Default number of repetitions. */
  repeatDefault: number;
  /** Noun for the count stepper, e.g. "tarjetas". */
  repeatLabel: string;
  /** How many empty asset slots to scaffold. */
  assetSlots: number;
  /** Asset role for the scaffolded slots. */
  assetRole: BlueprintSection['assets'][number]['role'];
  /** Empty CTA button slots. */
  ctaSlots: number;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'hero-split',
    label: 'Hero (dividido)',
    description: '2 columnas: texto + imagen',
    glyph: 'H',
    color: '#2563eb',
    sectionType: 'hero',
    sectionName: 'Hero',
    contract: {
      section_role: 'Primary hero — first impression, above the fold',
      desktop_layout: 'split-right',
      mobile_layout: 'stack',
      column_structure: '50/50 — text left, image right',
      content_position: 'left',
      image_position: 'right',
      alignment_rules: 'text-left',
      spacing_density: 'hero-scale',
      must_preserve: ['Image stays in the right column on desktop', 'H1 is the first text element'],
      allowed_simplifications: ['Shadow and border-radius may be simplified'],
      do_not_do: ['Do not centre the content', 'Do not collapse the split into one column on desktop'],
    },
    fixedBlocks: ['h1', 'paragraph'],
    repeatBlocks: [],
    repeatDefault: 0,
    repeatLabel: '',
    assetSlots: 1,
    assetRole: 'hero',
    ctaSlots: 1,
  },
  {
    id: 'hero-centered',
    label: 'Hero (centrado)',
    description: 'Ancho completo, texto centrado',
    glyph: 'H',
    color: '#2563eb',
    sectionType: 'hero',
    sectionName: 'Hero',
    contract: {
      section_role: 'Primary hero — first impression, above the fold',
      desktop_layout: 'full-width',
      mobile_layout: 'stack',
      column_structure: 'single centred column',
      content_position: 'center',
      image_position: 'background',
      alignment_rules: 'text-center',
      spacing_density: 'hero-scale',
      must_preserve: ['H1 stays centred', 'CTA row sits directly below the subheadline'],
      allowed_simplifications: ['Background overlay opacity may be adjusted'],
      do_not_do: ['Do not left-align the headline', 'Do not add a sidebar'],
    },
    fixedBlocks: ['label', 'h1', 'paragraph'],
    repeatBlocks: [],
    repeatDefault: 0,
    repeatLabel: '',
    assetSlots: 1,
    assetRole: 'background',
    ctaSlots: 2,
  },
  {
    id: 'features-grid',
    label: 'Features (grid)',
    description: 'Grid de tarjetas de características',
    glyph: 'F',
    color: '#059669',
    sectionType: 'features',
    sectionName: 'Características',
    contract: {
      section_role: 'Explain what the product or service does',
      desktop_layout: 'grid-3col',
      mobile_layout: 'stack',
      column_structure: '3 equal columns',
      content_position: 'center',
      image_position: 'none',
      card_or_grid_structure: '3-column card grid; each card: icon → title → description',
      alignment_rules: 'mixed — heading centred, card text left',
      spacing_density: 'normal',
      must_preserve: ['Card count stays the same', 'Grid stays 3 columns on desktop'],
      allowed_simplifications: ['Icons may be substituted', 'Card shadow may be simplified'],
      do_not_do: ['Do not convert the grid into a vertical list on desktop'],
    },
    fixedBlocks: ['h2', 'paragraph'],
    repeatBlocks: ['h3', 'paragraph'],
    repeatDefault: 3,
    repeatLabel: 'tarjetas',
    assetSlots: 0,
    assetRole: 'icon',
    ctaSlots: 0,
  },
  {
    id: 'stats',
    label: 'Stats',
    description: 'Fila de cifras clave',
    glyph: '#',
    color: '#6366f1',
    sectionType: 'stats',
    sectionName: 'Cifras',
    contract: {
      section_role: 'Provide proof through numbers',
      desktop_layout: 'grid-4col',
      mobile_layout: 'stack',
      column_structure: '4 equal columns',
      content_position: 'center',
      image_position: 'none',
      card_or_grid_structure: 'One stat per column: figure above, label below',
      alignment_rules: 'text-center',
      spacing_density: 'normal',
      must_preserve: ['Figure renders larger than its label', 'Stat count stays the same'],
      allowed_simplifications: ['Dividers between stats may be omitted'],
      do_not_do: ['Do not invent figures — every number must come from the source page'],
    },
    fixedBlocks: [],
    repeatBlocks: ['h3', 'label'],
    repeatDefault: 4,
    repeatLabel: 'cifras',
    assetSlots: 0,
    assetRole: 'icon',
    ctaSlots: 0,
  },
  {
    id: 'testimonials',
    label: 'Testimonios',
    description: 'Tarjetas de citas',
    glyph: 'T',
    color: '#7c3aed',
    sectionType: 'testimonials',
    sectionName: 'Testimonios',
    contract: {
      section_role: 'Social proof from real customers',
      desktop_layout: 'grid-3col',
      mobile_layout: 'stack',
      column_structure: '3 equal columns',
      content_position: 'center',
      image_position: 'none',
      card_or_grid_structure: 'Quote card: quote text, then attribution row',
      alignment_rules: 'text-left inside cards, heading centred',
      spacing_density: 'normal',
      must_preserve: ['Attribution stays attached to its quote'],
      allowed_simplifications: ['Avatar images may be omitted if unavailable'],
      do_not_do: ['Do not invent quotes, names, or company names'],
    },
    fixedBlocks: ['h2'],
    repeatBlocks: ['quote', 'label'],
    repeatDefault: 3,
    repeatLabel: 'testimonios',
    assetSlots: 0,
    assetRole: 'card',
    ctaSlots: 0,
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Acordeón de preguntas',
    glyph: '?',
    color: '#ea580c',
    sectionType: 'faq',
    sectionName: 'Preguntas frecuentes',
    contract: {
      section_role: 'Remove purchase objections',
      desktop_layout: 'contained',
      mobile_layout: 'collapse',
      column_structure: 'single column, max-width container, centred',
      content_position: 'center',
      image_position: 'none',
      card_or_grid_structure: 'Accordion list: question row, answer revealed on expand',
      alignment_rules: 'text-left',
      spacing_density: 'normal',
      must_preserve: ['Question and answer stay paired', 'Question count stays the same'],
      allowed_simplifications: ['Expand animation may be simplified'],
      do_not_do: ['Do not reduce the number of questions', 'Do not invent questions or answers'],
    },
    fixedBlocks: ['h2'],
    repeatBlocks: ['h3', 'paragraph'],
    repeatDefault: 6,
    repeatLabel: 'preguntas',
    assetSlots: 0,
    assetRole: 'icon',
    ctaSlots: 0,
  },
  {
    id: 'pricing',
    label: 'Precios',
    description: 'Tarjetas comparativas de planes',
    glyph: '$',
    color: '#d97706',
    sectionType: 'pricing',
    sectionName: 'Precios',
    contract: {
      section_role: 'Present plans and drive plan selection',
      desktop_layout: 'grid-3col',
      mobile_layout: 'stack',
      column_structure: '3 equal columns',
      content_position: 'center',
      image_position: 'none',
      card_or_grid_structure: 'Pricing card: plan name, price, feature list, CTA at the bottom',
      alignment_rules: 'text-center',
      spacing_density: 'normal',
      must_preserve: ['Every plan keeps its own CTA', 'Plan count stays the same'],
      allowed_simplifications: ['Featured-plan emphasis may be simplified'],
      do_not_do: ['Do not invent prices, plan names, or features'],
    },
    fixedBlocks: ['h2', 'paragraph'],
    repeatBlocks: ['h3', 'label', 'paragraph'],
    repeatDefault: 3,
    repeatLabel: 'planes',
    assetSlots: 0,
    assetRole: 'icon',
    ctaSlots: 0,
  },
  {
    id: 'cta-banner',
    label: 'CTA (banner)',
    description: 'Banner de ancho completo',
    glyph: 'C',
    color: '#dc2626',
    sectionType: 'cta',
    sectionName: 'Llamado a la acción',
    contract: {
      section_role: 'Final conversion push',
      desktop_layout: 'full-width',
      mobile_layout: 'stack',
      column_structure: 'single centred column',
      content_position: 'center',
      image_position: 'none',
      alignment_rules: 'text-center',
      spacing_density: 'spacious',
      must_preserve: ['CTA button stays visible without scrolling past the section'],
      allowed_simplifications: ['Background treatment may be simplified to a solid colour'],
      do_not_do: ['Do not bury the button below secondary text'],
    },
    fixedBlocks: ['h2', 'paragraph'],
    repeatBlocks: [],
    repeatDefault: 0,
    repeatLabel: '',
    assetSlots: 0,
    assetRole: 'background',
    ctaSlots: 1,
  },
  {
    id: 'content-split',
    label: 'Contenido 50/50',
    description: 'Texto + imagen a dos columnas',
    glyph: '/',
    color: '#3b82f6',
    sectionType: 'content',
    sectionName: 'Contenido',
    contract: {
      section_role: 'Explain a single idea in depth',
      desktop_layout: 'split-right',
      mobile_layout: 'stack',
      column_structure: '50/50 — text left, image right',
      content_position: 'left',
      image_position: 'right',
      alignment_rules: 'text-left',
      spacing_density: 'normal',
      must_preserve: ['Image stays paired with its text block'],
      allowed_simplifications: ['Border-radius and shadow may be simplified'],
      do_not_do: ['Do not stack into one column on desktop'],
    },
    fixedBlocks: ['label', 'h2', 'paragraph'],
    repeatBlocks: [],
    repeatDefault: 0,
    repeatLabel: '',
    assetSlots: 1,
    assetRole: 'card',
    ctaSlots: 1,
  },
  {
    id: 'team',
    label: 'Equipo',
    description: 'Tarjetas de personas',
    glyph: 'P',
    color: '#16a34a',
    sectionType: 'team',
    sectionName: 'Equipo',
    contract: {
      section_role: 'Build trust by showing the people behind the business',
      desktop_layout: 'grid-3col',
      mobile_layout: 'stack',
      column_structure: '3 equal columns',
      content_position: 'center',
      image_position: 'above',
      card_or_grid_structure: 'Person card: photo, name, role',
      alignment_rules: 'text-center',
      spacing_density: 'normal',
      must_preserve: ['Each photo stays matched to its name'],
      allowed_simplifications: ['Photo crop shape may be simplified'],
      do_not_do: ['Do not invent names, roles, or photos'],
    },
    fixedBlocks: ['h2'],
    repeatBlocks: ['h3', 'label'],
    repeatDefault: 3,
    repeatLabel: 'personas',
    assetSlots: 3,
    assetRole: 'card',
    ctaSlots: 0,
  },
  {
    id: 'logos',
    label: 'Barra de logos',
    description: 'Franja de logos de clientes',
    glyph: 'L',
    color: '#6b7280',
    sectionType: 'partners',
    sectionName: 'Clientes',
    contract: {
      section_role: 'Social proof through recognisable brands',
      desktop_layout: 'full-width',
      mobile_layout: 'scroll-horizontal',
      column_structure: 'single horizontal row, evenly spaced',
      content_position: 'center',
      image_position: 'none',
      card_or_grid_structure: 'Logo strip — one row, equal spacing',
      alignment_rules: 'text-center',
      spacing_density: 'tight',
      must_preserve: ['Logos stay in one row on desktop'],
      allowed_simplifications: ['Greyscale filter may be omitted'],
      do_not_do: ['Do not substitute logos for brands not on the source page'],
    },
    fixedBlocks: ['label'],
    repeatBlocks: [],
    repeatDefault: 0,
    repeatLabel: '',
    assetSlots: 6,
    assetRole: 'logo',
    ctaSlots: 0,
  },
  {
    id: 'gallery',
    label: 'Galería',
    description: 'Grid de imágenes',
    glyph: 'G',
    color: '#ec4899',
    sectionType: 'gallery',
    sectionName: 'Galería',
    contract: {
      section_role: 'Show work visually',
      desktop_layout: 'grid-3col',
      mobile_layout: 'stack',
      column_structure: '3 equal columns',
      content_position: 'center',
      image_position: 'none',
      card_or_grid_structure: 'Image grid, uniform aspect ratio',
      alignment_rules: 'text-center',
      spacing_density: 'tight',
      must_preserve: ['Image aspect ratio stays uniform across the grid'],
      allowed_simplifications: ['Lightbox behaviour may be omitted'],
      do_not_do: ['Do not substitute stock imagery for the real images'],
    },
    fixedBlocks: ['h2'],
    repeatBlocks: [],
    repeatDefault: 0,
    repeatLabel: '',
    assetSlots: 6,
    assetRole: 'card',
    ctaSlots: 0,
  },
  {
    id: 'contact',
    label: 'Contacto',
    description: 'Formulario + datos',
    glyph: '@',
    color: '#0d9488',
    sectionType: 'contact',
    sectionName: 'Contacto',
    contract: {
      section_role: 'Capture enquiries',
      desktop_layout: 'split-left',
      mobile_layout: 'stack',
      column_structure: '60/40 — form left, contact details right',
      content_position: 'left',
      image_position: 'none',
      alignment_rules: 'text-left',
      spacing_density: 'normal',
      must_preserve: ['Form field count and order', 'Submit button stays below the fields'],
      allowed_simplifications: ['Map embed may be replaced by a static address block'],
      do_not_do: ['Do not invent phone numbers, emails, or addresses'],
    },
    fixedBlocks: ['h2', 'paragraph'],
    repeatBlocks: ['label'],
    repeatDefault: 4,
    repeatLabel: 'campos',
    assetSlots: 0,
    assetRole: 'icon',
    ctaSlots: 1,
  },
];

/** Builds empty text blocks for a template at the requested repeat count. */
function buildTextBlocks(template: SectionTemplate, repeatCount: number): TextBlock[] {
  const blocks: TextBlock[] = template.fixedBlocks.map(role => ({ role, content: '' }));
  if (template.repeatBlocks.length === 0) return blocks;
  for (let i = 0; i < repeatCount; i += 1) {
    template.repeatBlocks.forEach(role => blocks.push({ role, content: '' }));
  }
  return blocks;
}

/**
 * Turns a template into a section patch. Every content field comes back EMPTY.
 * The caller merges this over a blank section from createEmptySection().
 */
export function applyTemplate(template: SectionTemplate, repeatCount: number): Partial<BlueprintSection> {
  return {
    section_name: template.sectionName,
    section_type: template.sectionType,
    headline: null,
    subheadline: null,
    body_text: null,
    text_blocks: buildTextBlocks(template, repeatCount),
    assets: Array.from({ length: template.assetSlots }, () => ({
      url: '',
      alt: '',
      role: template.assetRole,
    })),
    cta_buttons: Array.from({ length: template.ctaSlots }, () => ({
      text: '',
      style: 'primary' as const,
    })),
    media: {
      has_image: template.assetSlots > 0,
      has_video: false,
      has_background_image: template.assetRole === 'background' && template.assetSlots > 0,
      image_description: null,
    },
    layout_contract: { ...DEFAULT_LAYOUT_CONTRACT, ...template.contract },
    background_color: null,
    background_tone: null,
    text_color: null,
    estimated_height_desktop: null,
  };
}


export { SECTION_TEMPLATES, applyTemplate }