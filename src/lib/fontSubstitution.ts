// Font availability and substitution.
//
// A font named in design.md is not necessarily a font the builder can load. Licensed
// faces (Gilroy, Circular), Adobe Fonts families and Elementor uploads all extract
// cleanly and then fail to load. This maps them to the closest Google Fonts equivalent
// so the substitution is a recorded decision rather than the builder's silent guess.
//
// design.md is NEVER modified. Substitutions live in the builder prompt only.

/** Common Google Fonts families, lowercased. Not exhaustive — covers what real sites use. */
const GOOGLE_FONTS = new Set(
  ('inter,roboto,open sans,noto sans,lato,montserrat,poppins,source sans pro,source sans 3,raleway,'
  + 'nunito,nunito sans,ubuntu,rubik,work sans,fira sans,quicksand,karla,mulish,manrope,'
  + 'barlow,barlow condensed,dm sans,plus jakarta sans,figtree,outfit,sora,epilogue,urbanist,'
  + 'public sans,red hat display,red hat text,archivo,archivo narrow,asap,cabin,catamaran,'
  + 'exo,exo 2,heebo,hind,jost,lexend,libre franklin,maven pro,mukta,oxygen,pt sans,'
  + 'questrial,signika,titillium web,varela round,overpass,assistant,commissioner,'
  + 'noto sans jp,roboto condensed,roboto flex,roboto slab,roboto mono,oswald,anton,'
  + 'bebas neue,teko,fjalla one,archivo black,alfa slab one,righteous,staatliches,'
  + 'playfair display,merriweather,lora,pt serif,noto serif,crimson text,crimson pro,'
  + 'libre baskerville,cormorant,cormorant garamond,eb garamond,spectral,bitter,'
  + 'source serif pro,source serif 4,zilla slab,arvo,domine,frank ruhl libre,'
  + 'literata,newsreader,fraunces,petrona,vollkorn,cardo,neuton,old standard tt,'
  + 'abril fatface,dancing script,pacifico,lobster,caveat,satisfy,great vibes,'
  + 'permanent marker,shadows into light,indie flower,amatic sc,courgette,sacramento,'
  + 'fira code,jetbrains mono,ibm plex sans,ibm plex serif,ibm plex mono,space grotesk,'
  + 'space mono,syne,chivo,cormorant infant,league spartan,readex pro,onest,'
  + 'source code pro,inconsolata,cousine,anonymous pro,dm serif display,dm serif text,'
  + 'josefin sans,comfortaa,kanit,prompt,sarabun,mitr,bai jamjuree,'
  + 'darker grotesque,unbounded,gabarito,instrument sans,instrument serif,bricolage grotesque')
    .split(',')
);

