import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Download, Filter } from 'lucide-react';

interface ImageValidation {
  status: number;
  type?: string;
  sizeKB?: number;
  width?: number;
  height?: number;
  valid: boolean;
}

interface OGData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  site_name?: string;
  missing: string[];
  score: number;
}

interface TwitterData {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  missing: string[];
  score: number;
}

interface SocialMetaResult {
  url: string;
  og: OGData;
  twitter: TwitterData;
  overall_score: number;
  imageValidation?: {
    og?: ImageValidation;
    twitter?: ImageValidation;
  };
}

interface SocialMetaCheckerProps {
  crawlId: string;
  urls: string[];
  domain?: string;
}

export interface SocialMetaCheckerRef {
  runAnalysis: () => Promise<void>;
  exportToCSV: () => void;
}

const SocialMetaChecker = forwardRef<SocialMetaCheckerRef, SocialMetaCheckerProps>(({ crawlId, urls, domain = 'analysis' }, ref) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SocialMetaResult[]>([]);
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvRows = results.map(result => ({
      url: result.url,
      og_title: result.og.title || '',
      og_description: result.og.description || '',
      og_image: result.og.image || '',
      og_score: result.og.score,
      og_missing: result.og.missing.join('; '),
      twitter_card: result.twitter.card || '',
      twitter_title: result.twitter.title || '',
      twitter_description: result.twitter.description || '',
      twitter_image: result.twitter.image || '',
      twitter_score: result.twitter.score,
      twitter_missing: result.twitter.missing.join('; '),
      overall_score: result.overall_score
    }));

    const headers = ['URL', 'OG Title', 'OG Description', 'OG Image', 'OG Score', 'OG Missing', 'Twitter Card', 'Twitter Title', 'Twitter Description', 'Twitter Image', 'Twitter Score', 'Twitter Missing', 'Overall Score'];
    let csv = headers.join(',') + '\n';

    csvRows.forEach(row => {
      const values = [
        row.url,
        row.og_title,
        row.og_description,
        row.og_image,
        row.og_score,
        row.og_missing,
        row.twitter_card,
        row.twitter_title,
        row.twitter_description,
        row.twitter_image,
        row.twitter_score,
        row.twitter_missing,
        row.overall_score
      ].map(val => `"${val}"`);
      csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `${domain}-social-meta-${timestamp}.csv`;
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
        `${supabaseUrl}/rest/v1/seo_intelligence_results?crawl_id=eq.${crawlId}&module=eq.social_meta_checker&select=*`,
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
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-social-meta`, {
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

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (missing: string[], score: number) => {
    if (missing.includes('all') || score === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Missing All
        </span>
      );
    }

    if (missing.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <AlertCircle className="w-3 h-3" />
        Partial
      </span>
    );
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const getImageValidationBadge = (validation?: ImageValidation, hasImage?: boolean) => {
    if (!hasImage) {
      return (
        <span className="text-xs text-gray-400">No image</span>
      );
    }
    if (!validation) {
      return (
        <span className="text-xs text-gray-400">Not checked</span>
      );
    }
    if (validation.valid) {
      return (
        <span className="text-xs text-green-600 font-medium">
          ✓ Valid {validation.sizeKB ? `(${validation.sizeKB} KB)` : ''}
        </span>
      );
    }
    if (validation.status === 404) {
      return (
        <span className="text-xs text-red-600 font-medium">⛔ Not Found (404)</span>
      );
    }
    if (validation.status === 0) {
      return (
        <span className="text-xs text-red-600 font-medium">⛔ Failed to load</span>
      );
    }
    return (
      <span className="text-xs text-yellow-600 font-medium">⚠️ Invalid ({validation.status})</span>
    );
  };

  const filteredResults = showOnlyMissing
    ? results.filter(r => r.og.missing.length > 0 || r.twitter.missing.length > 0)
    : results;

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.overall_score, 0) / results.length)
    : 0;

  const completePages = results.filter(r => r.og.missing.length === 0 && r.twitter.missing.length === 0).length;
  const missingPages = results.filter(r => r.og.missing.length > 0 || r.twitter.missing.length > 0).length;
  const validImages = results.filter(r => r.imageValidation?.og?.valid || r.imageValidation?.twitter?.valid).length;
  const brokenImages = results.filter(r =>
    (r.og.image && r.imageValidation?.og && !r.imageValidation.og.valid) ||
    (r.twitter.image && r.imageValidation?.twitter && !r.imageValidation.twitter.valid)
  ).length;
  const missingImages = results.filter(r => r.og.missing.includes('og:image') && r.twitter.missing.includes('twitter:image')).length;

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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Pages Scanned</p>
                  <p className="text-2xl font-bold text-gray-900">{results.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Complete Pages</p>
                  <p className="text-2xl font-bold text-green-600">{completePages}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Missing Previews</p>
                  <p className="text-2xl font-bold text-yellow-600">{missingPages}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valid Images</p>
                  <p className="text-2xl font-bold text-green-600">{validImages}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Broken Images</p>
                  <p className="text-2xl font-bold text-red-600">{brokenImages}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Missing Images</p>
                  <p className="text-2xl font-bold text-gray-500">{missingImages}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg. Score</p>
                  <p className="text-2xl font-bold text-blue-600">{avgScore}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                  className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                    showOnlyMissing
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Show Only Missing
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-3 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {filteredResults.map((result, index) => {
              const previewImage = result.og.image || result.twitter.image;
              const previewTitle = result.og.title || result.twitter.title || 'No Title';
              const previewDescription = result.og.description || result.twitter.description || 'No Description';
              const previewSiteName = result.og.site_name || getHostname(result.url);

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm font-medium block mb-2"
                      >
                        {result.url}
                      </a>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          OG: {getStatusBadge(result.og.missing, result.og.score)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          Twitter: {getStatusBadge(result.twitter.missing, result.twitter.score)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              result.overall_score >= 80
                                ? 'bg-green-500'
                                : result.overall_score >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${result.overall_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{result.overall_score}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Social Preview</h4>
                      <div className="border rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex items-start gap-3">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt="Preview"
                              className="w-24 h-24 object-cover rounded border flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"%3E%3Crect width="96" height="96" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-200 rounded border flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-gray-400">No Image</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold line-clamp-2 text-gray-900 mb-1">{previewTitle}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{previewDescription}</p>
                            <span className="text-[10px] text-gray-400 uppercase">{previewSiteName}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Image Validation</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-gray-600 w-32 flex-shrink-0">🖼️ OG Image:</span>
                          <div className="flex-1">
                            {getImageValidationBadge(result.imageValidation?.og, !!result.og.image)}
                            {result.og.image && (
                              <a href={result.og.image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline ml-2">
                                Open
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-gray-600 w-32 flex-shrink-0">🐦 Twitter Image:</span>
                          <div className="flex-1">
                            {getImageValidationBadge(result.imageValidation?.twitter, !!result.twitter.image)}
                            {result.twitter.image && result.twitter.image !== result.og.image && (
                              <a href={result.twitter.image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline ml-2">
                                Open
                              </a>
                            )}
                            {result.twitter.image === result.og.image && result.og.image && (
                              <span className="text-xs text-gray-400 ml-2">(same as OG)</span>
                            )}
                          </div>
                        </div>

                        {(result.og.missing.length > 0 || result.twitter.missing.length > 0) && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            {result.og.missing.length > 0 && (
                              <div className="text-xs text-gray-500 mb-1">
                                <strong>Missing OG:</strong> {result.og.missing.join(', ')}
                              </div>
                            )}
                            {result.twitter.missing.length > 0 && (
                              <div className="text-xs text-gray-500">
                                <strong>Missing Twitter:</strong> {result.twitter.missing.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredResults.length === 0 && showOnlyMissing && (
            <div className="text-center py-8 text-gray-500">
              <p>No pages with missing tags found. All pages have complete social meta tags!</p>
            </div>
          )}
        </>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>Click "Run Analysis" to check Open Graph and Twitter Card tags for your selected URLs.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Analyzing social meta tags and validating images...</p>
        </div>
      )}
    </div>
  );
});

SocialMetaChecker.displayName = 'SocialMetaChecker';

export default SocialMetaChecker;
