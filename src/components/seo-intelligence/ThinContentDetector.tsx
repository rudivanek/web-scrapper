import { useState, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, ChevronRight, Check, AlertTriangle, XCircle, Download } from 'lucide-react';
import { scrapeFullPage } from '../../lib/firecrawl';

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 1500;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

export interface ThinContentResult {
  url: string;
  contentWords: number;
  totalWords: number;
  verdict: 'CONTENT' | 'THIN' | 'EMPTY';
}

interface ThinContentDetectorProps {
  crawlId: string;
  filteredUrls: string[];
  domain?: string;
  onLoadingChange?: (loading: boolean) => void;
  onResultsChange?: (results: ThinContentResult[]) => void;
}

export interface ThinContentDetectorRef {
  runAnalysis: () => Promise<void>;
  getResults: () => ThinContentResult[];
  isLoading: () => boolean;
  exportToCSV: () => void;
}

const NOISE_TAGS = [
  'nav', 'header', 'footer', 'aside',
  'script', 'style', 'noscript', 'form', 'button', 'svg',
];

const NOISE_CLASS_ID_FRAGMENTS = [
  'menu', 'nav', 'navbar', 'header', 'footer',
  'sidebar', 'widget', 'cookie', 'breadcrumb',
  'elementor-location-header', 'elementor-location-footer',
  'site-header', 'site-footer', 'main-menu', 'top-bar', 'offcanvas',
];

// Elementor / WordPress main content containers (tried in order before falling back to body)
const CONTENT_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '.elementor-location-single',
  '.e-con-inner',
];

function isRateLimitError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

function extractContentWords(rawHtml: string): { contentWords: number; totalWords: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Total words from raw body using textContent only (innerText is undefined on DOMParser output)
  const totalWords = (doc.body?.textContent || '').split(/\s+/).filter(Boolean).length;

  const clone = doc.body?.cloneNode(true) as HTMLElement;
  if (!clone) return { contentWords: 0, totalWords };

  // 1. Remove noise tag types entirely
  NOISE_TAGS.forEach(tag => {
    clone.querySelectorAll(tag).forEach(el => el.remove());
  });

  // 2. Remove elements by class/id fragment — iterate a static snapshot and skip detached nodes
  Array.from(clone.querySelectorAll('*')).forEach(el => {
    if (!el.isConnected) return;
    const cls = (el.getAttribute('class') || '').toLowerCase();
    const id = (el.getAttribute('id') || '').toLowerCase();
    if (NOISE_CLASS_ID_FRAGMENTS.some(f => cls.includes(f) || id.includes(f))) {
      el.remove();
    }
  });

  // 3. Remove link-heavy elements (navigation lists disguised as divs/uls)
  Array.from(clone.querySelectorAll('*')).forEach(el => {
    if (!el.isConnected) return;
    if (el.querySelectorAll('a').length > 8) {
      el.remove();
    }
  });

  // 4. Prefer a known content container, fall back to cleaned body
  const contentEl = CONTENT_SELECTORS.reduce<Element | null>(
    (found, sel) => found ?? clone.querySelector(sel),
    null
  ) ?? clone;

  const contentWords = (contentEl.textContent || '').split(/\s+/).filter(Boolean).length;

  return { contentWords, totalWords };
}

async function fetchWithRetry(
  url: string,
  onRetrying: (active: boolean) => void,
): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await scrapeFullPage(url);
      const html = result?.data?.rawHtml || result?.data?.html || null;
      if (!html && result?.error && isRateLimitError(result.error)) {
        throw new Error(String(result.error));
      }
      onRetrying(false);
      return html;
    } catch (err) {
      if (attempt < MAX_RETRIES && isRateLimitError(err)) {
        onRetrying(true);
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt] ?? 8000));
        continue;
      }
      onRetrying(false);
      return null;
    }
  }
  onRetrying(false);
  return null;
}

