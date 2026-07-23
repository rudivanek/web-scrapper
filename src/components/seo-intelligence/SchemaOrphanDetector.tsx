import { useState, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Check, XCircle, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { scrapeFullPage } from '../../lib/firecrawl';

const FETCH_BATCH_SIZE = 3;
const FETCH_BATCH_DELAY_MS = 1500;
const FETCH_MAX_RETRIES = 3;
const FETCH_RETRY_DELAYS_MS = [2000, 4000, 8000];

function isRateLimitError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

async function fetchHtmlWithRetry(url: string): Promise<string | null> {
  for (let attempt = 0; attempt <= FETCH_MAX_RETRIES; attempt++) {
    try {
      const result = await scrapeFullPage(url);
      const html = result?.data?.rawHtml || result?.data?.html || null;
      if (!html && result?.error && isRateLimitError(result.error)) {
        throw new Error(String(result.error));
      }
      return html;
    } catch (err) {
      if (attempt < FETCH_MAX_RETRIES && isRateLimitError(err)) {
        await new Promise(r => setTimeout(r, FETCH_RETRY_DELAYS_MS[attempt] ?? 8000));
        continue;
      }
      return null;
    }
  }
  return null;
}

interface BlockInfo {
  index: number;
  id: string | null;
  types: string[];
}

interface OrphanResult {
  url: string;
  blockCount: number;
  blocks: BlockInfo[];
  orphanFlags: string[];
  verdict: 'CLEAN' | 'REVIEW' | 'CLEANUP' | 'ERROR' | 'SKIPPED';
}

interface SchemaOrphanDetectorProps {
  crawlId: string;
  filteredUrls: string[];
  domain?: string;
  onLoadingChange?: (loading: boolean) => void;
  onResultsChange?: (results: OrphanResult[]) => void;
}

export interface SchemaOrphanDetectorRef {
  runAnalysis: () => Promise<void>;
  getResults: () => OrphanResult[];
  isLoading: () => boolean;
  exportToCSV: () => void;
  exportToXLSX: () => void;
}

export interface SchemaOrphanDetectorResult {
  module: 'schema_cleanup';
  results: OrphanResult[];
}

const FLAG_LABELS: Record<string, string> = {
  FAQ_NO_ID: 'FAQPage without @id',
  STRAY_FAQPAGE: 'Unexpected FAQPage',
  DUPLICATE_BLOCK: 'Duplicate JSON-LD block',
  DEPRECATED_PATH: 'Contains deprecated path',
  MISSING_MANAGED_BLOCK: 'Managed block missing',
  FETCH_ERROR: 'Could not fetch page',
  FETCH_FAILED: 'Could not fetch page',
  NOT_PROCESSED: 'Not processed (time limit)',
};

const VERDICT_ORDER: Record<string, number> = { CLEANUP: 0, REVIEW: 1, CLEAN: 2, ERROR: 3, SKIPPED: 4 };

function sortedResults(results: OrphanResult[]): OrphanResult[] {
  return [...results].sort((a, b) => {
    const ao = VERDICT_ORDER[a.verdict] ?? 99;
    const bo = VERDICT_ORDER[b.verdict] ?? 99;
    return ao - bo;
  });
}

function makeCell(v: string | number, bold: boolean, fillHex: string, fontHex: string): any {
  return {
    v,
    t: typeof v === 'number' ? 'n' : 's',
    s: {
      font: { name: 'Arial', bold, color: { rgb: fontHex } },
      fill: { fgColor: { rgb: fillHex }, patternType: 'solid' },
      alignment: { wrapText: false, vertical: 'center' },
    },
  };
}

function makeChildCell(v: string, fillHex: string, bold = false, fontHex = '000000'): any {
  return {
    v,
    t: 's',
    s: {
      font: { name: 'Arial', bold, color: { rgb: fontHex } },
      fill: { fgColor: { rgb: fillHex }, patternType: 'solid' },
      alignment: { wrapText: false, vertical: 'center' },
    },
  };
}

export const SchemaOrphanDetector = forwardRef<SchemaOrphanDetectorRef, SchemaOrphanDetectorProps>(
  ({ crawlId, filteredUrls, domain = 'analysis', onLoadingChange, onResultsChange }, ref) => {
    const [results, setResults] = useState<OrphanResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
    const [showIssuesOnly, setShowIssuesOnly] = useState(false);

    // Config state
    const [configOpen, setConfigOpen] = useState(true);
    const [managedBlockId, setManagedBlockId] = useState('');
    const [legitFaqUrlsText, setLegitFaqUrlsText] = useState('');
    const [deprecatedFragmentsText, setDeprecatedFragmentsText] = useState('/en/');

    const runAnalysis = async () => {
      if (filteredUrls.length === 0) {
        alert('No URLs selected for analysis');
        return;
      }

      setLoading(true);
      onLoadingChange?.(true);

      try {
        const legitFaqUrls = legitFaqUrlsText
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean);

        const deprecatedPathFragments = deprecatedFragmentsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        // --- Phase 1: fetch HTML client-side via scrapeFullPage (batched, with retry) ---
        const pages: { url: string; html: string | null }[] = [];

        for (let i = 0; i < filteredUrls.length; i += FETCH_BATCH_SIZE) {
          const batch = filteredUrls.slice(i, i + FETCH_BATCH_SIZE);

          const batchResults = await Promise.allSettled(
            batch.map(async url => ({ url, html: await fetchHtmlWithRetry(url) }))
          );

          for (const settled of batchResults) {
            if (settled.status === 'fulfilled') {
              pages.push(settled.value);
            } else {
              pages.push({ url: batch[batchResults.indexOf(settled)] ?? 'unknown', html: null });
            }
          }

          if (i + FETCH_BATCH_SIZE < filteredUrls.length) {
            await new Promise(r => setTimeout(r, FETCH_BATCH_DELAY_MS));
          }
        }

        // --- Phase 2: send pre-fetched HTML to edge function for analysis only ---
        const body: Record<string, any> = {
          crawl_id: crawlId,
          pages,
        };
        if (managedBlockId.trim()) body.managedBlockId = managedBlockId.trim();
        if (legitFaqUrls.length > 0) body.legitFaqUrls = legitFaqUrls;
        if (deprecatedPathFragments.length > 0) body.deprecatedPathFragments = deprecatedPathFragments;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-schema-orphans`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error('Analysis failed');
        }

        const data = await response.json();
        const newResults: OrphanResult[] = data.results || [];
        setResults(newResults);
        onResultsChange?.(newResults);
      } catch (err) {
        console.error('Schema orphan detection error:', err);
        alert('Failed to detect schema orphans. Please try again.');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    const getTimestamp = () =>
      new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    const exportToCSV = () => {
      if (results.length === 0) return;

      const headers = ['URL', 'Block Count', 'Verdict', 'Orphan Flags'];
      let csv = headers.join(',') + '\n';

      results.forEach(r => {
        const values = [
          r.url,
          String(r.blockCount),
          r.verdict,
          r.orphanFlags.join('|'),
        ].map(v => `"${v}"`);
        csv += values.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${domain}-schema-orphans-${getTimestamp()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    const exportToXLSX = () => {
      if (results.length === 0) return;

      const HEADER_FILL = '1F2A44';
      const HEADER_FONT = 'FFFFFF';
      const CLEAN_FILL = 'C6EFCE';
      const CLEAN_FONT = '006100';
      const REVIEW_FILL = 'FFEB9C';
      const REVIEW_FONT = '9C6500';
      const CLEANUP_FILL = 'FFC7CE';
      const CLEANUP_FONT = '9C0006';
      const CHILD_FILL = 'F2F2F2';
      const CHILD_FONT = '000000';

      const colKeys = ['A', 'B', 'C', 'D', 'E', 'F'];

      const headerRow = [
        makeCell('URL / Block', true, HEADER_FILL, HEADER_FONT),
        makeCell('Blocks', true, HEADER_FILL, HEADER_FONT),
        makeCell('Verdict', true, HEADER_FILL, HEADER_FONT),
        makeCell('Block ID', true, HEADER_FILL, HEADER_FONT),
        makeCell('Types', true, HEADER_FILL, HEADER_FONT),
        makeCell('Flags', true, HEADER_FILL, HEADER_FONT),
      ];

      const sheetData: any[][] = [headerRow];

      const ordered = sortedResults(results);

      for (const result of ordered) {
        const verdict = result.verdict as string;
        let fillHex = CHILD_FILL;
        let fontHex = CHILD_FONT;
        if (verdict === 'CLEAN') { fillHex = CLEAN_FILL; fontHex = CLEAN_FONT; }
        else if (verdict === 'REVIEW') { fillHex = REVIEW_FILL; fontHex = REVIEW_FONT; }
        else if (verdict === 'CLEANUP') { fillHex = CLEANUP_FILL; fontHex = CLEANUP_FONT; }

        const flagLabel = result.orphanFlags
          .map(f => FLAG_LABELS[f] ?? f)
          .join(' | ');

        // Parent row
        const parentRow = [
          makeCell(result.url, true, fillHex, fontHex),
          makeCell(result.blockCount, true, fillHex, fontHex),
          makeCell(result.verdict, true, fillHex, fontHex),
          makeCell('', true, fillHex, fontHex),
          makeCell('', true, fillHex, fontHex),
          makeCell(flagLabel, true, fillHex, fontHex),
        ];
        sheetData.push(parentRow);

        // Child rows (one per block)
        for (const block of result.blocks) {
          const isOffendingBlock =
            verdict === 'CLEANUP' && (!block.id || block.id === '');

          const idCell = isOffendingBlock
            ? makeChildCell(block.id ?? '(none)', CLEANUP_FILL, true, CLEANUP_FONT)
            : makeChildCell(block.id ?? '(none)', CHILD_FILL);

          const childRow = [
            makeChildCell(`    \u21B3 Block #${block.index + 1}`, CHILD_FILL),
            makeChildCell('', CHILD_FILL),
            makeChildCell('', CHILD_FILL),
            idCell,
            makeChildCell(block.types.join(', '), CHILD_FILL),
            makeChildCell('', CHILD_FILL),
          ];
          sheetData.push(childRow);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Column widths
      ws['!cols'] = [
        { wch: 55 },
        { wch: 8 },
        { wch: 12 },
        { wch: 20 },
        { wch: 45 },
        { wch: 30 },
      ];

      // Freeze header row
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      // Apply cell styles from sheetData (xlsx-js-style reads .s from each cell object)
      sheetData.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
          if (ws[addr]) {
            ws[addr].s = cell.s;
          }
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Schema Audit');

      // Use manual Blob download — more reliable than XLSX.writeFile in Vite/ESM builds
      const wbout: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${domain}-schema-orphans-${getTimestamp()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    };

    useImperativeHandle(ref, () => ({
      runAnalysis,
      getResults: () => results,
      isLoading: () => loading,
      exportToCSV,
      exportToXLSX,
    }));

    const toggleExpand = (url: string) => {
      setExpandedUrls(prev => {
        const next = new Set(prev);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        return next;
      });
    };

    const totalPages = results.length;
    const cleanCount = results.filter(r => r.verdict === 'CLEAN').length;
    const reviewCount = results.filter(r => r.verdict === 'REVIEW').length;
    const cleanupCount = results.filter(r => r.verdict === 'CLEANUP').length;
    const errorCount = results.filter(r => r.verdict === 'ERROR' || r.verdict === 'SKIPPED').length;

    const displayedResults = showIssuesOnly
      ? results.filter(r => r.verdict !== 'CLEAN')
      : results;

    const verdictBadge = (verdict: string) => {
      if (verdict === 'CLEAN') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
            <Check className="w-3 h-3" /> CLEAN
          </span>
        );
      }
      if (verdict === 'REVIEW') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
            <AlertTriangle className="w-3 h-3" /> REVIEW
          </span>
        );
      }
      if (verdict === 'CLEANUP') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" /> CLEANUP
          </span>
        );
      }
      if (verdict === 'ERROR') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
            <AlertCircle className="w-3 h-3" /> FETCH ERROR
          </span>
        );
      }
      if (verdict === 'SKIPPED') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
            <AlertCircle className="w-3 h-3" /> SKIPPED
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
          {verdict}
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
            <span>Configuration (optional)</span>
            {configOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {configOpen && (
            <div className="p-4 space-y-4 bg-white">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Managed block id
                </label>
                <input
                  type="text"
                  placeholder="e.g. sharpen-schema"
                  value={managedBlockId}
                  onChange={e => setManagedBlockId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The id= attribute on your canonical JSON-LD script tag. Blocks with a different id will be flagged as duplicates.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Legit FAQ URLs (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={'https://example.com/faq\nhttps://example.com/help'}
                  value={legitFaqUrlsText}
                  onChange={e => setLegitFaqUrlsText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
                <p className="mt-1 text-xs text-gray-500">
                  FAQPage blocks found on any other URL will be flagged as STRAY_FAQPAGE.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Deprecated path fragments (comma-separated)
                </label>
                <input
                  type="text"
                  value={deprecatedFragmentsText}
                  onChange={e => setDeprecatedFragmentsText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Any JSON-LD block containing these strings will be flagged as DEPRECATED_PATH.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Summary cards + export buttons */}
        {results.length > 0 && (
          <>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{totalPages}</div>
                <div className="text-sm text-gray-600">Total Pages</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{cleanCount}</div>
                <div className="text-sm text-green-600">Clean</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{reviewCount}</div>
                <div className="text-sm text-yellow-600">Review</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">{cleanupCount}</div>
                <div className="text-sm text-red-600">Needs Cleanup</div>
              </div>
              {errorCount > 0 && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700">{errorCount}</div>
                  <div className="text-sm text-orange-600">Fetch Errors</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="show-issues-only"
                  type="checkbox"
                  checked={showIssuesOnly}
                  onChange={e => setShowIssuesOnly(e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded"
                />
                <label htmlFor="show-issues-only" className="text-sm text-gray-700 cursor-pointer">
                  Show only issues
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button
                  onClick={exportToXLSX}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export XLSX
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">URL</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Blocks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Detected Types</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedResults.map((result, idx) => {
                      const isExpanded = expandedUrls.has(result.url);
                      const allTypes = [...new Set(result.blocks.flatMap(b => b.types))];
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
                            <td className="px-4 py-3 text-sm text-gray-900">
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
                              <span className={result.blockCount > 1 ? 'font-bold text-red-600' : 'text-gray-700'}>
                                {result.blockCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {allTypes.length === 0 ? (
                                <span className="text-gray-400">None detected</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {allTypes.map((t, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {verdictBadge(result.verdict)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${idx}-expanded`}>
                              <td colSpan={5} className="px-4 py-4 bg-gray-50">
                                <div className="space-y-3">
                                  {result.orphanFlags.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-2">Flags detected:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {result.orphanFlags.map((flag, fi) => (
                                          <span
                                            key={fi}
                                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium border border-red-200"
                                          >
                                            {FLAG_LABELS[flag] ?? flag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {result.blocks.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-2">JSON-LD blocks on this page:</p>
                                      <div className="space-y-2">
                                        {result.blocks.map((block, bi) => (
                                          <div key={bi} className="bg-white border border-gray-200 rounded p-3 text-xs">
                                            <div className="flex items-center gap-3 flex-wrap">
                                              <span className="text-gray-500">Block #{block.index + 1}</span>
                                              <span className="text-gray-500">
                                                id: <span className="font-mono text-gray-800">{block.id ?? '(none)'}</span>
                                              </span>
                                              {block.types.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {block.types.map((t, ti) => (
                                                    <span key={ti} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono">
                                                      {t}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
              Click "Run Analysis" to detect duplicate and orphan JSON-LD blocks across the site
            </p>
          </div>
        )}
      </div>
    );
  }
);

SchemaOrphanDetector.displayName = 'SchemaOrphanDetector';
