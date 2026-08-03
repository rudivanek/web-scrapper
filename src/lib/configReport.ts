// Generates config.md — a record of how an extraction was configured and what came out.
//
// The point is the "Resultado" section. Settings you might remember; whether design.md
// came back complete, or whether the fabrication check found anything, you will not.
// When a build goes wrong weeks later, this says whether the inputs were sound.

/** Everything needed to reproduce a run. Embedded in config.md and read back on upload. */
export interface ReusableSettings {
  url: string;
  structureUrl: string;
  preset: 'clone' | 'restyle' | 'describe' | 'manual' | null;
  restyleSource: 'url' | 'file';
  designSource: 'extract' | 'own';
  copyMode: 'scrape' | 'lorem';
  copySource: 'structure' | 'placeholder';
  imageSource: 'design' | 'copy' | 'unsplash';
  fillUnsplash: boolean;
  generateBlueprint: boolean;
  vibeTarget: string;
  builderFormat: 'html' | 'react';
}

export const CONFIG_SCHEMA = 'sharpen-extract-config@1';

export interface ConfigReportInput {
  siteName: string;
  designUrl: string;
  copyUrl: string;
  presetLabel: string | null;
  designSource: 'extract' | 'own';
  ownDesignMdLength: number;
  copyMode: 'scrape' | 'lorem';
  imageSource: 'design' | 'copy' | 'unsplash';
  fillUnsplash: boolean;
  generateBlueprint: boolean;
  builderTarget: string;
  builderFormat: 'html' | 'react';
  designMd: string;
  designMdIncomplete: boolean;
  copyMd: string | null;
  imagesMd: string | null;
  blueprintJson: string;
  blueprintIncomplete: boolean;
  fabricationCount: number;
  editedByHand: boolean;
  settings: ReusableSettings;
  fontNotes: string[];
}

function kb(text: string | null | undefined): string {
  if (!text) return '—';
  return `${(new Blob([text]).size / 1024).toFixed(1)} KB`;
}

