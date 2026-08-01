// Generates config.md — a record of how an extraction was configured and what came out.
//
// The point is the "Resultado" section. Settings you might remember; whether design.md
// came back complete, or whether the fabrication check found anything, you will not.
// When a build goes wrong weeks later, this says whether the inputs were sound.

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

  const dual = copyUrl.trim() !== '';
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

  return lines.join('\n');
}