export const ThinContentDetector = forwardRef<ThinContentDetectorRef, ThinContentDetectorProps>(
  ({ filteredUrls, domain = 'analysis', onLoadingChange, onResultsChange }, ref) => {
    const [results, setResults] = useState<ThinContentResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
    const [showIssuesOnly, setShowIssuesOnly] = useState(false);
    const [configOpen, setConfigOpen] = useState(true);
    const [thinThreshold, setThinThreshold] = useState(150);
    const [emptyThreshold, setEmptyThreshold] = useState(50);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

    const getVerdict = (words: number): ThinContentResult['verdict'] => {
      if (words > thinThreshold) return 'CONTENT';
      if (words >= emptyThreshold) return 'THIN';
      return 'EMPTY';
    };

    const runAnalysis = async () => {
      if (filteredUrls.length === 0) {
        alert('No URLs selected for analysis');
        return;
      }

      setLoading(true);
      setProgress({ current: 0, total: filteredUrls.length });
      onLoadingChange?.(true);

      const analysisResults: ThinContentResult[] = [];
      let processed = 0;

      try {
        for (let i = 0; i < filteredUrls.length; i += BATCH_SIZE) {
          const batch = filteredUrls.slice(i, i + BATCH_SIZE);

          const batchSettled = await Promise.allSettled(
            batch.map(url =>
              fetchWithRetry(url, () => {}).then(html => ({ url, html }))
            )
          );

          for (const settled of batchSettled) {
            if (settled.status === 'fulfilled') {
              const { url, html } = settled.value;
              if (html) {
                const { contentWords, totalWords } = extractContentWords(html);
                analysisResults.push({
                  url,
                  contentWords,
                  totalWords,
                  verdict: getVerdict(contentWords),
                });
              } else {
                analysisResults.push({
                  url: settled.value.url,
                  contentWords: 0,
                  totalWords: 0,
                  verdict: 'EMPTY',
                });
              }
            }
            processed++;
          }

          setProgress({ current: processed, total: filteredUrls.length });

          if (i + BATCH_SIZE < filteredUrls.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
          }
        }

        setResults(analysisResults);
        onResultsChange?.(analysisResults);
      } catch (err) {
        console.error('Thin content detection error:', err);
        alert('Failed to detect thin content. Please try again.');
      } finally {
        setLoading(false);
        setProgress(null);
        onLoadingChange?.(false);
      }
    };

    const exportToCSV = () => {
      if (results.length === 0) return;
      const headers = ['URL', 'Content Words', 'Total Words', 'Verdict'];
      let csv = headers.join(',') + '\n';
      results.forEach(r => {
        const values = [r.url, String(r.contentWords), String(r.totalWords), r.verdict].map(v => `"${v}"`);
        csv += values.join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      a.download = `${domain}-thin-content-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    useImperativeHandle(ref, () => ({
      runAnalysis,
      getResults: () => results,
      isLoading: () => loading,
      exportToCSV,
    }));

    const toggleExpand = (url: string) => {
      setExpandedUrls(prev => {
        const next = new Set(prev);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        return next;
      });
    };

    const totalCount = results.length;
    const contentCount = results.filter(r => r.verdict === 'CONTENT').length;
    const thinCount = results.filter(r => r.verdict === 'THIN').length;
    const emptyCount = results.filter(r => r.verdict === 'EMPTY').length;

    const displayedResults = showIssuesOnly
      ? results.filter(r => r.verdict !== 'CONTENT')
      : results;

    const verdictBadge = (verdict: ThinContentResult['verdict']) => {
      if (verdict === 'CONTENT') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
            <Check className="w-3 h-3" /> CONTENT
          </span>
        );
      }
      if (verdict === 'THIN') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
            <AlertTriangle className="w-3 h-3" /> THIN
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" /> EMPTY
        </span>
      );
    };

    return (
      <div className="space-y-4">
        {/* Config panel */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setConfigOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>Configuration (thresholds)</span>
            {configOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {configOpen && (
            <div className="p-4 grid grid-cols-2 gap-4 bg-white">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Thin threshold (words)
                </label>
                <input
                  type="number"
                  min={1}
                  value={thinThreshold}
                  onChange={e => setThinThreshold(parseInt(e.target.value) || 150)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <p className="mt-1 text-xs text-gray-500">Pages above this are CONTENT (green)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Empty threshold (words)
                </label>
                <input
                  type="number"
                  min={0}
                  value={emptyThreshold}
                  onChange={e => setEmptyThreshold(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <p className="mt-1 text-xs text-gray-500">Pages below this are EMPTY (red); between is THIN</p>
              </div>
            </div>
          )}
        </div>

        {/* In-progress indicator */}
        {loading && progress && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-800 font-medium">
                Analyzing {progress.current} of {progress.total} pages…
              </span>
              <span className="text-xs text-blue-600">{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary cards */}
        {results.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                <div className="text-sm text-gray-600">Total Pages</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{contentCount}</div>
                <div className="text-sm text-green-600">Content</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{thinCount}</div>
                <div className="text-sm text-yellow-600">Thin</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">{emptyCount}</div>
                <div className="text-sm text-red-600">Empty</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="thin-show-issues-only"
                  type="checkbox"
                  checked={showIssuesOnly}
                  onChange={e => setShowIssuesOnly(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded"
                />
                <label htmlFor="thin-show-issues-only" className="text-sm text-gray-700 cursor-pointer">
                  Show only issues
                </label>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-10 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">URL</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Content Words</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total Words</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedResults.map((result, idx) => {
                      const isExpanded = expandedUrls.has(result.url);
                      return (
                        <>
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleExpand(result.url)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4" />
                                  : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate block max-w-md"
                              >
                                {result.url}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={result.contentWords < emptyThreshold ? 'font-bold text-red-600' : 'text-gray-700'}>
                                {result.contentWords}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{result.totalWords}</td>
                            <td className="px-4 py-3">{verdictBadge(result.verdict)}</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${idx}-expanded`}>
                              <td colSpan={5} className="px-4 py-4 bg-gray-50">
                                <div className="text-xs text-gray-600 space-y-1">
                                  <p><span className="font-medium">Content words</span> (after stripping nav/header/footer/sidebar): {result.contentWords}</p>
                                  <p><span className="font-medium">Total words</span> (full page): {result.totalWords}</p>
                                  <p><span className="font-medium">Boilerplate ratio</span>: {result.totalWords > 0 ? Math.round(((result.totalWords - result.contentWords) / result.totalWords) * 100) : 0}% of words are navigation/chrome</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && results.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">
              Click "Run Analysis" to detect thin and empty pages across the site
            </p>
          </div>
        )}
      </div>
    );
  }
);

ThinContentDetector.displayName = 'ThinContentDetector';