/** Known non-Google faces mapped to their closest Google Fonts equivalent. */
const SUBSTITUTIONS: Record<string, { to: string; why: string }> = {
  'gilroy':          { to: 'Poppins',        why: 'sans geométrica equivalente' },
  'circular':        { to: 'Inter',          why: 'sans geométrica equivalente' },
  'circular std':    { to: 'Inter',          why: 'sans geométrica equivalente' },
  'brandon grotesque': { to: 'Montserrat',   why: 'sans geométrica equivalente' },
  'brandon text':    { to: 'Montserrat',     why: 'sans geométrica equivalente' },
  'proxima nova':    { to: 'Montserrat',     why: 'sans humanista equivalente' },
  'avenir':          { to: 'Nunito Sans',    why: 'sans geométrica equivalente' },
  'avenir next':     { to: 'Nunito Sans',    why: 'sans geométrica equivalente' },
  'futura':          { to: 'Jost',           why: 'sans geométrica equivalente' },
  'futura pt':       { to: 'Jost',           why: 'sans geométrica equivalente' },
  'helvetica neue':  { to: 'Inter',          why: 'grotesca neutra equivalente' },
  'neue haas grotesk': { to: 'Inter',        why: 'grotesca neutra equivalente' },
  'akzidenz grotesk':{ to: 'Archivo',        why: 'grotesca equivalente' },
  'graphik':         { to: 'Public Sans',    why: 'grotesca neutra equivalente' },
  'gt walsheim':     { to: 'Poppins',        why: 'sans geométrica equivalente' },
  'sofia pro':       { to: 'Poppins',        why: 'sans geométrica equivalente' },
  'cera pro':        { to: 'Poppins',        why: 'sans geométrica equivalente' },
  'maison neue':     { to: 'Inter',          why: 'grotesca neutra equivalente' },
  'apercu':          { to: 'Work Sans',      why: 'grotesca equivalente' },
  'aktiv grotesk':   { to: 'Archivo',        why: 'grotesca equivalente' },
  'tt norms':        { to: 'Manrope',        why: 'sans geométrica equivalente' },
  'gotham':          { to: 'Montserrat',     why: 'sans geométrica equivalente' },
  'museo sans':      { to: 'Rubik',          why: 'sans redondeada equivalente' },
  'calibri':         { to: 'Carlito',        why: 'métricamente compatible' },
  'segoe ui':        { to: 'Open Sans',      why: 'sans humanista equivalente' },
  'myriad pro':      { to: 'Source Sans 3',  why: 'sans humanista equivalente' },
  'frutiger':        { to: 'Open Sans',      why: 'sans humanista equivalente' },
  'din':             { to: 'Barlow',         why: 'grotesca condensada equivalente' },
  'din next':        { to: 'Barlow',         why: 'grotesca condensada equivalente' },
  'trade gothic':    { to: 'Oswald',         why: 'condensada equivalente' },
  'garamond':        { to: 'EB Garamond',    why: 'serif de estilo antiguo equivalente' },
  'adobe garamond':  { to: 'EB Garamond',    why: 'serif de estilo antiguo equivalente' },
  'caslon':          { to: 'Libre Caslon Text', why: 'serif equivalente' },
  'baskerville':     { to: 'Libre Baskerville', why: 'serif equivalente' },
  'minion pro':      { to: 'Crimson Pro',    why: 'serif equivalente' },
  'freight text':    { to: 'Lora',           why: 'serif equivalente' },
  'tiempos':         { to: 'Spectral',       why: 'serif equivalente' },
  'canela':          { to: 'Cormorant Garamond', why: 'serif display equivalente' },
  'gt sectra':       { to: 'Fraunces',       why: 'serif display equivalente' },
  'sabon':           { to: 'EB Garamond',    why: 'serif de estilo antiguo equivalente' },
};

/** Generic system stacks — not a font to substitute, the builder handles these natively. */
const SYSTEM_FONTS = new Set([
  'arial', 'helvetica', 'verdana', 'tahoma', 'trebuchet ms', 'georgia', 'garamond',
  'times', 'times new roman', 'courier', 'courier new', 'system-ui', '-apple-system',
  'blinkmacsystemfont', 'sf ns', 'sans-serif', 'serif', 'monospace', 'cursive',
  'fantasy', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'inherit', 'initial', 'unset',
]);

/** Neutral defaults used only when NOTHING was detected. Explicitly not a "match". */
export const NEUTRAL_DEFAULTS = { heading: 'Inter', body: 'Inter' };

export type FontStatus = 'google' | 'substituted' | 'unknown' | 'system';

export interface FontFinding {
  /** Exactly as named in design.md. */
  original: string;
  status: FontStatus;
  /** Google Fonts family to use instead. Undefined when status is 'google' or 'system'. */
  substitute?: string;
  /** Short reason, shown to the user and written into the prompt. */
  why?: string;
}

export interface FontAnalysis {
  findings: FontFinding[];
  /** True when design.md named no usable font at all. */
  noneDetected: boolean;
}

