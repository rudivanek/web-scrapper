import { useState } from 'react';
import { Loader2, Palette, FileDown, AlertCircle, Check, Copy, ChevronDown, ChevronUp, Layers, Eye, Clipboard } from 'lucide-react';
import { callFirecrawl, extractCssData, type CssExtractResultWithDiagnostics, type PlatformDetection } from '../lib/firecrawl';
import { callClaude, callClaudeWithMeta, callWithContinuation } from '../lib/callClaude';
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
  screenshot: string | null;
  screenshotAvailable: boolean;
  externalSheets: number;
  cssDegraded: boolean;
  platform: PlatformDetection | null;
  buildTarget: BuildTarget;
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
  const [buildTarget, setBuildTarget] = useState<BuildTarget>('react-tailwind');

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

      // Phase 2b: Extract asset manifest from raw HTML (before cleaning)
      const assetManifest = extractAssetManifest(rawHtml, normalized);

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
      if (cssData?.platform) {
        console.log('[extract-css] platform:', cssData.platform);
      }
      const externalSheets = cssData?.sheets?.length ?? 0;
      const cssDegraded = !cssData || cssData.diagnostics.sheetsFetchedOk === 0 || cssData.diagnostics.sheetsFailed.some(f => f.reason === 'html-response (likely WAF block)');
      const platform = cssData?.platform ?? null;
      const frequency = cssData?.frequency ?? null;
      const tailwind = cssData?.tailwind ?? null;
      const combinedCss = buildCombinedCss(cssData, cssBlocks, inlineStyles);

      // Enrich asset manifest with background images from fetched external CSS
      let enrichedManifest = assetManifest;
      if (cssData?.rawCss) {
        enrichedManifest = enrichManifestWithCss(assetManifest, cssData.rawCss, normalized);
      }
      const assetManifestText = formatAssetManifestForPrompt(enrichedManifest);

      // Prepare screenshot segments for Claude vision
      let screenshotSegments: string[] = [];
      if (screenshot) {
        screenshotSegments = await prepareScreenshot(screenshot);
      }

      // Phase 4: LLM Call A — design.md (with screenshot segments)
      setPhase('llm-design', 'Generating design.md with Claude...', 45);
      const designUserPrompt = buildDesignUserPrompt(combinedCss, platform, frequency, tailwind);
      const designMd = await callClaude(apiKey, DESIGN_SYSTEM_PROMPT, designUserPrompt, 8000, screenshotSegments.length > 0 ? screenshotSegments : undefined);

      // Phase 5: LLM Call B — blueprint JSON (with screenshot segments + design.md + asset manifest as context)
      setPhase('llm-blueprint', 'Generating page blueprint JSON with Claude...', 70);
      const blueprintUserPrompt = buildBlueprintUserPrompt(cleanedHtml, designMd, assetManifestText);
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

      // Phase 6: LLM Call C — BUILD.md (only for React/Tailwind target)
      // Generated in three sequential calls to avoid truncation:
      //   Call 1: Foundation (sections 1–4), max_tokens 16000
      //   Call 2: Sections (section 5), max_tokens 16000 — batched if >8 sections
      //   Call 3: Components + Assumptions (sections 6–7), max_tokens 16000
      let buildMd: string | null = null;
      let buildMdIncomplete = false;
      if (buildTarget === 'react-tailwind') {
        setPhase('llm-buildspec', 'Generando especificación de reconstrucción (BUILD.md)...', 90);
        try {
          const imgs = screenshotSegments.length > 0 ? screenshotSegments : undefined;

          // Call 1: Foundation (sections 1–4)
          const foundationPrompt = buildFoundationUserPrompt(designMd);
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
              const batchPrompt = buildSectionsUserPrompt(designMd, blueprintJson, foundationText, range);
              const batchRes = await callWithContinuation(apiKey, BUILD_SPEC_SECTIONS_PROMPT, batchPrompt, 16000, imgs, `Sections batch ${range.start}–${range.end}`);
              sectionsText += (sectionsText ? '\n\n' : '') + batchRes.text.trim();
              if (batchRes.truncated) {
                console.warn(`[BUILD.md] Sections batch ${range.start}–${range.end} truncated after continuations (stop_reason=max_tokens)`);
                buildMdIncomplete = true;
              }
            }
          } else {
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
          const componentsPrompt = buildComponentsUserPrompt(designMd, sections1to5);
          const componentsRes = await callWithContinuation(apiKey, BUILD_SPEC_COMPONENTS_PROMPT, componentsPrompt, 16000, imgs, 'Components');
          let componentsText = componentsRes.text.trim();
          if (componentsRes.truncated) {
            console.warn('[BUILD.md] Components call truncated after continuations (stop_reason=max_tokens)');
            buildMdIncomplete = true;
          }

          // A2: Concatenate with fixed header prepended once
          buildMd = `${BUILD_SPEC_FIXED_HEADER}\n\n${foundationText}\n\n${sectionsText}\n\n${componentsText}`;
        } catch (e) {
          console.warn('BUILD.md generation failed — delivering design.md and blueprint.json only:', e);
        }
      }

      setPhase('done', 'Extraction complete.', 100);
      setResult({ designMd, blueprintJson, buildMd, buildMdIncomplete, screenshot, screenshotAvailable: screenshotSegments.length > 0, externalSheets, cssDegraded, platform, buildTarget });
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

  const isRunning = ['scrape-design', 'scrape-structure', 'fetch-css', 'llm-design', 'llm-blueprint', 'llm-buildspec'].includes(state.phase);
  const site = hostname(url);

  const phases: Array<{ key: ExtractionState['phase']; label: string }> = [
    { key: 'scrape-structure', label: 'Phase 1 — Scrape page (rawHtml + screenshot)' },
    { key: 'fetch-css', label: 'Phase 2 — Fetch external stylesheets' },
    { key: 'llm-design', label: 'Phase 3 — Generate design.md (Claude)' },
    { key: 'llm-blueprint', label: 'Phase 4 — Generate blueprint JSON (Claude)' },
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
          Three-phase pipeline: Firecrawl scrapes page structure and screenshot, then Claude generates a complete <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">design.md</code>, page blueprint JSON, and <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">BUILD.md</code> reconstruction spec.
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

          {/* BUILD.md incomplete warning */}
          {result.buildTarget === 'react-tailwind' && result.buildMd && result.buildMdIncomplete && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Advertencia: BUILD.md quedó incompleto. Algunas secciones no se generaron.</span>
            </div>
          )}

          {/* BUILD.md output (only for React/Tailwind) */}
          {result.buildTarget === 'react-tailwind' && result.buildMd && (
            <OutputPanel
              title="BUILD.md — Reconstruction Spec"
              icon={<FileDown className="w-4 h-4" />}
              content={result.buildMd}
              filename={`${site}-BUILD.md`}
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

          {/* Quick-download all + copy for builder */}
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
        </div>
      )}
    </div>
  );
}