function countImages(imagesMd: string | null): number {
  if (!imagesMd) return 0;
  return (imagesMd.match(/^- https?:\/\//gm) ?? []).length;
}

function countSections(blueprintJson: string): number | null {
  if (!blueprintJson.trim()) return null;
  try {
    const bp = JSON.parse(blueprintJson) as { sections?: unknown };
    return Array.isArray(bp.sections) ? bp.sections.length : null;
  } catch {
    return null;
  }
}

function readMode(blueprintJson: string): 'Estructurado' | 'Libre' | null {
  if (!blueprintJson.trim()) return null;
  try {
    const bp = JSON.parse(blueprintJson) as { blueprint_mode?: unknown };
    return bp.blueprint_mode === 'free' ? 'Libre' : 'Estructurado';
  } catch {
    return null;
  }
}

function hasInstructions(blueprintJson: string): boolean {
  if (!blueprintJson.trim()) return false;
  try {
    const bp = JSON.parse(blueprintJson) as { user_instructions?: unknown };
    return typeof bp.user_instructions === 'string' && bp.user_instructions.trim() !== '';
  } catch {
    return false;
  }
}

const yesNo = (v: boolean) => (v ? 'sí' : 'no');

export function buildConfigReport(input: ConfigReportInput): string {
  const {
    siteName, designUrl, copyUrl, presetLabel, designSource, ownDesignMdLength,
    copyMode, imageSource, fillUnsplash, generateBlueprint, builderTarget, builderFormat,
    designMd, designMdIncomplete, copyMd, imagesMd, blueprintJson, blueprintIncomplete,
    fabricationCount, editedByHand,
  } = input;

  // Non-empty is not enough — the same URL in both fields is a single-source run.
  // Matches the isDualUrl test in DesignExtractor so the report cannot contradict the UI.
  const normalize = (u: string) => u.trim().toLowerCase().replace(/\/+$/, '');
  const dual = copyUrl.trim() !== '' && normalize(copyUrl) !== normalize(designUrl);
  const contentUrl = dual ? copyUrl : designUrl;
  const sectionCount = countSections(blueprintJson);
  const mode = readMode(blueprintJson);

  const designOrigin = designSource === 'own'
    ? `design.md propio (${ownDesignMdLength.toLocaleString()} caracteres) — sin extracción`
    : `${designUrl} (extraído)`;

  const copyOrigin = copyMode === 'lorem'
    ? 'Lorem Ipsum — texto de relleno, no real'
    : `${contentUrl} (real, verbatim)`;

  const imageOrigin = imageSource === 'copy'
    ? contentUrl
    : imageSource === 'unsplash'
      ? 'Unsplash (genéricas)'
      : designUrl;

  const structure = sectionCount === null
    ? 'Sin lista de secciones'
    : `${sectionCount} ${sectionCount === 1 ? 'sección' : 'secciones'}${mode ? ` · modo ${mode}` : ''}`;

  const lines: string[] = [];

  lines.push('# Configuración de la extracción');
  lines.push('');
  lines.push(`**Sitio:** ${siteName}`);
  lines.push(`**Fecha:** ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}`);
  if (presetLabel) lines.push(`**Preset:** ${presetLabel}`);
  lines.push('');

  lines.push('## Orígenes');
  lines.push('');
  lines.push('| Qué | De dónde |');
  lines.push('|---|---|');
  lines.push(`| Sistema de diseño | ${designOrigin} |`);
  lines.push(`| Texto | ${copyOrigin} |`);
  lines.push(`| Imágenes | ${imageOrigin} |`);
  lines.push(`| Estructura | ${structure} |`);
  lines.push('');

  lines.push('## Opciones');
  lines.push('');
  lines.push(`- Generar lista de secciones: ${yesNo(generateBlueprint)}`);
  lines.push(`- Lorem Ipsum: ${yesNo(copyMode === 'lorem')}`);
  lines.push(`- Rellenar con Unsplash: ${yesNo(fillUnsplash)}`);
  lines.push(`- design.md propio: ${yesNo(designSource === 'own')}`);
  lines.push(`- Instrucciones de layout: ${yesNo(hasInstructions(blueprintJson))}`);
  lines.push('');

  lines.push('## Resultado');
  lines.push('');
  lines.push(`- design.md — ${kb(designMd)}${designMdIncomplete ? ' — **INCOMPLETO, se cortó**' : ', completo'}`);
  lines.push(`- copy.md — ${kb(copyMd)}`);
  const imgCount = countImages(imagesMd);
  lines.push(`- images.md — ${kb(imagesMd)}, ${imgCount} ${imgCount === 1 ? 'imagen real' : 'imágenes reales'}`);
  if (sectionCount !== null) {
    lines.push(`- blueprint.json — ${sectionCount} ${sectionCount === 1 ? 'sección' : 'secciones'}${blueprintIncomplete ? ' — **INCOMPLETO o JSON inválido**' : ''}`);
  }
  for (const note of input.fontNotes) lines.push(note);
  lines.push(
    fabricationCount > 0
      ? `- Revisión de invención: **${fabricationCount} ${fabricationCount === 1 ? 'frase' : 'frases'} no encontradas en la página** — verificar antes de entregar`
      : copyMode === 'lorem'
        ? '- Revisión de invención: omitida (modo Lorem Ipsum)'
        : '- Revisión de invención: sin hallazgos',
  );
  lines.push(`- Prompt para builder: ${builderTarget} · ${builderFormat === 'html' ? 'HTML único' : 'React + Tailwind'}`);
  lines.push('');

  lines.push('## Notas');
  lines.push('');
  lines.push(`- Captura de pantalla: adjuntar la de ${contentUrl}${dual ? ` — no la de ${designUrl}.` : '.'}`);
  if (editedByHand) {
    lines.push('- La estructura se editó a mano después de extraer.');
  }
  if (copyMode === 'lorem') {
    lines.push('- **El texto es de relleno.** No entregar esta salida a un cliente como su sitio.');
  }
  if (designMdIncomplete || blueprintIncomplete) {
    lines.push('- **Un archivo quedó incompleto.** Vuelve a extraer antes de usar esta salida.');
  }

  lines.push('');
  lines.push('## Configuración reutilizable');
  lines.push('');
  lines.push('Sube este archivo con **Cargar configuración** para repetir esta extracción con los mismos ajustes. No edites el bloque de abajo a mano.');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({ schema: CONFIG_SCHEMA, ...input.settings }, null, 2));
  lines.push('```');

  return lines.join('\n');
}

const PRESETS = ['clone', 'restyle', 'describe', 'manual'] as const;
const RESTYLE_SOURCES = ['url', 'file'] as const;
const DESIGN_SOURCES = ['extract', 'own'] as const;
const COPY_MODES = ['scrape', 'lorem'] as const;
const COPY_SOURCES = ['structure', 'placeholder'] as const;
const IMAGE_SOURCES = ['design', 'copy', 'unsplash'] as const;
const BUILDER_FORMATS = ['html', 'react'] as const;
const VIBE_TARGETS = ['lovable', 'bolt', 'v0', 'claude-design', 'replit', 'generic'] as const;

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function pickUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  if (t === '') return '';
  if (!/^https?:\/\//i.test(t)) return undefined;
  return t;
}

function pickBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export interface ParsedConfig {
  settings: Partial<ReusableSettings>;
  /** Field names present in the file but rejected as invalid. */
  rejected: string[];
}

/**
 * Read the settings block out of an uploaded config.md.
 *
 * The uploaded file is untrusted input. Every field is checked against an explicit
 * allow-list and anything unrecognised is discarded — never spread the parsed object
 * into state wholesale.
 *
 * Returns null when the file contains no readable settings block at all.
 */
export function parseConfigSettings(markdown: string): ParsedConfig | null {
  const match = markdown.match(/```json\s*([\s\S]*?)```/g);
  if (!match || match.length === 0) return null;

  // Use the LAST json fence — the settings block is always appended at the end.
  const lastFence = match[match.length - 1];
  const body = lastFence.replace(/^```json\s*/, '').replace(/```$/, '').trim();

  let raw: Record<string, unknown>;
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    raw = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  if (raw.schema !== CONFIG_SCHEMA) return null;

  const settings: Partial<ReusableSettings> = {};
  const rejected: string[] = [];

  const assign = <K extends keyof ReusableSettings>(key: K, value: ReusableSettings[K] | undefined) => {
    if (value === undefined) {
      if (key in raw) rejected.push(key);
    } else {
      settings[key] = value;
    }
  };

  assign('url', pickUrl(raw.url));
  assign('structureUrl', pickUrl(raw.structureUrl));
  assign('restyleSource', pick(raw.restyleSource, RESTYLE_SOURCES));
  assign('designSource', pick(raw.designSource, DESIGN_SOURCES));
  assign('copyMode', pick(raw.copyMode, COPY_MODES));
  assign('copySource', pick(raw.copySource, COPY_SOURCES));
  assign('imageSource', pick(raw.imageSource, IMAGE_SOURCES));
  assign('fillUnsplash', pickBool(raw.fillUnsplash));
  assign('generateBlueprint', pickBool(raw.generateBlueprint));
  assign('builderFormat', pick(raw.builderFormat, BUILDER_FORMATS));
  assign('vibeTarget', pick(raw.vibeTarget, VIBE_TARGETS));

  // preset is nullable, so it needs its own handling rather than `assign`.
  if (raw.preset === null) {
    settings.preset = null;
  } else {
    const p = pick(raw.preset, PRESETS);
    if (p) settings.preset = p;
    else if ('preset' in raw) rejected.push('preset');
  }

  return { settings, rejected };
}
