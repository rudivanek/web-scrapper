import { useState } from 'react';
import { Loader2, Palette, FileDown, AlertCircle, AlertTriangle, Check, Copy, ChevronDown, ChevronUp, Layers, Eye, Clipboard, FileText, Volume2, VolumeX } from 'lucide-react';
import { callFirecrawl, extractCssData, type CssExtractResultWithDiagnostics, type PlatformDetection } from '../lib/firecrawl';
import { callClaude, callWithContinuation } from '../lib/callClaude';
import { prepareScreenshot } from '../lib/imagePrep';
import { preprocessHtml } from '../lib/htmlPreprocess';
import {
  DESIGN_SYSTEM_PROMPT,
  BLUEPRINT_SYSTEM_PROMPT,
  buildDesignUserPrompt,
  buildBlueprintUserPrompt,
} from '../lib/prompts/designExtractionPrompts';
import { BUILD_SPEC_FIXED_HEADER, BUILD_SPEC_FOUNDATION_PROMPT, BUILD_SPEC_SECTIONS_PROMPT, BUILD_SPEC_COMPONENTS_PROMPT, buildFoundationUserPrompt, buildSectionsUserPrompt, buildComponentsUserPrompt } from '../lib/prompts/buildSpecPrompt';
import { extractAssetManifest, enrichManifestWithCss, formatAssetManifestForPrompt } from '../lib/assetExtractor';
import { buildVibePrompt, buildBlueprinterPrompt, VIBE_TARGETS, type VibeTarget } from '../lib/vibePrompt';

type BuilderFormat = 'html' | 'react';
import { buildCopyMarkdown, buildCopyMarkdownLorem } from '../lib/copyExporter';
import { buildImageMarkdown, type ImageSourceInput, type ImageSourceMode } from '../lib/imageExporter';
import { ApiKeyModal } from './ApiKeyModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

type BuildTarget = 'react-tailwind' | 'wordpress-elementor';

interface ExtractionState {
  phase: 'idle' | 'scrape-design' | 'scrape-structure' | 'fetch-css' | 'llm-design' | 'llm-blueprint' | 'llm-buildspec' | 'done' | 'error';
  message: string;
  progress: number; // 0–100
}

interface ExtractionResult {
  designMd: string;
  blueprintJson: string;
  buildMd: string | null;
  buildMdIncomplete: boolean;
  buildMdHighAssumption: boolean;
  assumptionRatio: number;
  assumptionCount: number;
  valueCount: number;
  screenshot: string | null;
  screenshotAvailable: boolean;
  externalSheets: number;
  cssDegraded: boolean;
  cssLooksInsufficient: boolean;
  insufficientReasons: string[];
  platform: PlatformDetection | null;
  buildTarget: BuildTarget;
  provenance: string | null;
  platformMismatch: boolean;
  platformMismatchNote: string | null;
  outputMode: 'full' | 'single' | 'blueprinter';
  copyMd: string | null;
  copyProvenance: string | null;
  imagesMd: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hostname(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function normalizeUrl(s: string): string {
  const t = s.trim();
  return t.startsWith('http') ? t : `https://${t}`;
}

function isValidUrl(s: string): boolean {
  if (!s.trim()) return true;
  try {
    const u = new URL(normalizeUrl(s));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function playDoneSound(type: 'success' | 'error' = 'success') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const freqs = type === 'success' ? [880, 1174.7] : [587.3, 392];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.start(t); osc.stop(t + 0.35);
    });
  } catch (e) { /* audio not available — ignore silently */ }
}

const MAX_COMBINED_CSS = 120000;

