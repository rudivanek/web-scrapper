import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronRight, Download } from 'lucide-react';

interface HreflangLink {
  lang: string;
  url: string;
  reciprocal: boolean;
}

interface PaginationData {
  next?: string;
  prev?: string;
  nextValid?: boolean;
  prevValid?: boolean;
}

interface PaginationHreflangResult {
  url: string;
  pagination?: PaginationData;
  hreflang?: HreflangLink[];
  score: number;
}

interface PaginationHreflangValidatorProps {
  crawlId: string;
  urls: string[];
  domain?: string;
}

export interface PaginationHreflangValidatorRef {
  runAnalysis: () => Promise<void>;
  exportToCSV: () => void;
}

const PaginationHreflangValidator = forwardRef<PaginationHreflangValidatorRef, PaginationHreflangValidatorProps>(({ crawlId, urls, domain = 'analysis' }, ref) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PaginationHreflangResult[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvRows = results.map(result => ({
      url: result.url,
      pagination_next: result.pagination?.next || '',
      pagination_prev: result.pagination?.prev || '',
      pagination_next_valid: result.pagination?.nextValid ? 'Yes' : 'No',
      pagination_prev_valid: result.pagination?.prevValid ? 'Yes' : 'No',
      hreflang_count: result.hreflang?.length || 0,
      hreflang_langs: result.hreflang?.map(h => h.lang).join('; ') || '',
      hreflang_reciprocal: result.hreflang?.every(h => h.reciprocal) ? 'Yes' : 'No',
      score: result.score
    }));

    const headers = ['URL', 'Pagination Next', 'Pagination Prev', 'Next Valid', 'Prev Valid', 'Hreflang Count', 'Hreflang Langs', 'Hreflang Reciprocal', 'Score'];
    let csv = headers.join(',') + '\n';

    csvRows.forEach(row => {
      const values = [
        row.url,
        row.pagination_next,
        row.pagination_prev,
        row.pagination_next_valid,
        row.pagination_prev_valid,
        row.hreflang_count,
        row.hreflang_langs,
        row.hreflang_reciprocal,
        row.score
      ].map(val => `"${val}"`);
      csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `${domain}-pagination-hreflang-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  useImperativeHandle(ref, () => ({
    runAnalysis,
    exportToCSV,
  }));

  useEffect(() => {
    loadSavedResults();
  }, [crawlId]);

  const loadSavedResults = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/seo_intelligence_results?crawl_id=eq.${crawlId}&module=eq.pagination_hreflang_validator&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0 && data[0].data?.results) {
          setResults(data[0].data.results);
        }
      }
    } catch (err) {
      console.error('Failed to load saved results:', err);
    }
  };

  const runAnalysis = async () => {
    console.log('PaginationHreflangValidator: runAnalysis called', { crawlId, urls: urls.length });

    if (!crawlId) {
      setError('No crawl ID provided');
      return;
    }

    if (!urls || urls.length === 0) {
      setError('No URLs provided for analysis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('PaginationHreflangValidator: Making API request', {
        url: `${supabaseUrl}/functions/v1/analyze-pagination-hreflang`,
        crawlId,
        urlCount: urls.length
      });

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-pagination-hreflang`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          crawl_id: crawlId,
          urls: urls,
        }),
      });

      console.log('PaginationHreflangValidator: API response', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('PaginationHreflangValidator: API error', errorData);
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      console.log('PaginationHreflangValidator: Results received', { resultCount: data.results?.length });
      setResults(data.results);
    } catch (err) {
      console.error('PaginationHreflangValidator: Error', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getPaginationBadge = (link?: string, valid?: boolean) => {
    if (!link) {
      return <span className="text-xs text-gray-400">—</span>;
    }
    if (valid) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          Valid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <XCircle className="w-3 h-3" />
        Broken
      </span>
    );
  };

  const getHreflangStatusBadge = (count: number, reciprocalCount: number) => {
    if (count === 0) {
      return <span className="text-xs text-gray-400">None</span>;
    }
    if (reciprocalCount === count) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          {count} ({reciprocalCount} reciprocal)
        </span>
      );
    }
    if (reciprocalCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
          <AlertCircle className="w-3 h-3" />
          {count} ({reciprocalCount} reciprocal)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <XCircle className="w-3 h-3" />
        {count} (0 reciprocal)
      </span>
    );
  };

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  const paginationOk = results.filter(r =>
    (r.pagination?.next && r.pagination.nextValid) ||
    (r.pagination?.prev && r.pagination.prevValid)
  ).length;

  const hreflangValid = results.filter(r => r.hreflang && r.hreflang.length > 0).length;

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Pages Scanned</p>
                  <p className="text-2xl font-bold text-gray-900">{results.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pagination OK</p>
                  <p className="text-2xl font-bold text-green-600">{paginationOk}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">hreflang Valid</p>
                  <p className="text-2xl font-bold text-blue-600">{hreflangValid}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg. Intl Score</p>
                  <p className="text-2xl font-bold text-purple-600">{avgScore}</p>
                </div>
              </div>
              <button
                onClick={exportToCSV}
                className="px-3 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">rel=next</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">rel=prev</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">hreflang</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((result, index) => {
                  const isExpanded = expandedRows.has(index);
                  const reciprocalCount = result.hreflang?.filter(h => h.reciprocal).length || 0;

                  return (
                    <>
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          {result.hreflang && result.hreflang.length > 0 && (
                            <button
                              onClick={() => toggleRow(index)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {result.url}
                          </a>
                        </td>
                        <td className="px-4 py-4">
                          {getPaginationBadge(result.pagination?.next, result.pagination?.nextValid)}
                          {result.pagination?.next && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {result.pagination.next}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getPaginationBadge(result.pagination?.prev, result.pagination?.prevValid)}
                          {result.pagination?.prev && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {result.pagination.prev}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {getHreflangStatusBadge(result.hreflang?.length || 0, reciprocalCount)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  result.score >= 80
                                    ? 'bg-green-500'
                                    : result.score >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${result.score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{result.score}</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && result.hreflang && result.hreflang.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-gray-50">
                            <div className="ml-8">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">hreflang Links</h4>
                              <div className="space-y-2">
                                {result.hreflang.map((link, linkIndex) => (
                                  <div key={linkIndex} className="flex items-center gap-3 text-sm">
                                    <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                                      {link.lang}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex-1 truncate"
                                    >
                                      {link.url}
                                    </a>
                                    {link.reciprocal ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Reciprocal
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                                        <AlertCircle className="w-3 h-3" />
                                        Missing reciprocal
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
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
        </>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>Click "Run Analysis" to validate pagination links and hreflang tags for your selected URLs.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Analyzing pagination and hreflang tags...</p>
        </div>
      )}
    </div>
  );
});

PaginationHreflangValidator.displayName = 'PaginationHreflangValidator';

export default PaginationHreflangValidator;
