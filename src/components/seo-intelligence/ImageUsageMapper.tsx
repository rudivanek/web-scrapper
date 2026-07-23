import { forwardRef, useImperativeHandle, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Copy, ExternalLink } from 'lucide-react';

interface PageImageInfo {
  url: string;
  alt?: string;
}

interface ImageUsageRecord {
  src: string;
  uses: number;
  uniqueAlts: number;
  pages: PageImageInfo[];
  domain: string;
}

export interface ImageUsageMapperRef {
  runAnalysis: () => Promise<void>;
  exportToCSV: () => void;
}

interface ImageUsageMapperProps {
  crawlId: string;
  urls: string[];
  domain?: string;
}

export const ImageUsageMapper = forwardRef<ImageUsageMapperRef, ImageUsageMapperProps>(
  ({ crawlId, urls, domain = 'analysis' }, ref) => {
    const [results, setResults] = useState<ImageUsageRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const runAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(
          `${supabaseUrl}/functions/v1/analyze-image-usage`,
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
          throw new Error(`Failed to analyze image usage: ${response.statusText}`);
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

    const toggleExpanded = (src: string) => {
      const newExpanded = new Set(expandedImages);
      if (newExpanded.has(src)) {
        newExpanded.delete(src);
      } else {
        newExpanded.add(src);
      }
      setExpandedImages(newExpanded);
    };

    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedUrl(text);
        setTimeout(() => setCopiedUrl(null), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    const exportCSV = () => {
      const rows: string[][] = [
        ['Image URL', 'Total Uses', 'Unique Alt Texts', 'Domain', 'Page URL', 'Alt Text'],
      ];

      results.forEach((record) => {
        record.pages.forEach((page, idx) => {
          rows.push([
            idx === 0 ? record.src : '',
            idx === 0 ? record.uses.toString() : '',
            idx === 0 ? record.uniqueAlts.toString() : '',
            idx === 0 ? record.domain : '',
            page.url,
            page.alt || '',
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
      link.download = `${domain}-image-usage-${timestamp}.csv`;
      link.click();
    };

    const exportImageUrls = () => {
      const urls = results.map(r => r.src).join('\n');
      const blob = new Blob([urls], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const timestamp2 = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `${domain}-image-urls-${timestamp2}.txt`;
      link.click();
    };

    // Calculate summary statistics
    const totalUniqueImages = results.length;
    const totalReferences = results.reduce((sum, r) => sum + r.uses, 0);
    const duplicatedImages = results.filter(r => r.uses > 1).length;
    const singleUseImages = results.filter(r => r.uses === 1).length;

    // Apply filters
    let filteredResults = results;

    if (showDuplicatesOnly) {
      filteredResults = filteredResults.filter(r => r.uses > 1);
    }

    if (searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase();
      filteredResults = filteredResults.filter(r => {
        const srcMatch = r.src.toLowerCase().includes(term);
        const altMatch = r.pages.some(p => p.alt?.toLowerCase().includes(term));
        return srcMatch || altMatch;
      });
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-neutral-600">Analyzing image usage...</span>
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
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-neutral-600">Unique Images</div>
              <div className="text-2xl font-bold text-neutral-900">{totalUniqueImages}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Total References</div>
              <div className="text-2xl font-bold text-neutral-900">{totalReferences}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Duplicated</div>
              <div className="text-2xl font-bold text-orange-600">{duplicatedImages}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600">Single-Use</div>
              <div className="text-2xl font-bold text-green-600">{singleUseImages}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by filename or alt text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showDuplicatesOnly
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {showDuplicatesOnly ? 'Show All' : 'Duplicates Only'}
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={exportImageUrls}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export URLs
          </button>
        </div>

        {/* Results Table */}
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Total Uses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Unique Alts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredResults.map((record) => {
                const isExpanded = expandedImages.has(record.src);
                const filename = record.src.split('/').pop() || 'unknown';

                return (
                  <>
                    <tr
                      key={record.src}
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={() => toggleExpanded(record.src)}
                    >
                      <td className="px-4 py-4">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <a
                            href={record.src}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            <img
                              src={record.src}
                              alt={filename}
                              className="w-12 h-12 object-cover rounded border border-neutral-300 hover:opacity-80 transition-opacity"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'w-12 h-12 bg-neutral-200 rounded border border-neutral-300 flex items-center justify-center';
                                  const icon = document.createElement('div');
                                  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
                                  placeholder.appendChild(icon);
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                          </a>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-neutral-900 truncate">
                              {filename}
                            </div>
                            <a
                              href={record.src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {record.src}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.uses > 1
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {record.uses}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {record.uniqueAlts}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {record.domain}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(record.src);
                            }}
                            className="p-1 text-neutral-600 hover:text-neutral-900 transition-colors"
                            title="Copy URL"
                          >
                            {copiedUrl === record.src ? (
                              <span className="text-green-600 text-xs font-medium">Copied!</span>
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={record.src}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-neutral-600 hover:text-neutral-900 transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-neutral-50">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-neutral-900">
                              Used on {record.pages.length} page{record.pages.length !== 1 ? 's' : ''}:
                            </h4>
                            <div className="space-y-2">
                              {record.pages.map((page, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 p-3 bg-white border border-neutral-200 rounded"
                                >
                                  <div className="flex-shrink-0 text-neutral-400">•</div>
                                  <div className="flex-1 min-w-0">
                                    <a
                                      href={page.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline block truncate"
                                    >
                                      {page.url}
                                    </a>
                                    {page.alt && (
                                      <div className="text-xs text-neutral-600 mt-1">
                                        <span className="font-semibold">Alt:</span> "{page.alt}"
                                      </div>
                                    )}
                                    {!page.alt && (
                                      <div className="text-xs text-orange-600 mt-1">
                                        ⚠️ Missing alt text
                                      </div>
                                    )}
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

        {filteredResults.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            No images match your filters.
          </div>
        )}
      </div>
    );
  }
);

ImageUsageMapper.displayName = 'ImageUsageMapper';