function buildCombinedCss(
  cssData: CssExtractResultWithDiagnostics | null,
  cssBlocks: string[],
  inlineStyles: string[]
): string {
  const seen = new Set<string>();
  const dedupe = (lines: string[]): string[] =>
    lines.filter(l => { if (seen.has(l)) return false; seen.add(l); return true; });

  const groups: Array<{ header: string; lines: string[]; canTruncate: boolean }> = [];

  if (cssData) {
    const elementorProps = dedupe(
      cssData.customProperties
        .filter(p => /\.elementor-kit-\d+/.test(p.selector))
        .map(p => `${p.selector} { ${p.name}: ${p.value}; }`)
    );
    const rootProps = dedupe(
      cssData.customProperties
        .filter(p => (p.selector === ':root' || p.selector === 'html') && !/\.elementor-kit-\d+/.test(p.selector))
        .map(p => `${p.selector} { ${p.name}: ${p.value}; }`)
    );
    const otherProps = dedupe(
      cssData.customProperties
        .filter(p => p.selector !== ':root' && p.selector !== 'html' && !/\.elementor-kit-\d+/.test(p.selector))
        .map(p => `${p.selector} { ${p.name}: ${p.value}; }`)
    );

    if (elementorProps.length > 0) {
      groups.push({ header: 'Elementor kit custom properties (PRIMARY design system)', lines: elementorProps, canTruncate: false });
    }
    if (rootProps.length > 0) {
      groups.push({ header: ':root custom properties', lines: rootProps, canTruncate: false });
    }
    if (otherProps.length > 0) {
      groups.push({ header: 'Other stylesheet custom properties', lines: otherProps, canTruncate: false });
    }

    groups.push({
      header: 'External stylesheet font declarations',
      lines: dedupe(cssData.fonts.map(f => `${f.selector} { ${f.property}: ${f.value}; }`)),
      canTruncate: true,
    });
    groups.push({
      header: 'External stylesheet color values',
      lines: dedupe(cssData.colors.map(c => `${c.selector} { ${c.property}: ${c.value}; }`)),
      canTruncate: true,
    });
    groups.push({
      header: 'External stylesheet media queries',
      lines: dedupe(cssData.mediaQueries.map(m => m.raw)),
      canTruncate: true,
    });
  }

  groups.push({ header: 'Inline <style> blocks', lines: dedupe(cssBlocks), canTruncate: true });
  groups.push({ header: 'Inline style= attributes', lines: dedupe(inlineStyles), canTruncate: true });

  const parts: string[] = [];
  let length = 0;
  let truncated = false;

  for (const group of groups) {
    if (group.lines.length === 0) continue;
    const header = `/* ─── ${group.header} ─── */`;
    const groupText = [header, ...group.lines].join('\n');
    const overhead = 2;

    if (!group.canTruncate) {
      parts.push(groupText);
      length += groupText.length + overhead;
      continue;
    }

    if (length + groupText.length + overhead <= MAX_COMBINED_CSS) {
      parts.push(groupText);
      length += groupText.length + overhead;
    } else {
      const remaining = MAX_COMBINED_CSS - length - overhead;
      if (remaining > 100) {
        parts.push(groupText.slice(0, remaining) + '\n/* ... truncated ... */');
      }
      truncated = true;
      break;
    }
  }

  if (truncated) {
    parts.push('/* ─── Additional CSS groups truncated to fit 120k character limit ─── */');
  }

  return parts.join('\n\n');
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PhaseStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center space-x-2 text-sm ${done ? 'text-green-600' : active ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 border ${
        done ? 'bg-green-500 border-green-500 text-white' :
        active ? 'border-gray-900 bg-white' :
        'border-gray-300 bg-white'
      }`}>
        {done ? <Check className="w-3 h-3" /> : active ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
      </div>
      <span>{label}</span>
    </div>
  );
}

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function OutputPanel({
  title, icon, content, filename, downloadMime,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
  filename: string;
  downloadMime: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="text-gray-500">{icon}</span>
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
          <span className="text-xs text-gray-400">{(content.length / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={content} />
          <button
            onClick={() => downloadFile(content, filename, downloadMime)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            onClick={() => setExpanded(o => !o)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="p-5 text-xs font-mono bg-gray-900 text-green-400 overflow-auto max-h-[600px] leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </pre>
      )}
    </div>
  );
}

// ─── Vibe Prompt Panel ────────────────────────────────────────────────────────

function VibePromptPanel({
  buildMd, blueprintJson, provenance, buildTarget, vibeTarget, onTargetChange,
  outputMode, copyMd, imagesMd, designMd, copyMode, siteName, builderFormat, onFormatChange,
}: {
  buildMd: string | null;
  blueprintJson: string;
  provenance: string | null;
  buildTarget: BuildTarget;
  vibeTarget: VibeTarget;
  onTargetChange: (t: VibeTarget) => void;
  outputMode: 'full' | 'single' | 'blueprinter';
  copyMd: string | null;
  imagesMd: string | null;
  designMd: string;
  copyMode: 'scrape' | 'lorem';
  siteName: string;
  builderFormat: BuilderFormat;
  onFormatChange: (f: BuilderFormat) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const outputTarget: BuildOutputTarget = builderFormat === 'react' ? 'react-tailwind' : 'plain-html';

  const prompt = outputMode === 'blueprinter' && copyMd && designMd
    ? buildBlueprinterPrompt(vibeTarget, designMd, copyMd, imagesMd ?? undefined, copyMode === 'lorem', builderFormat)
    : buildVibePrompt(
        vibeTarget,
        { buildMd: buildMd ?? '', blueprintJson, provenance },
        outputTarget,
      );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="text-gray-600"><Clipboard className="w-4 h-4" /></span>
          <span className="font-semibold text-gray-800 text-sm">Prompt para builder</span>
          <span className="text-xs text-gray-400">{(prompt.length / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar prompt'}</span>
          </button>
          <button
            onClick={() => {
              const blob = new Blob([prompt], { type: 'text/markdown' });
              const dlUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = dlUrl;
              a.download = `${siteName}-prompt-${vibeTarget}.md`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(dlUrl);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Descargar .md</span>
          </button>
          <button
            onClick={() => setExpanded(o => !o)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Plataforma destino</label>
          <div className="flex flex-wrap gap-2">
            {VIBE_TARGETS.map(t => (
              <button
                key={t.id}
                onClick={() => onTargetChange(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  vibeTarget === t.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Formato de salida del builder</label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onFormatChange('html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                builderFormat === 'html'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`w-3 h-3 rounded-full border ${builderFormat === 'html' ? 'border-white bg-white' : 'border-gray-400'}`} />
              {'HTML único (un solo archivo)'}
            </button>
            <button
              onClick={() => onFormatChange('react')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                builderFormat === 'react'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`w-3 h-3 rounded-full border ${builderFormat === 'react' ? 'border-white bg-white' : 'border-gray-400'}`} />
              {'React + Tailwind'}
            </button>
          </div>
        </div>
        {outputMode === 'blueprinter' && (
          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
            <strong>Importante:</strong> Debes adjuntar tu propia captura de pantalla de inspiración al builder. En modo Blueprinter, la app no suministra captura — la captura provee el layout y la composición visual que design.md y copy.md no pueden transmitir.
          </div>
        )}
        {expanded && (
          <pre className="text-xs font-mono bg-gray-900 text-green-400 overflow-auto max-h-[500px] leading-relaxed whitespace-pre-wrap break-words p-4 rounded">
            {prompt}
          </pre>
        )}
        {!expanded && (
          <p className="text-xs text-gray-500">
            Prompt listo para pegar en {VIBE_TARGETS.find(t => t.id === vibeTarget)?.label}. Copia y pega en tu builder.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function DesignExtractor({ anthropicKey }: { anthropicKey?: string }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ExtractionState>({ phase: 'idle', message: '', progress: 0 });
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [localApiKey, setLocalApiKey] = useState<string | null>(null);
  const [buildTarget, setBuildTarget] = useState<BuildTarget>('react-tailwind');
  const [structureUrl, setStructureUrl] = useState('');
  const [copySource, setCopySource] = useState<'structure' | 'placeholder'>('structure');
  const [structureUrlError, setStructureUrlError] = useState<string | null>(null);
  const [outputMode, setOutputMode] = useState<'full' | 'single' | 'blueprinter'>('blueprinter');
  const [vibeTarget, setVibeTarget] = useState<VibeTarget>('lovable');
  const [builderFormat, setBuilderFormat] = useState<BuilderFormat>('html');
  const [fillUnsplash, setFillUnsplash] = useState(false);
  const [imageSource, setImageSource] = useState<ImageSourceMode>('design');
  const [copyMode, setCopyMode] = useState<'scrape' | 'lorem'>('scrape');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const resolvedKey = localApiKey || anthropicKey || null;
  const isDualUrl = structureUrl.trim().length > 0 && normalizeUrl(url) !== normalizeUrl(structureUrl);

  const setPhase = (phase: ExtractionState['phase'], message: string, progress: number) => {
    setState({ phase, message, progress });
  };

  const runExtraction = async (apiKey: string) => {
    const designUrl = normalizeUrl(url);
    const structUrl = structureUrl.trim() ? normalizeUrl(structureUrl) : designUrl;
    const dual = designUrl !== structUrl;
    const copySrc = dual ? copySource : 'structure';

    setError(null);
    setResult(null);

    try {
      let designRawHtml = '';
      let designScreenshot: string | null = null;
      let structureRawHtml = '';
      let structureScreenshot: string | null = null;

      if (dual) {
        setPhase('scrape-design', `Scraping design source (${hostname(designUrl)})...`, 5);
        const designScrape = await callFirecrawl({
          endpoint: '/v1/scrape',
          method: 'POST',
          body: { url: designUrl, formats: ['rawHtml', 'screenshot@fullPage'], onlyMainContent: false },
        });
        designRawHtml = designScrape?.data?.rawHtml ?? designScrape?.rawHtml ?? '';
        designScreenshot = designScrape?.data?.screenshot ?? designScrape?.screenshot ?? null;

        setPhase('scrape-structure', `Scraping structure source (${hostname(structUrl)})...`, 15);
        const structureScrape = await callFirecrawl({
          endpoint: '/v1/scrape',
          method: 'POST',
          body: { url: structUrl, formats: ['rawHtml', 'screenshot@fullPage'], onlyMainContent: false },
        });
        structureRawHtml = structureScrape?.data?.rawHtml ?? structureScrape?.rawHtml ?? '';
        structureScreenshot = structureScrape?.data?.screenshot ?? structureScrape?.screenshot ?? null;
      } else {
        setPhase('scrape-structure', 'Running structure scrape (rawHtml + screenshot)...', 10);
        const structureScrape = await callFirecrawl({
          endpoint: '/v1/scrape',
          method: 'POST',
          body: { url: designUrl, formats: ['rawHtml', 'screenshot@fullPage'], onlyMainContent: false },
        });
        designRawHtml = structureRawHtml = structureScrape?.data?.rawHtml ?? structureScrape?.rawHtml ?? '';
        designScreenshot = structureScreenshot = structureScrape?.data?.screenshot ?? structureScrape?.screenshot ?? null;
      }

      const screenshot = structureScreenshot;

      // Phase 2: Pre-process HTML
      // Blueprint uses structure source (B); CSS blocks/inline styles use design source (A)
      const { cleanedHtml } = preprocessHtml(structureRawHtml);
      const { cssBlocks, inlineStyles } = preprocessHtml(designRawHtml);

      // Phase 2b: Extract asset manifest from structure HTML (B) — images belong to the page being rebuilt
      const assetManifest = extractAssetManifest(structureRawHtml, structUrl);

      // Phase 3: Fetch external stylesheets from design source (A)
      setPhase('fetch-css', 'Descargando hojas de estilo externas...', 25);
      let cssData: CssExtractResultWithDiagnostics | null = null;
      try {
        cssData = await extractCssData(designUrl, designRawHtml || undefined);
      } catch (e) {
        console.warn('extractCssData failed, continuing with inline CSS only:', e);
      }
      if (cssData?.diagnostics) {
        console.log('[extract-css] diagnostics:', cssData.diagnostics);
      }
      if (cssData?.platform) {
        console.log('[extract-css] platform:', cssData.platform);
      }
      const externalSheets = cssData?.sheets?.length ?? 0;
      const cssLooksInsufficient = cssData?.diagnostics?.cssLooksInsufficient ?? false;
      const insufficientReasons = cssData?.diagnostics?.insufficientReasons ?? [];
      const cssDegraded = !cssData || cssData.diagnostics.sheetsFetchedOk === 0 || cssData.diagnostics.sheetsFailed.some(f => f.reason === 'html-response (likely WAF block)') || cssLooksInsufficient;
      const platform = cssData?.platform ?? null;
      const frequency = cssData?.frequency ?? null;
      const tailwind = cssData?.tailwind ?? null;
      const combinedCss = buildCombinedCss(cssData, cssBlocks, inlineStyles);

      // Platform detection for structure source (B) — for mismatch warning + asset enrichment
      let structurePlatform: PlatformDetection | null = null;
      let structureRawCss: Record<string, string> | null = null;
      if (dual) {
        try {
          const structCssData = await extractCssData(structUrl, structureRawHtml || undefined);
          structurePlatform = structCssData?.platform ?? null;
          structureRawCss = structCssData?.rawCss ?? null;
        } catch { /* best-effort platform detection */ }
      }

      // Enrich asset manifest with background images — always from B (structure source)
      let enrichedManifest = assetManifest;
      const rawCssForEnrichment: Record<string, string> | null = dual ? structureRawCss : (cssData?.rawCss ?? null);
      if (rawCssForEnrichment) {
        enrichedManifest = enrichManifestWithCss(assetManifest, rawCssForEnrichment, structUrl);
      }
      const assetManifestText = formatAssetManifestForPrompt(enrichedManifest);

      // Prepare screenshot segments — blueprint uses B's screenshot, design uses A's
      let screenshotSegments: string[] = [];
      if (structureScreenshot) {
        screenshotSegments = await prepareScreenshot(structureScreenshot);
      }
      let designScreenshotSegments = screenshotSegments;
      if (dual && designScreenshot && designScreenshot !== structureScreenshot) {
        designScreenshotSegments = await prepareScreenshot(designScreenshot);
      }

      // Blueprinter mode: skip blueprint JSON and BUILD.md entirely
      const isBlueprinter = outputMode === 'blueprinter';
      let blueprintJson = '';

      // Phase 4: LLM Call A — blueprint JSON FIRST (with screenshot segments + asset manifest as context)
      // Blueprint is generated before design.md so the design call can use the blueprint's page_title and sections.
      // Skipped in Blueprinter mode (no blueprint.json needed).
      if (!isBlueprinter) {
      setPhase('llm-blueprint', 'Generating page blueprint JSON with Claude...', 45);
      // FIX 2: trace — confirm the full design.md reaches the blueprint call (design.md is generated later,
      // but the blueprint call itself does NOT consume design.md; it consumes cleanedHtml + assetManifestText.
      // We trace the inputs that actually reach this call so we can verify nothing is a stub/placeholder.
      console.log(`[pipeline] design.md -> blueprint: design.md not yet generated at this stage (blueprint runs first)`);
      console.log(`[pipeline] blueprint inputs: cleanedHtml=${cleanedHtml.length} chars, assetManifest=${assetManifestText.length} chars, screenshots=${screenshotSegments.length}`);
      const blueprintUserPrompt = buildBlueprintUserPrompt(cleanedHtml, undefined, assetManifestText);
      const blueprintRaw = await callClaude(apiKey, BLUEPRINT_SYSTEM_PROMPT, blueprintUserPrompt, 8000, screenshotSegments.length > 0 ? screenshotSegments : undefined);

      // Attempt to parse and re-stringify for clean JSON
      blueprintJson = blueprintRaw.trim();
      try {
        const parsed = JSON.parse(blueprintJson);
        blueprintJson = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw if parse fails — LLM may have added fences
        blueprintJson = blueprintRaw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      }

      // Post-blueprint: replace copy with placeholders if requested
      if (dual && copySrc === 'placeholder') {
        try {
          const bpParsed = JSON.parse(blueprintJson);
          if (Array.isArray(bpParsed.sections)) {
            bpParsed.sections.forEach((s: { text_blocks?: Array<{ role: string; content: string }> }) => {
              if (Array.isArray(s.text_blocks)) {
                s.text_blocks.forEach((tb) => {
                  tb.content = `[Reescribir: ${tb.role}]`;
                });
              }
              (s as Record<string, unknown>).needs_rewrite = true;
            });
          }
          blueprintJson = JSON.stringify(bpParsed, null, 2);
          console.log('[pipeline] copySource=placeholder — text_blocks replaced with [Reescribir] markers');
        } catch { /* keep original blueprint */ }
      }

      } // end if (!isBlueprinter) — blueprint block

      // Phase 5: LLM Call B — design.md (from design source A, with B's blueprint as context)
      // In Blueprinter mode, design.md is generated without blueprint context.
      setPhase('llm-design', 'Generating design.md with Claude...', 70);
      const designUserPrompt = buildDesignUserPrompt(combinedCss, platform, frequency, tailwind, isBlueprinter ? undefined : blueprintJson, cssLooksInsufficient);
      let designMd = await callClaude(apiKey, DESIGN_SYSTEM_PROMPT, designUserPrompt, 8000, designScreenshotSegments.length > 0 ? designScreenshotSegments : undefined);
      console.log(`[pipeline] design.md generated: ${designMd.length} chars, starts "${designMd.slice(0, 60).replace(/\n/g, ' ')}"`);

      // Provenance injection
      let provenanceLine: string | null = null;
      if (dual && !isBlueprinter) {
        provenanceLine = copySrc === 'placeholder'
          ? `Estructura de ${structUrl}; texto pendiente de reescritura.`
          : `Sistema de diseño de ${designUrl}. Estructura y contenido de ${structUrl}.`;
      }
      if (isBlueprinter && dual) {
        provenanceLine = `Diseño: ${designUrl}. Texto: ${structUrl}.`;
      }

      if (provenanceLine) {
        designMd = `> ${provenanceLine}\n\n${designMd}`;
        if (!isBlueprinter) {
          try {
            const bpParsedProv = JSON.parse(blueprintJson);
            bpParsedProv._provenance = provenanceLine;
            blueprintJson = JSON.stringify(bpParsedProv, null, 2);
          } catch { /* keep original */ }
        }
      }

      // Platform mismatch detection
      let platformMismatch = false;
      let platformMismatchNote: string | null = null;
      if (dual && platform && structurePlatform) {
        const aKey = `${platform.cms ?? ''}|${platform.builder ?? ''}|${platform.framework ?? ''}`;
        const bKey = `${structurePlatform.cms ?? ''}|${structurePlatform.builder ?? ''}|${structurePlatform.framework ?? ''}`;
        if (aKey !== bKey) {
          platformMismatch = true;
          platformMismatchNote = 'Nota: los dos sitios usan tecnologías distintas; la reconstrucción es una aproximación de diseño.';
        }
      }

      // Blueprinter mode: generate copy.md from the structure source HTML (deterministic, no LLM)
      let copyMd: string | null = null;
      let copyProvenance: string | null = null;
      let imagesMd: string | null = null;
      if (isBlueprinter) {
        if (copyMode === 'lorem') {
          const loremHtml = dual ? structureRawHtml : designRawHtml;
          const loremUrl = dual ? structUrl : designUrl;
          copyMd = buildCopyMarkdownLorem(loremHtml, loremUrl);
          copyProvenance = `Texto de relleno (Lorem Ipsum) basado en la estructura de ${loremUrl}.`;
        } else {
          const copyHtml = dual ? structureRawHtml : designRawHtml;
          const copyUrl = dual ? structUrl : designUrl;
          copyMd = buildCopyMarkdown(copyHtml, copyUrl);
          if (dual) {
            copyProvenance = `Diseño: ${designUrl}. Texto: ${structUrl}.`;
          }
        }

        // images.md — deterministic DOM parsing, no LLM
        let imageInput: ImageSourceInput | null = null;
        if (imageSource === 'design') {
          imageInput = { rawHtml: designRawHtml, pageUrl: designUrl };
        } else if (imageSource === 'copy' && dual) {
          imageInput = { rawHtml: structureRawHtml, pageUrl: structUrl };
        } else if (imageSource === 'copy' && !dual) {
          imageInput = { rawHtml: designRawHtml, pageUrl: designUrl };
        }
        imagesMd = buildImageMarkdown(imageInput, imageSource, fillUnsplash);
      }

      // Phase 6: LLM Call C — BUILD.md (only for React/Tailwind target, skipped in Blueprinter mode)
      // Generated in three sequential calls to avoid truncation:
      //   Call 1: Foundation (sections 1–4), max_tokens 16000
      //   Call 2: Sections (section 5), max_tokens 16000 — batched if >8 sections
      //   Call 3: Components + Assumptions (sections 6–7), max_tokens 16000
      let buildMd: string | null = null;
      let buildMdIncomplete = false;
      let buildMdHighAssumption = false;
      let assumptionRatio = 0;
      let assumptionCount = 0;
      let valueCount = 0;
      if (buildTarget === 'react-tailwind' && !isBlueprinter) {
        setPhase('llm-buildspec', 'Generando especificación de reconstrucción (BUILD.md)...', 90);
        try {
          const imgs = screenshotSegments.length > 0 ? screenshotSegments : undefined;

          // Call 1: Foundation (sections 1–4)
          console.log(`[pipeline] design.md -> foundation: ${designMd.length} chars, starts "${designMd.slice(0, 60).replace(/\n/g, ' ')}"`);
          const foundationPrompt = buildFoundationUserPrompt(designMd, blueprintJson);
          const foundationRes = await callWithContinuation(apiKey, BUILD_SPEC_FOUNDATION_PROMPT, foundationPrompt, 16000, imgs, 'Foundation');
          let foundationText = foundationRes.text.trim();
          if (foundationRes.truncated) {
            console.warn('[BUILD.md] Foundation call truncated after continuations (stop_reason=max_tokens)');
            buildMdIncomplete = true;
          }

          // Call 2: Sections (section 5) — batch if >8 sections
          let sectionsText = '';
          let sectionBatchRanges: { start: number; end: number; total: number }[] = [];
          let totalSections = 0;
          try {
            const bpParsed = JSON.parse(blueprintJson);
            const bpSections: Array<{ section_index: number; section_name?: string }> = Array.isArray(bpParsed.sections) ? bpParsed.sections : [];
            totalSections = bpSections.length;
            // B3: Normalize any section_index of 0 to 1-based
            if (bpSections.some(s => s.section_index === 0)) {
              console.warn('[BUILD.md] Normalizing section_index values from 0-based to 1-based');
              bpSections.forEach((s, i) => { s.section_index = i + 1; });
              blueprintJson = JSON.stringify(bpParsed, null, 2);
            }
          } catch { /* keep 0 */ }

          if (totalSections > 8) {
            const batchSize = 6;
            for (let s = 0; s < totalSections; s += batchSize) {
              const startIdx = s + 1;
              const endIdx = Math.min(s + batchSize, totalSections);
              sectionBatchRanges.push({ start: startIdx, end: endIdx, total: totalSections });
            }
            for (const range of sectionBatchRanges) {
              console.log(`[pipeline] design.md -> sections batch ${range.start}–${range.end}: ${designMd.length} chars, starts "${designMd.slice(0, 60).replace(/\n/g, ' ')}"`);
              const batchPrompt = buildSectionsUserPrompt(designMd, blueprintJson, foundationText, range);
              const batchRes = await callWithContinuation(apiKey, BUILD_SPEC_SECTIONS_PROMPT, batchPrompt, 16000, imgs, `Sections batch ${range.start}–${range.end}`);
              sectionsText += (sectionsText ? '\n\n' : '') + batchRes.text.trim();
              if (batchRes.truncated) {
                console.warn(`[BUILD.md] Sections batch ${range.start}–${range.end} truncated after continuations (stop_reason=max_tokens)`);
                buildMdIncomplete = true;
              }
            }
          } else {
            console.log(`[pipeline] design.md -> sections: ${designMd.length} chars, starts "${designMd.slice(0, 60).replace(/\n/g, ' ')}"`);
            const sectionsPrompt = buildSectionsUserPrompt(designMd, blueprintJson, foundationText);
            const sectionsRes = await callWithContinuation(apiKey, BUILD_SPEC_SECTIONS_PROMPT, sectionsPrompt, 16000, imgs, 'Sections');
            sectionsText = sectionsRes.text.trim();
            if (sectionsRes.truncated) {
              console.warn('[BUILD.md] Sections call truncated after continuations (stop_reason=max_tokens)');
              buildMdIncomplete = true;
            }
          }

          // B2: Verify every section from blueprint.json appears in the generated output
          if (totalSections > 0) {
            try {
              const bpParsed2 = JSON.parse(blueprintJson);
              const bpSections: Array<{ section_index: number; section_name: string }> = Array.isArray(bpParsed2.sections) ? bpParsed2.sections : [];
              const expected = bpSections.map(s => ({ index: s.section_index, name: s.section_name ?? '' }));
              const found = expected.filter(e =>
                sectionsText.includes(`Section ${e.index}`) ||
                sectionsText.includes(`section ${e.index}`) ||
                sectionsText.includes(`Sección ${e.index}`) ||
                (e.name && sectionsText.includes(e.name))
              );
              const missing = expected.filter(e => !found.includes(e));
              if (missing.length > 0) {
                console.warn(`[BUILD.md] expected: [${expected.map(e => e.index).join(', ')}] found: [${found.map(e => e.index).join(', ')}] missing: [${missing.map(e => e.index).join(', ')}]`);
                sectionsText += `\n\n> INCOMPLETO: las secciones ${missing.map(e => e.index).join(', ')} no se generaron. Vuelve a ejecutar.`;
                buildMdIncomplete = true;
              }
            } catch { /* skip verification if blueprint unparseable */ }
          }

          // Call 3: Components + Assumptions (sections 6–7)
          const sections1to5 = foundationText + '\n\n' + sectionsText;
          console.log(`[pipeline] design.md -> components: ${designMd.length} chars, starts "${designMd.slice(0, 60).replace(/\n/g, ' ')}"`);
          const componentsPrompt = buildComponentsUserPrompt(designMd, sections1to5);
          const componentsRes = await callWithContinuation(apiKey, BUILD_SPEC_COMPONENTS_PROMPT, componentsPrompt, 16000, imgs, 'Components');
          let componentsText = componentsRes.text.trim();
          if (componentsRes.truncated) {
            console.warn('[BUILD.md] Components call truncated after continuations (stop_reason=max_tokens)');
            buildMdIncomplete = true;
          }

          // Part C: Assumption ratio guard
          const fullBuildText = `${foundationText}\n${sectionsText}\n${componentsText}`;
          // Count ASSUMED occurrences in the body text
          const assumedInText = (fullBuildText.match(/ASSUMED/g) ?? []).length;
          // Count rows in the Assumptions table (lines that look like | section | property | value | reason |)
          const assumedTableRows = (fullBuildText.match(/^\|\s*[^-|][^|]*\|[^|]+\|[^|]+\|[^|]+\|\s*$/gm) ?? []).length;
          assumptionCount = Math.max(assumedInText, assumedTableRows);
          // Count confirmed values: CSS property declarations not carrying ASSUMED
          const valueLines = fullBuildText.split('\n').filter(l =>
            /:\s*[^;]+;/.test(l) && !l.trim().startsWith('/*') && !l.trim().startsWith('|') && !l.includes('ASSUMED')
          );
          valueCount = valueLines.length;
          const total = assumptionCount + valueCount;
          assumptionRatio = total > 0 ? assumptionCount / total : 0;
          // Threshold: >= 40 absolute OR > 50%
          buildMdHighAssumption = assumptionCount >= 40 || assumptionRatio > 0.5;
          console.log(`[BUILD.md] assumptions: ${assumptionCount}, confirmed: ${valueCount}, ratio: ${Math.round(assumptionRatio * 100)}%`);

          // Part B2: Strip duplicate "Assumptions to Verify" blocks — keep only the LAST one.
          // FIX 1: The block may appear as a markdown heading OR as a bold line (e.g.
          //   **Assumptions to verify — consolidated index**
          // ). Match both formats and strip everything from the heading/bold line up to
          // the next markdown heading (or end of text).
          const assumptionHeadingRe = /^#{1,4}\s+Assumptions to Verify[^\n]*/gim;
          const assumptionBoldRe = /^\*{2}[^*]*assumptions?\s+to\s+verify[^*]*\*{2}[^\n]*/gim;
          const headingMatches = [...fullBuildText.matchAll(assumptionHeadingRe)];
          const boldMatches = [...fullBuildText.matchAll(assumptionBoldRe)];
          const totalAssumptionBlocks = headingMatches.length + boldMatches.length;
          if (totalAssumptionBlocks > 1) {
            const formats = [];
            if (headingMatches.length > 0) formats.push(`${headingMatches.length} heading`);
            if (boldMatches.length > 0) formats.push(`${boldMatches.length} bold`);
            console.warn(`[BUILD.md] ${totalAssumptionBlocks} "Assumptions to Verify" blocks found (${formats.join(', ')}) — stripping all but the last`);
          }

          // Determine which format the LAST block uses so we can preserve it.
          const lastHeading = headingMatches.length > 0 ? headingMatches[headingMatches.length - 1] : null;
          const lastBold = boldMatches.length > 0 ? boldMatches[boldMatches.length - 1] : null;
          const lastIsBold = lastBold !== null && (lastHeading === null || (lastBold.index! > lastHeading.index!));

          // Strip function: removes assumption blocks (heading or bold) up to the next markdown heading or end of text.
          const stripAssumptionBlocks = (text: string, preserveLastBold: boolean) => {
            let result = text;
            // Strip heading-format blocks
            result = result.replace(/^#{1,4}\s+Assumptions to Verify[^\n]*\n([\s\S]*?)(?=^#{1,4}\s|$(?!\n))/gim, '');
            // Strip bold-format blocks — optionally preserve the last one
            const boldBlockRe = /^\*{2}[^*]*assumptions?\s+to\s+verify[^*]*\*{2}[^\n]*\n([\s\S]*?)(?=^#{1,4}\s|$(?!\n))/gim;
            if (preserveLastBold) {
              // Collect all bold-block matches, strip all except the last
              const matches = [...result.matchAll(boldBlockRe)];
              if (matches.length <= 1) return result.trimEnd();
              // Rebuild by removing all but last
              // Remove earlier matches from end to start to preserve indices
              for (let m = matches.length - 2; m >= 0; m--) {
                const match = matches[m];
                result = result.slice(0, match.index!) + result.slice(match.index! + match[0].length);
              }
              return result.trimEnd();
            } else {
              result = result.replace(boldBlockRe, '');
              return result.trimEnd();
            }
          };

          const shouldStrip = totalAssumptionBlocks > 1;
          const cleanFoundation = shouldStrip ? stripAssumptionBlocks(foundationText, lastIsBold) : foundationText;
          const cleanSections = shouldStrip ? stripAssumptionBlocks(sectionsText, lastIsBold) : sectionsText;

          const assumptionWarning = buildMdHighAssumption
            ? `> \u26a0 ADVERTENCIA: ${assumptionCount} valores en este documento son SUPUESTOS, no extraídos del CSS del sitio.\n> Esta especificación es en gran parte una aproximación visual. Revisa la sección "Assumptions to Verify" antes de usarla.\n\n`
            : '';

          // A2: Concatenate with fixed header prepended once (using cleaned foundation/sections if duplicates were stripped)
          const provenanceBlock = provenanceLine
            ? `> ${provenanceLine}\n\n> Advertencia: diseño y estructura provienen de sitios distintos. Verifica que los colores y tipografía tengan sentido aplicados a estas secciones.\n\n`
            : '';
          buildMd = `${BUILD_SPEC_FIXED_HEADER}\n\n${provenanceBlock}${assumptionWarning}${cleanFoundation}\n\n${cleanSections}\n\n${componentsText}`;
        } catch (e) {
          console.warn('BUILD.md generation failed — delivering design.md and blueprint.json only:', e);
        }
      }

      // Single-file mode: prepend LLM usage header above the BUILD.md fixed header
      if (outputMode === 'single' && buildMd) {
        // (unchanged — single-file mode behavior)
        const llmHeader = `# Design & Build Specification — ${hostname(structUrl)}\nThis is a complete, self-contained design specification extracted from ${designUrl}. It contains the full design system (colors, typography, spacing, components) and section-by-section structure needed to rebuild this page.\nValues marked ASSUMED were inferred visually, not extracted from CSS — review them before relying on them. Feed this entire file to an LLM to recreate the page.`;
        buildMd = `${llmHeader}\n\n${buildMd}`;
      }

      setPhase('done', 'Extraction complete.', 100);
      setResult({ designMd, blueprintJson, buildMd, buildMdIncomplete, buildMdHighAssumption, assumptionRatio, assumptionCount, valueCount, screenshot, screenshotAvailable: screenshotSegments.length > 0, externalSheets, cssDegraded, cssLooksInsufficient, insufficientReasons, platform, buildTarget, provenance: provenanceLine, platformMismatch, platformMismatchNote, outputMode, copyMd, copyProvenance, imagesMd });
      if (soundEnabled) playDoneSound('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Extraction failed';
      setError(msg);
      setState({ phase: 'error', message: msg, progress: 0 });
      if (soundEnabled) playDoneSound('error');
    }
  };

  const handleExtract = () => {
    if (!url.trim()) return;
    if (structureUrl.trim() && !isValidUrl(structureUrl)) {
      setStructureUrlError('URL de estructura inválida — revisa el formato');
      return;
    }
    setStructureUrlError(null);
    if (!resolvedKey) {
      setShowApiKeyModal(true);
      return;
    }
    runExtraction(resolvedKey);
  };

  const handleApiKeyConfirmed = (key: string) => {
    setLocalApiKey(key);
    setShowApiKeyModal(false);
    runExtraction(key);
  };

  const isRunning = ['scrape-design', 'scrape-structure', 'fetch-css', 'llm-design', 'llm-blueprint', 'llm-buildspec'].includes(state.phase);
  const site = hostname(structureUrl.trim() || url);

  const phases: Array<{ key: ExtractionState['phase']; label: string }> =
    outputMode === 'blueprinter'
      ? isDualUrl
        ? [
            { key: 'scrape-design', label: 'Phase 1 — Scrape design source (URL A)' },
            { key: 'scrape-structure', label: 'Phase 2 — Scrape copy source (URL B)' },
            { key: 'fetch-css', label: 'Phase 3 — Fetch external stylesheets (URL A)' },
            { key: 'llm-design', label: 'Phase 4 — Generate design.md (Claude)' },
            { key: 'done', label: 'Phase 5 — Extract copy.md + images.md (deterministic)' },
          ]
        : [
            { key: 'scrape-structure', label: 'Phase 1 — Scrape page (rawHtml + screenshot)' },
            { key: 'fetch-css', label: 'Phase 2 — Fetch external stylesheets' },
            { key: 'llm-design', label: 'Phase 3 — Generate design.md (Claude)' },
            { key: 'done', label: 'Phase 4 — Extract copy.md + images.md (deterministic)' },
          ]
      : isDualUrl
        ? [
            { key: 'scrape-design', label: 'Phase 1 — Scrape design source (URL A)' },
            { key: 'scrape-structure', label: 'Phase 2 — Scrape structure source (URL B)' },
            { key: 'fetch-css', label: 'Phase 3 — Fetch external stylesheets (URL A)' },
            { key: 'llm-blueprint', label: 'Phase 4 — Generate blueprint JSON from URL B (Claude)' },
            { key: 'llm-design', label: 'Phase 5 — Generate design.md from URL A (Claude)' },
            { key: 'llm-buildspec', label: 'Phase 6 — Generate BUILD.md (Claude)' },
          ]
        : [
            { key: 'scrape-structure', label: 'Phase 1 — Scrape page (rawHtml + screenshot)' },
            { key: 'fetch-css', label: 'Phase 2 — Fetch external stylesheets' },
            { key: 'llm-blueprint', label: 'Phase 3 — Generate blueprint JSON (Claude)' },
            { key: 'llm-design', label: 'Phase 4 — Generate design.md (Claude)' },
            { key: 'llm-buildspec', label: 'Phase 5 — Generate BUILD.md (Claude)' },
          ];

  const currentPhaseIdx = phases.findIndex(p => p.key === state.phase);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {showApiKeyModal && (
        <ApiKeyModal
          onKeyConfirmed={handleApiKeyConfirmed}
          onSkip={() => setShowApiKeyModal(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Design Extractor</h2>
        <p className="text-sm text-gray-500">
          {outputMode === 'blueprinter'
            ? <>Blueprinter: extrae <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">design.md</code> (estilo), <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">copy.md</code> (texto) e <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">images.md</code> (imágenes). Aporta tú la estructura con un screenshot.</>
            : <>Three-phase pipeline: Firecrawl scrapes page structure and screenshot, then Claude generates a complete <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">design.md</code>, page blueprint JSON, and <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">BUILD.md</code> reconstruction spec.</>
          }
        </p>
      </div>

      {/* Input */}
      <div className="mb-8 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">URL de diseño</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isRunning && handleExtract()}
              placeholder="https://example.com"
              disabled={isRunning}
              className="flex-1 border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 disabled:opacity-50"
            />
            <button
              onClick={handleExtract}
              disabled={isRunning || !url.trim()}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 shrink-0"
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Extracting...</span></>
              ) : (
                <><Palette className="w-4 h-4" /><span>Extract Design</span></>
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{outputMode === 'blueprinter' ? 'URL de texto/copy (opcional)' : 'URL de estructura (opcional)'}</label>
          <input
            type="text"
            value={structureUrl}
            onChange={e => setStructureUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isRunning && handleExtract()}
            placeholder={outputMode === 'blueprinter' ? (copyMode === 'lorem' ? 'Solo se usa para imágenes si el origen de imágenes es "copy"' : 'De dónde extraer el texto. Vacío = usar la URL de diseño.') : 'Déjalo vacío para usar la misma URL para todo'}
            disabled={isRunning || (outputMode === 'blueprinter' && copyMode === 'lorem' && imageSource !== 'copy')}
            className="w-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 disabled:opacity-50"
          />
          {structureUrlError && (
            <p className="mt-1 text-xs text-red-600">{structureUrlError}</p>
          )}
        </div>
        {outputMode === 'blueprinter' && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">¿De dónde viene el texto?</p>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="copyMode"
                  value="scrape"
                  checked={copyMode === 'scrape'}
                  onChange={() => setCopyMode('scrape')}
                  disabled={isRunning}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">De la URL de texto/copy — por defecto</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="copyMode"
                  value="lorem"
                  checked={copyMode === 'lorem'}
                  onChange={() => setCopyMode('lorem')}
                  disabled={isRunning}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Lorem Ipsum (texto de relleno)</span>
              </label>
            </div>
          </div>
        )}
        {outputMode === 'blueprinter' && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">¿De dónde tomar las imágenes?</p>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="imageSource"
                  value="design"
                  checked={imageSource === 'design'}
                  onChange={() => setImageSource('design')}
                  disabled={isRunning}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">De la URL de diseño ({hostname(url)})</span>
              </label>
              {structureUrl.trim().length > 0 && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="imageSource"
                    value="copy"
                    checked={imageSource === 'copy'}
                    onChange={() => setImageSource('copy')}
                    disabled={isRunning}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">De la URL de texto/copy ({hostname(structureUrl)})</span>
                </label>
              )}
              {fillUnsplash && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="imageSource"
                    value="unsplash"
                    checked={imageSource === 'unsplash'}
                    onChange={() => setImageSource('unsplash')}
                    disabled={isRunning}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Solo Unsplash (genéricas)</span>
                </label>
              )}
            </div>
            <label className="flex items-center space-x-2 cursor-pointer pt-2 border-t border-gray-200">
              <input
                type="checkbox"
                checked={fillUnsplash}
                onChange={e => {
                  setFillUnsplash(e.target.checked);
                  if (!e.target.checked && imageSource === 'unsplash') setImageSource('design');
                }}
                disabled={isRunning}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Rellenar huecos con imágenes de Unsplash (genéricas)</span>
            </label>
          </div>
        )}
        {isDualUrl && outputMode !== 'blueprinter' && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">¿De dónde viene el texto de la página?</p>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="copySource"
                  value="structure"
                  checked={copySource === 'structure'}
                  onChange={() => setCopySource('structure')}
                  disabled={isRunning}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">De la página de estructura (URL B) — por defecto</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="copySource"
                  value="placeholder"
                  checked={copySource === 'placeholder'}
                  onChange={() => setCopySource('placeholder')}
                  disabled={isRunning}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Dejar como marcador para reescribir con CopyZap</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Output mode — Blueprinter only */}
      <div className="mb-6">
        <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Formato de salida</span>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-900 bg-gray-50">
          <span className="text-sm font-medium text-gray-800">Blueprinter</span>
          <span className="text-xs text-gray-500">design.md + copy.md + images.md</span>
        </div>
      </div>

      {/* Build target selector */}
      <div className="mb-8 flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Build target:</span>
        <button
          onClick={() => setBuildTarget('react-tailwind')}
          disabled={isRunning}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-50 ${
            buildTarget === 'react-tailwind'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          React / Tailwind
        </button>
        <button
          disabled
          className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-100 text-gray-400 cursor-not-allowed flex items-center gap-1.5"
          title="Próximamente"
        >
          WordPress + Elementor
          <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded">Próximamente</span>
        </button>
      </div>

      {/* Progress */}
      {(isRunning || state.phase === 'done') && (
        <div className="mb-8 border border-gray-200 rounded-lg p-5 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">
              {isRunning ? state.message : 'Complete'}
            </span>
            <span className="text-xs text-gray-400">{state.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-5">
            <div
              className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <div className="space-y-2">
            {phases.map((p, i) => (
              <PhaseStep
                key={p.key}
                label={p.label}
                active={p.key === state.phase}
                done={state.phase === 'done' || i < currentPhaseIdx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={() => setSoundEnabled(s => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title={soundEnabled ? 'Silenciar sonido de finalización' : 'Activar sonido de finalización'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Sonido ON' : 'Sonido OFF'}</span>
            </button>
          </div>
          {/* Screenshot preview */}
          {result.screenshot && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-1.5 flex items-center space-x-1.5 border-b border-gray-200">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400 font-mono truncate flex items-center space-x-1.5">
                  <Eye className="w-3 h-3" />
                  <span>{structureUrl.trim() || url}</span>
                </span>
              </div>
              <img src={result.screenshot} alt="Page screenshot" className="w-full object-cover max-h-64" />
            </div>
          )}

          {/* No-screenshot notice */}
          {result.screenshot && !result.screenshotAvailable && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Verificación visual no disponible — el análisis se basó únicamente en el CSS.</span>
            </div>
          )}

          {/* No external sheets notice */}
          {result.externalSheets === 0 && !result.cssDegraded && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>No se pudieron descargar hojas de estilo externas — el análisis se basó solo en los estilos incrustados.</span>
            </div>
          )}

          {/* Provenance line (dual-URL mode) */}
          {result.provenance && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              {result.provenance}
            </div>
          )}

          {/* Platform mismatch note (dual-URL mode) */}
          {result.platformMismatch && result.platformMismatchNote && (
            <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{result.platformMismatchNote}</span>
            </div>
          )}

          {/* CSS extraction degraded warning */}
          {result.cssDegraded && !result.cssLooksInsufficient && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Advertencia: no se pudieron leer las hojas de estilo del sitio (posible bloqueo del servidor). El análisis de diseño está incompleto — verifica los valores manualmente.</span>
            </div>
          )}

          {/* CSS insufficient / boot-only warning (distinct from WAF block) */}
          {result.cssLooksInsufficient && (
            <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-lg text-sm text-orange-800">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Advertencia: el sitio carga sus estilos dinámicamente (JavaScript).</p>
                  <p>Solo se capturó una parte mínima del CSS. El análisis de diseño NO es confiable — los valores deben verificarse manualmente.</p>
                  {result.provenance && (
                    <p className="mt-1 font-medium">La fuente de diseño (URL A) no produjo CSS utilizable. BUILD.md se basará mayormente en supuestos sin importar la calidad de la estructura (URL B).</p>
                  )}
                  {result.insufficientReasons.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-orange-700">
                      {result.insufficientReasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Platform detection */}
          {result.platform && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-800">Plataforma detectada</h4>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  result.platform.confidence === 'high' ? 'bg-green-100 text-green-700' :
                  result.platform.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {result.platform.confidence} confidence
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {result.platform.cms && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">CMS</dt>
                    <dd className="font-medium text-gray-800 capitalize">{result.platform.cms}</dd>
                  </div>
                )}
                {result.platform.builder && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Builder</dt>
                    <dd className="font-medium text-gray-800 capitalize">{result.platform.builder}</dd>
                  </div>
                )}
                {result.platform.framework && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Framework</dt>
                    <dd className="font-medium text-gray-800 capitalize">{result.platform.framework}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">CSS Approach</dt>
                  <dd className="font-medium text-gray-800 capitalize">{result.platform.cssApproach.replace('-', ' ')}</dd>
                </div>
              </div>
              {result.platform.signals.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-gray-500">
                  {result.platform.signals.map((sig, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* design.md output — shown in full and blueprinter modes */}
          {(result.outputMode === 'full' || result.outputMode === 'blueprinter') && (
            <OutputPanel
              title="design.md"
              icon={<Palette className="w-4 h-4" />}
              content={result.designMd}
              filename={`${site}-design.md`}
              downloadMime="text/markdown"
            />
          )}

          {/* Blueprint JSON output — hidden in single-file mode */}
          {result.outputMode === 'full' && (
            <OutputPanel
              title="Page Blueprint JSON"
              icon={<Layers className="w-4 h-4" />}
              content={result.blueprintJson}
              filename={`${site}-blueprint.json`}
              downloadMime="application/json"
            />
          )}

          {/* BUILD.md incomplete warning */}
          {result.buildTarget === 'react-tailwind' && result.buildMd && result.buildMdIncomplete && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Advertencia: BUILD.md quedó incompleto. Algunas secciones no se generaron.</span>
            </div>
          )}

          {/* BUILD.md high assumption ratio warning */}
          {result.buildTarget === 'react-tailwind' && result.buildMd && result.buildMdHighAssumption && (
            <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-lg text-sm text-orange-800">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">⚠ ADVERTENCIA: {result.assumptionCount} de {result.assumptionCount + result.valueCount} valores en BUILD.md son SUPUESTOS.</p>
                  <p>Esta especificación es una aproximación basada mayormente en inferencia visual. Revísala completa antes de usarla.</p>
                </div>
              </div>
            </div>
          )}

          {/* copy.md output — only in Blueprinter mode */}
          {result.outputMode === 'blueprinter' && result.copyMd && (
            <OutputPanel
              title="copy.md"
              icon={<FileText className="w-4 h-4" />}
              content={result.copyMd}
              filename={`${site}-copy.md`}
              downloadMime="text/markdown"
            />
          )}

          {/* images.md output — only in Blueprinter mode */}
          {result.outputMode === 'blueprinter' && result.imagesMd && (
            <OutputPanel
              title="images.md"
              icon={<FileText className="w-4 h-4" />}
              content={result.imagesMd}
              filename={`${site}-images.md`}
              downloadMime="text/markdown"
            />
          )}

          {/* Blueprinter provenance note */}
          {result.outputMode === 'blueprinter' && result.copyProvenance && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              {result.copyProvenance}
            </div>
          )}

          {/* BUILD.md output (only for React/Tailwind, not in Blueprinter mode) */}
          {result.buildTarget === 'react-tailwind' && result.buildMd && (
            <OutputPanel
              title={result.outputMode === 'single' ? 'Design Spec (para LLM)' : 'BUILD.md — Reconstruction Spec'}
              icon={<FileDown className="w-4 h-4" />}
              content={result.buildMd}
              filename={result.outputMode === 'single' ? `${site}-design-spec.md` : `${site}-BUILD.md`}
              downloadMime="text/markdown"
            />
          )}

          {/* BUILD.md generation failed notice */}
          {result.buildTarget === 'react-tailwind' && !result.buildMd && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>BUILD.md no pudo generarse — design.md y blueprint.json están disponibles.</span>
            </div>
          )}

          {/* Quick-download all + copy for builder — hidden in single-file mode */}
          {result.outputMode === 'full' && (
            <div className="flex items-center justify-end gap-3 pt-2">
              {result.buildMd && (
                <button
                  onClick={() => {
                    const payload = `Rebuild this website exactly as specified. BUILD.md defines the design system and section-by-section structure. blueprint.json defines layout contracts — respect every must_preserve and do_not_do rule. Use the exact text and image URLs provided. Do not redesign or improve anything.

--- BUILD.md ---

${result.buildMd}

--- blueprint.json ---

\`\`\`json
${result.blueprintJson}
\`\`\``;
                    navigator.clipboard.writeText(payload);
                  }}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gray-700 text-white text-sm font-semibold hover:bg-gray-600 transition-colors rounded"
                >
                  <Clipboard className="w-4 h-4" />
                  <span>Copiar todo para el builder</span>
                </button>
              )}
              <button
                onClick={() => {
                  downloadFile(result.designMd, `${site}-design.md`, 'text/markdown');
                  setTimeout(() => downloadFile(result.blueprintJson, `${site}-blueprint.json`, 'application/json'), 300);
                  if (result.buildMd) {
                    setTimeout(() => downloadFile(result.buildMd!, `${site}-BUILD.md`, 'text/markdown'), 600);
                  }
                }}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors rounded"
              >
                <FileDown className="w-4 h-4" />
                <span>Download All Files</span>
              </button>
            </div>
          )}

          {/* Prompt para builder panel — shown in full/single (BUILD.md) and blueprinter (design.md + copy.md) modes */}
          {(result.buildMd || result.outputMode === 'blueprinter') && (
            <VibePromptPanel
              buildMd={result.buildMd}
              blueprintJson={result.blueprintJson}
              provenance={result.provenance}
              buildTarget={result.buildTarget}
              vibeTarget={vibeTarget}
              onTargetChange={setVibeTarget}
              outputMode={result.outputMode}
              copyMd={result.copyMd}
              imagesMd={result.imagesMd}
              designMd={result.designMd}
              copyMode={copyMode}
              siteName={site}
              builderFormat={builderFormat}
              onFormatChange={setBuilderFormat}
            />
          )}
        </div>
      )}
    </div>
  );
}
