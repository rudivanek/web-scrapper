import { forwardRef, useImperativeHandle, useState } from 'react';
import { ChevronDown, ChevronUp, Download, AlertCircle, CheckCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface ImageData {
  src: string;
  alt?: string;
  filename: string;
  type?: string;
  sizeKB?: number;
  status?: number;
  score: number;
  issues?: string[];
}

interface ImageAnalyzerResult {
  url: string;
  images: ImageData[];
  pageScore: number;
}

export interface ImageAnalyzerRef {
  runAnalysis: () => Promise<void>;
  exportToCSV: () => void;
}

interface ImageAnalyzerProps {
  crawlId: string;
  urls: string[];
  domain?: string;
}

export const ImageAnalyzer = forwardRef<ImageAnalyzerRef, ImageAnalyzerProps>(
  ({ crawlId, urls, domain = 'analysis' }, ref) => {
    const [results, setResults] = useState<ImageAnalyzerResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);

    const runAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${supabaseUrl}/functions/v1/analyze-images`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              crawl_id: crawlId,
              urls: urls,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to analyze images: ${response.statusText}`);
        }

        const data = await response.json();
        setResults(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      runAnalysis,
      exportToCSV: exportCSV,
    }));

    const toggleExpanded = (url: string) => {
      const newExpanded = new Set(expandedUrls);
      if (newExpanded.has(url)) {
        newExpanded.delete(url);
      } else {
        newExpanded.add(url);
      }
      setExpandedUrls(newExpanded);
    };

    const exportCSV = () => {
      const rows: string[][] = [
        ['URL', 'Image Source', 'Alt Text', 'Filename', 'Type', 'Size (KB)', 'Status', 'Score', 'Issues'],
      ];

      results.forEach((result) => {
        result.images.forEach((image) => {
          rows.push([
            result.url,
            image.src,
            image.alt || '',
            image.filename,
            image.type || '',
            image.sizeKB?.toString() || '',
            image.status?.toString() || '',
            image.score.toString(),
            image.issues?.join('; ') || '',
          ]);
        });
      });

      const csvContent = rows.map(row =>
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `${domain}-image-analysis-${timestamp}.csv`;
      link.click();
    };

    // Calculate summary statistics
    const totalPages = results.length;
    const totalImages = results.reduce((sum, r) => sum + r.images.length, 0);
    const missingAlt = results.reduce(
      (sum, r) => sum + r.images.filter(img => !img.alt || img.alt.trim().length === 0).length,
      0
    );
    const brokenImages = results.reduce(
      (sum, r) => sum + r.images.filter(img => img.status === 0 || (img.status && img.status >= 400)).length,
      0
    );
    const avgScore = totalPages > 0
      ? Math.round(results.reduce((sum, r) => sum + r.pageScore, 0) / totalPages)
      : 0;
    const avgSize = totalImages > 0
      ? Math.round(
          results.reduce(
            (sum, r) => sum + r.images.reduce((s, img) => s + (img.sizeKB || 0), 0),
            0
          ) / totalImages
        )
      : 0;

    const filteredResults = showOnlyIssues
      ? results.filter(r => r.images.some(img => img.issues && img.issues.length > 0))
      : results;

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-neutral-600">Analyzing images...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="text-center py-8 text-neutral-500">
          No analysis results yet. Click "Run Analysis" to start.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Summary Header */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-neutral-600">Pages</div>
              <div className="text-2xl font-bold text-neutral-900">{totalPages}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Images</div>
              <div className="text-2xl font-bold text-neutral-900">{totalImages}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Missing Alt</div>
              <div className="text-2xl font-bold text-orange-600">{missingAlt}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Broken</div>
              <div className="text-2xl font-bold text-red-600">{brokenImages}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Avg. Score</div>
              <div className="text-2xl font-bold text-green-600">{avgScore}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-neutral-600">
            Average Size: <span className="font-semibold text-neutral-900">{avgSize} KB</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowOnlyIssues(!showOnlyIssues)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showOnlyIssues
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {showOnlyIssues ? 'Show All' : 'Show Only Issues'}
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Results Table */}
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Total Images
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Missing Alt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Broken
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Avg. Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Page Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredResults.map((result) => {
                const isExpanded = expandedUrls.has(result.url);
                const missingAltCount = result.images.filter(
                  img => !img.alt || img.alt.trim().length === 0
                ).length;
                const brokenCount = result.images.filter(
                  img => img.status === 0 || (img.status && img.status >= 400)
                ).length;
                const avgImgSize = result.images.length > 0
                  ? Math.round(
                      result.images.reduce((sum, img) => sum + (img.sizeKB || 0), 0) / result.images.length
                    )
                  : 0;

                return (
                  <>
                    <tr
                      key={result.url}
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={() => toggleExpanded(result.url)}
                    >
                      <td className="px-4 py-4">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-600 hover:underline">
                        {result.url}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {result.images.length}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={missingAltCount > 0 ? 'text-orange-600 font-semibold' : 'text-neutral-900'}>
                          {missingAltCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={brokenCount > 0 ? 'text-red-600 font-semibold' : 'text-neutral-900'}>
                          {brokenCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {avgImgSize} KB
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-neutral-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className={`h-2 rounded-full ${
                                result.pageScore >= 80
                                  ? 'bg-green-500'
                                  : result.pageScore >= 60
                                  ? 'bg-yellow-400'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${result.pageScore}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold">{result.pageScore}</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-neutral-50">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-neutral-900 mb-3">
                              Image Details ({result.images.length})
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                              {result.images.map((image, idx) => (
                                <div
                                  key={idx}
                                  className="border border-neutral-200 rounded-lg p-4 bg-white"
                                >
                                  <div className="flex gap-4">
                                    {/* Thumbnail */}
                                    <div className="flex-shrink-0">
                                      {image.status === 200 ? (
                                        <a
                                          href={image.src}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <img
                                            src={image.src}
                                            alt={image.alt || 'Preview'}
                                            className="w-16 h-16 object-cover rounded border border-neutral-300 cursor-pointer hover:opacity-80 transition-opacity"
                                            loading="lazy"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpath d="M21 15l-5-5L5 21"/%3E%3C/svg%3E';
                                            }}
                                          />
                                        </a>
                                      ) : (
                                        <div className="w-16 h-16 bg-neutral-200 rounded border border-neutral-300 flex items-center justify-center">
                                          <ImageIcon className="w-8 h-8 text-neutral-400" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-neutral-900 truncate">
                                        {image.filename}
                                      </div>
                                      <div className="text-xs text-neutral-500 mt-1">
                                        {image.type || 'Unknown type'} | {image.sizeKB || '?'} KB
                                        {image.status && (
                                          <span className="ml-2">
                                            | Status: {image.status}
                                          </span>
                                        )}
                                      </div>
                                      {image.alt && (
                                        <div className="text-xs text-neutral-600 mt-2">
                                          <span className="font-semibold">Alt:</span> "{image.alt}"
                                        </div>
                                      )}
                                      <a
                                        href={image.src}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline mt-1 truncate block"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {image.src}
                                      </a>

                                      {/* Issues */}
                                      {image.issues && image.issues.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {image.issues.map((issue, i) => (
                                            <span
                                              key={i}
                                              className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded"
                                            >
                                              <AlertTriangle className="w-3 h-3" />
                                              {issue}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {/* Score */}
                                      <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs text-neutral-600">Score:</span>
                                        <div className="flex-1 bg-neutral-200 rounded-full h-1.5 max-w-[120px]">
                                          <div
                                            className={`h-1.5 rounded-full ${
                                              image.score >= 80
                                                ? 'bg-green-500'
                                                : image.score >= 60
                                                ? 'bg-yellow-400'
                                                : 'bg-red-500'
                                            }`}
                                            style={{ width: `${image.score}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-semibold text-neutral-900">
                                          {image.score}/100
                                        </span>
                                      </div>
                                    </div>

                                    {/* Status Icon */}
                                    <div className="flex-shrink-0">
                                      {image.status === 200 && (!image.issues || image.issues.length === 0) ? (
                                        <CheckCircle className="w-6 h-6 text-green-500" />
                                      ) : image.status === 0 || (image.status && image.status >= 400) ? (
                                        <AlertCircle className="w-6 h-6 text-red-500" />
                                      ) : (
                                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                                      )}
                                    </div>
                                  </div>
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

        {filteredResults.length === 0 && showOnlyIssues && (
          <div className="text-center py-8 text-neutral-500">
            No pages with image issues found.
          </div>
        )}
      </div>
    );
  }
);

ImageAnalyzer.displayName = 'ImageAnalyzer';