function clean(name: string): string {
  return name
    .replace(/^[\s"']+|[\s"',]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pull font family names out of design.md.
 *
 * Three sources, most reliable first: Google Fonts CDN URLs, font-family declarations,
 * and labelled lines. Deliberately conservative — a missed font degrades to the current
 * behaviour, whereas a false positive puts a wrong substitution in front of the user.
 */
export function extractFamiliesFromDesignMd(designMd: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const name = clean(raw);
    if (!name) return;
    const key = name.toLowerCase();
    if (key === 'not found' || key.startsWith('not found')) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(name);
  };

  // 1. Google Fonts CDN URLs: family=Playfair+Display:wght@400;700
  const cdnRe = /family=([^:&"')\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = cdnRe.exec(designMd)) !== null) {
    add(decodeURIComponent(m[1]).replace(/\+/g, ' '));
  }

  // 2. font-family declarations — take the FIRST family in each stack.
  const declRe = /font-family\s*:\s*([^;\n}]+)/gi;
  while ((m = declRe.exec(designMd)) !== null) {
    const first = m[1].split(',')[0];
    add(first);
  }

  // 3. Labelled lines, ES and EN, e.g. "Heading font: Playfair Display".
  const labelRe = /(?:heading|body|title|display|primary|secondary)\s*font\s*[:|]\s*([^\n|,(]+)/gi;
  while ((m = labelRe.exec(designMd)) !== null) add(m[1]);
  const labelEsRe = /fuente\s+(?:de\s+)?(?:t[ií]tulos?|texto|cuerpo|principal|secundaria)\s*[:|]\s*([^\n|,(]+)/gi;
  while ((m = labelEsRe.exec(designMd)) !== null) add(m[1]);

  return out;
}

/** Classify each detected family. */
export function analyzeFonts(designMd: string): FontAnalysis {
  const families = extractFamiliesFromDesignMd(designMd);
  const findings: FontFinding[] = [];

  for (const original of families) {
    const key = original.toLowerCase();
    if (SYSTEM_FONTS.has(key)) {
      findings.push({ original, status: 'system' });
      continue;
    }
    if (GOOGLE_FONTS.has(key)) {
      findings.push({ original, status: 'google' });
      continue;
    }
    const sub = SUBSTITUTIONS[key];
    if (sub) {
      findings.push({ original, status: 'substituted', substitute: sub.to, why: sub.why });
      continue;
    }
    findings.push({ original, status: 'unknown' });
  }

  const usable = findings.filter(f => f.status !== 'system');
  return { findings, noneDetected: usable.length === 0 };
}

/** True when the user needs to be told something about the fonts. */
export function needsFontAttention(a: FontAnalysis): boolean {
  return a.noneDetected || a.findings.some(f => f.status === 'substituted' || f.status === 'unknown');
}

/**
 * Build the FONTS block for the builder prompt.
 *
 * `overrides` maps an original family name to a user-chosen Google Fonts replacement
 * and always wins over the automatic suggestion.
 */
export function buildFontDirective(a: FontAnalysis, overrides: Record<string, string> = {}): string {
  if (a.noneDetected) {
    return [
      '## FONTS',
      `No se detectó ninguna tipografía en design.md. Usa ${NEUTRAL_DEFAULTS.heading} para títulos y ${NEUTRAL_DEFAULTS.body} para texto.`,
      'IMPORTANTE: esto es un valor por defecto, NO una coincidencia con el sitio original. La tipografía real no pudo determinarse.',
    ].join('\n');
  }

  const lines: string[] = ['## FONTS'];
  const load: string[] = [];

  for (const f of a.findings) {
    if (f.status === 'system') continue;
    const override = overrides[f.original];

    if (override) {
      lines.push(`- ${f.original} → usar ${override} (sustitución elegida manualmente). No intentes cargar ${f.original}.`);
      load.push(override);
    } else if (f.status === 'google') {
      lines.push(`- ${f.original} — disponible en Google Fonts, cárgala tal cual.`);
      load.push(f.original);
    } else if (f.status === 'substituted' && f.substitute) {
      lines.push(`- ${f.original} no está disponible en Google Fonts → usar ${f.substitute} (${f.why}). No intentes cargar ${f.original}.`);
      load.push(f.substitute);
    } else {
      lines.push(`- ${f.original} no se encontró en Google Fonts y no tiene equivalente conocido → usar ${NEUTRAL_DEFAULTS.body}. No intentes cargar ${f.original}.`);
      load.push(NEUTRAL_DEFAULTS.body);
    }
  }

  const unique = [...new Set(load)];
  if (unique.length > 0) {
    lines.push('');
    lines.push(`Cargar desde Google Fonts: ${unique.join(', ')}`);
  }
  lines.push('NUNCA uses una @font-face que apunte al servidor del sitio original.');
  return lines.join('\n');
}

/** One-line summary for config.md. */
export function summarizeFonts(a: FontAnalysis, overrides: Record<string, string> = {}): string[] {
  if (a.noneDetected) {
    return [`- Tipografía: **no detectada** — se usó ${NEUTRAL_DEFAULTS.heading} por defecto, no es una coincidencia`];
  }
  return a.findings
    .filter(f => f.status !== 'system')
    .map(f => {
      const override = overrides[f.original];
      if (override) return `- Tipografía: ${f.original} → **${override}** (elegida manualmente)`;
      if (f.status === 'google') return `- Tipografía: ${f.original} (Google Fonts)`;
      if (f.status === 'substituted') return `- Tipografía: ${f.original} → **${f.substitute}** — sustituida, ${f.why}`;
      return `- Tipografía: ${f.original} → **${NEUTRAL_DEFAULTS.body}** — sin equivalente conocido, verificar`;
    });
}
