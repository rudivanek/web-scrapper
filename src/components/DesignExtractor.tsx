import { useState } from 'react';
import { Loader2, Palette, FileDown, AlertCircle, Check, Copy, ChevronDown, ChevronUp, Layers, Eye } from 'lucide-react';
import { callFirecrawl, extractCssData, type CssExtractResultWithDiagnostics } from '../lib/firecrawl';
import { callClaude } from '../lib/callClaude';
import { prepareScreenshot } from '../lib/imagePrep';
import { preprocessHtml } from '../lib/htmlPreprocess';
import {
  DESIGN_SYSTEM_PROMPT,
  BLUEPRINT_SYSTEM_PROMPT,
  buildDesignUserPrompt,
  buildBlueprintUserPrompt,
} from '../lib/prompts/designExtractionPrompts';
import { ApiKeyModal } from './ApiKeyModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExtractionState {
  phase: 'idle' | 'scrape-design' | 'scrape-structure' | 'fetch-css' | 'llm-design' | 'llm-blueprint' | 'done' | 'error';
  message: string;
  progress: number; // 0–100
}

interface ExtractionResult {
  designMd: string;
  blueprintJson: string;
  screenshot: string | null;
  screenshotAvailable: boolean;
  externalSheets: number;
  cssDegraded: boolean;
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export function DesignExtractor({ anthropicKey }: { anthropicKey?: string }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ExtractionState>({ phase: 'idle', message: '', progress: 0 });
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [localApiKey, setLocalApiKey] = useState<string | null>(null);

  const resolvedKey = localApiKey || anthropicKey || null;

  const setPhase = (phase: ExtractionState['phase'], message: string, progress: number) => {
    setState({ phase, message, progress });
  };

  const runExtraction = async (apiKey: string) => {
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    setError(null);
    setResult(null);

    try {
      // Phase 1: Structure scrape with screenshot (moved before design LLM call)
      setPhase('scrape-structure', 'Running structure scrape (rawHtml + screenshot)...', 10);
      const structureScrape = await callFirecrawl({
        endpoint: '/v1/scrape',
        method: 'POST',
        body: {
          url: normalized,
          formats: ['rawHtml', 'screenshot@fullPage'],
          onlyMainContent: false,
        },
      });

      const rawHtml: string = structureScrape?.data?.rawHtml ?? structureScrape?.rawHtml ?? '';
      const screenshot: string | null = structureScrape?.data?.screenshot ?? structureScrape?.screenshot ?? null;

      // Phase 2: Pre-process HTML
      const { cleanedHtml, cssBlocks, inlineStyles } = preprocessHtml(rawHtml);

      // Phase 3: Fetch external stylesheets (pass Firecrawl's rawHtml to avoid a separate fetch)
      setPhase('fetch-css', 'Descargando hojas de estilo externas...', 25);
      let cssData: CssExtractResultWithDiagnostics | null = null;
      try {
        cssData = await extractCssData(normalized, rawHtml || undefined);
      } catch (e) {
        console.warn('extractCssData failed, continuing with inline CSS only:', e);
      }
      if (cssData?.diagnostics) {
        console.log('[extract-css] diagnostics:', cssData.diagnostics);
      }
      const externalSheets = cssData?.sheets?.length ?? 0;
      const cssDegraded = !cssData || cssData.diagnostics.sheetsFetchedOk === 0 || cssData.diagnostics.customPropertyCount === 0 || cssData.diagnostics.sheetsFailed.some(f => f.reason === 'html-response (likely WAF block)');
      const combinedCss = buildCombinedCss(cssData, cssBlocks, inlineStyles);

      // Prepare screenshot segments for Claude vision
      let screenshotSegments: string[] = [];
      if (screenshot) {
        screenshotSegments = await prepareScreenshot(screenshot);
      }

      // Phase 4: LLM Call A — design.md (with screenshot segments)
      setPhase('llm-design', 'Generating design.md with Claude...', 45);
      const designUserPrompt = buildDesignUserPrompt(combinedCss);
      const designMd = await callClaude(apiKey, DESIGN_SYSTEM_PROMPT, designUserPrompt, 8000, screenshotSegments.length > 0 ? screenshotSegments : undefined);

      // Phase 5: LLM Call B — blueprint JSON (with screenshot segments + design.md as context)
      setPhase('llm-blueprint', 'Generating page blueprint JSON with Claude...', 70);
      const blueprintUserPrompt = buildBlueprintUserPrompt(cleanedHtml, designMd);
      const blueprintRaw = await callClaude(apiKey, BLUEPRINT_SYSTEM_PROMPT, blueprintUserPrompt, 8000, screenshotSegments.length > 0 ? screenshotSegments : undefined);

      // Attempt to parse and re-stringify for clean JSON
      let blueprintJson = blueprintRaw.trim();
      try {
        const parsed = JSON.parse(blueprintJson);
        blueprintJson = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw if parse fails — LLM may have added fences
        blueprintJson = blueprintRaw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      }

      setPhase('done', 'Extraction complete.', 100);
      setResult({ designMd, blueprintJson, screenshot, screenshotAvailable: screenshotSegments.length > 0, externalSheets, cssDegraded });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Extraction failed';
      setError(msg);
      setState({ phase: 'error', message: msg, progress: 0 });
    }
  };

  const handleExtract = () => {
    if (!url.trim()) return;
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

  const isRunning = ['scrape-design', 'scrape-structure', 'fetch-css', 'llm-design', 'llm-blueprint'].includes(state.phase);
  const site = hostname(url);

  const phases: Array<{ key: ExtractionState['phase']; label: string }> = [
    { key: 'scrape-structure', label: 'Phase 1 — Scrape page (rawHtml + screenshot)' },
    { key: 'fetch-css', label: 'Phase 2 — Fetch external stylesheets' },
    { key: 'llm-design', label: 'Phase 3 — Generate design.md (Claude)' },
    { key: 'llm-blueprint', label: 'Phase 4 — Generate blueprint JSON (Claude)' },
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
          Two-phase pipeline: Firecrawl scrapes page structure and screenshot, then Claude generates a complete <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">design.md</code> and page blueprint JSON.
        </p>
      </div>

      {/* Input */}
      <div className="mb-8 flex gap-3">
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
          {/* Screenshot preview */}
          {result.screenshot && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-1.5 flex items-center space-x-1.5 border-b border-gray-200">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400 font-mono truncate flex items-center space-x-1.5">
                  <Eye className="w-3 h-3" />
                  <span>{url}</span>
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

          {/* CSS extraction degraded warning */}
          {result.cssDegraded && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Advertencia: no se pudieron leer las hojas de estilo del sitio (posible bloqueo del servidor). El análisis de diseño está incompleto — verifica los valores manualmente.</span>
            </div>
          )}

          {/* design.md output */}
          <OutputPanel
            title="design.md"
            icon={<Palette className="w-4 h-4" />}
            content={result.designMd}
            filename={`${site}-design.md`}
            downloadMime="text/markdown"
          />

          {/* Blueprint JSON output */}
          <OutputPanel
            title="Page Blueprint JSON"
            icon={<Layers className="w-4 h-4" />}
            content={result.blueprintJson}
            filename={`${site}-blueprint.json`}
            downloadMime="application/json"
          />

          {/* Quick-download all */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                downloadFile(result.designMd, `${site}-design.md`, 'text/markdown');
                setTimeout(() => downloadFile(result.blueprintJson, `${site}-blueprint.json`, 'application/json'), 300);
              }}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors rounded"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Both Files</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
