// Persistence for the section editor.
//
// Sections live in React state, so a page reload loses them. This keeps the last
// edited blueprint in localStorage, scoped to the site it came from, so returning
// to the app does not throw away hand-built structure.
//
// Deliberately NOT a database: this is scratch state, not a record. It holds one
// entry, it is per-browser, and clearing site data clears it.

const STORAGE_KEY = 'designExtract:sectionEditor:v1';

export interface StoredSections {
  /** Serialized blueprint JSON, exactly as the editor produced it. */
  json: string;
  /** Which site this came from, or '' when composed by hand with no crawl. */
  sourceUrl: string;
  /** Epoch ms. */
  savedAt: number;
  /** Cached count so the restore prompt can be written without parsing. */
  sectionCount: number;
}

/** localStorage throws in private mode and when the quota is exceeded. Never let that break the app. */
function safeGet(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSections(json: string, sourceUrl: string, sectionCount: number): void {
  try {
    if (!json || sectionCount === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: StoredSections = { json, sourceUrl, savedAt: Date.now(), sectionCount };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode — persistence is a convenience, not a requirement.
  }
}

export function loadSections(): StoredSections | null {
  const raw = safeGet();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSections>;
    if (typeof parsed?.json !== 'string' || !parsed.json.trim()) return null;
    return {
      json: parsed.json,
      sourceUrl: typeof parsed.sourceUrl === 'string' ? parsed.sourceUrl : '',
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      sectionCount: typeof parsed.sectionCount === 'number' ? parsed.sectionCount : 0,
    };
  } catch {
    return null;
  }
}

export function clearSections(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

/** "hace 5 minutos" / "hace 2 horas" / "hace 3 días" */
export function describeAge(savedAt: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  if (seconds < 60) return 'hace unos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}
