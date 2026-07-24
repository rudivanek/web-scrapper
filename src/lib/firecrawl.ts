const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface FirecrawlProxyRequest {
  endpoint: string;
  body?: any;
  method?: string;
}

export async function callFirecrawl(request: FirecrawlProxyRequest) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Firecrawl API error:', error);
    throw new Error(error.error || 'Firecrawl request failed');
  }

  return await response.json();
}

export async function scrapeUrl(url: string) {
  return await callFirecrawl({
    endpoint: '/v1/scrape',
    method: 'POST',
    body: {
      url,
      formats: ['markdown', 'html', 'rawHtml', 'links'],
    },
  });
}

export async function scrapeBranding(url: string) {
  return await callFirecrawl({
    endpoint: '/v1/scrape',
    method: 'POST',
    body: {
      url,
      formats: ['branding', 'screenshot'],
    },
  });
}

export interface FontFileInfo {
  family: string;
  url: string;
  format: string;
}

/**
 * Extracts @font-face file URLs from a page via the server-side Edge Function
 * (avoids browser CORS restrictions on cross-origin stylesheets).
 */
export async function extractFontFileUrls(pageUrl: string): Promise<FontFileInfo[]> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-font-urls`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url: pageUrl }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.fonts) ? data.fonts : [];
  } catch {
    return [];
  }
}

export async function scrapeFullPage(url: string) {
  return await callFirecrawl({
    endpoint: '/v1/scrape',
    method: 'POST',
    body: {
      url,
      formats: ['markdown', 'html', 'rawHtml'],
    },
  });
}

export async function mapSite(domain: string, limit: number = 50) {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;

  const mapResult = await callFirecrawl({
    endpoint: '/v1/map',
    method: 'POST',
    body: {
      url,
      limit,
      includeSubdomains: false,
    },
  });

  let discoveredUrls = mapResult.links || [];

  try {
    const sitemapUrl = `${url}/sitemap.xml`;
    const sitemapContent = await fetchTextFile(sitemapUrl);

    if (sitemapContent) {
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        const sitemapUrls = urlMatches.map(match =>
          match.replace(/<loc>|<\/loc>/g, '').trim()
        );

        const uniqueUrls = new Set([...discoveredUrls, ...sitemapUrls]);
        discoveredUrls = Array.from(uniqueUrls);

        console.log(`Firecrawl found ${mapResult.links?.length || 0} URLs, sitemap added ${sitemapUrls.length} URLs, total unique: ${discoveredUrls.length}`);
      }
    }
  } catch (err) {
    console.log('Could not fetch sitemap, using Firecrawl results only:', err);
  }

  return {
    ...mapResult,
    links: discoveredUrls,
  };
}

export async function crawlSite(domain: string, limit: number = 10) {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;

  return await callFirecrawl({
    endpoint: '/v1/crawl',
    method: 'POST',
    body: {
      url,
      limit,
      scrapeOptions: {
        formats: ['html', 'links', 'metadata'],
      },
    },
  });
}

// ─── Interact API ─────────────────────────────────────────────────────────────

export interface InteractResponse {
  scrapeId?: string;
  screenshot?: string;
  interactiveLiveViewUrl?: string;
  output?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  success?: boolean;
  data?: {
    screenshot?: string;
    scrapeId?: string;
    interactiveLiveViewUrl?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// scrapeId lives at data.metadata.scrapeId in the v2 response
export async function scrapeForInteract(url: string): Promise<InteractResponse> {
  return await callFirecrawl({
    endpoint: '/v2/scrape',
    method: 'POST',
    body: {
      url,
      formats: ['markdown', 'screenshot'],
    },
  });
}

export async function interactWithPrompt(scrapeId: string, prompt: string): Promise<InteractResponse> {
  return await callFirecrawl({
    endpoint: `/v2/scrape/${scrapeId}/interact`,
    method: 'POST',
    body: { prompt },
  });
}

export async function interactWithCode(scrapeId: string, code: string, language: 'node' | 'python' | 'bash' = 'node'): Promise<InteractResponse> {
  return await callFirecrawl({
    endpoint: `/v2/scrape/${scrapeId}/interact`,
    method: 'POST',
    body: { code, language },
  });
}

export async function endInteractSession(scrapeId: string): Promise<void> {
  await callFirecrawl({
    endpoint: `/v2/scrape/${scrapeId}/interact`,
    method: 'DELETE',
  });
}

export interface CssCustomProperty {
  name: string;
  value: string;
  selector: string;
}

export interface CssColorValue {
  value: string;
  property: string;
  selector: string;
  count: number;
}

export interface CssFontDeclaration {
  property: string;
  value: string;
  selector: string;
}

export interface CssKeyframe {
  name: string;
  raw: string;
}

export interface CssMediaQuery {
  query: string;
  raw: string;
}

export interface CssSheet {
  url: string;
  size: number;
  isInline: boolean;
}

export interface FrequencyEntry {
  value: string;
  count: number;
  sampleSelectors: string[];
}

export interface FrequencyAnalysis {
  fontSizes: FrequencyEntry[];
  fontFamilies: FrequencyEntry[];
  spacings: FrequencyEntry[];
  radii: FrequencyEntry[];
  shadows: FrequencyEntry[];
  fontWeights: FrequencyEntry[];
}

export interface TailwindUtilityGroup {
  category: string;
  classes: { className: string; count: number }[];
}

export interface TailwindUtilities {
  groups: TailwindUtilityGroup[];
}

export interface PlatformDetection {
  cms: string | null;
  builder: string | null;
  framework: string | null;
  cssApproach: string;
  confidence: string;
  signals: string[];
  warnings: string[];
}

export interface CssExtractResult {
  customProperties: CssCustomProperty[];
  colors: CssColorValue[];
  fonts: CssFontDeclaration[];
  keyframes: CssKeyframe[];
  mediaQueries: CssMediaQuery[];
  sheets: CssSheet[];
  rawCss: Record<string, string>;
  platform: PlatformDetection;
  frequency: FrequencyAnalysis;
  tailwind: TailwindUtilities | null;
}

export interface CssDiagnostics {
  htmlSource: 'provided' | 'fetched';
  linkedSheetsFound: number;
  sheetsFetchedOk: number;
  sheetsFailed: Array<{ url: string; reason: string }>;
  totalCssBytes: number;
  customPropertyCount: number;
  cssLooksInsufficient: boolean;
  insufficientReasons: string[];
}

export interface CssExtractResultWithDiagnostics extends CssExtractResult {
  diagnostics: CssDiagnostics;
}

export async function extractCssData(pageUrl: string, html?: string): Promise<CssExtractResultWithDiagnostics | null> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-css`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url: pageUrl, ...(html ? { html } : {}) }),
      }
    );
    if (!res.ok) return null;
    return await res.json() as CssExtractResultWithDiagnostics;
  } catch {
    return null;
  }
}

export async function fetchTextFile(url: string): Promise<string | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/firecrawl-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        endpoint: '/fetch-text',
        method: 'GET',
        url,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.content || null;
  } catch (err) {
    console.error('Failed to fetch text file:', err);
    return null;
  }
}
