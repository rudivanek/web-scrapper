import { CheckSquare, Square, Eye, Loader2 } from 'lucide-react';

interface SitemapEntry {
  url: string;
  title?: string;
  description?: string;
  status_code?: number;
  indexable?: boolean;
  canonical_url?: string;
  word_count?: number;
  h1_tags?: string[];
  h2_tags?: string[];
  h3_tags?: string[];
  h4_tags?: string[];
  h5_tags?: string[];
  h6_tags?: string[];
  images?: { src: string; alt: string }[];
  links?: { href: string; text: string }[];
  images_without_alt?: number;
  kw_1?: string;
  kw_2?: string;
  kw_3?: string;
  kw_4?: string;
  kw_5?: string;
  kw_6?: string;
  kw_7?: string;
  kw_8?: string;
  kw_9?: string;
  kw_10?: string;
  analyzed?: boolean;
}

interface CrawlResultsTableProps {
  results: SitemapEntry[];
  includeMeta: boolean;
  selectedUrls: Set<string>;
  analyzingUrls: Set<string>;
  onSelectAll: () => void;
  onSelectUrl: (url: string) => void;
  onAnalyzeUrl: (url: string) => void;
}

export function CrawlResultsTable({
  results,
  includeMeta,
  selectedUrls,
  analyzingUrls,
  onSelectAll,
  onSelectUrl,
  onAnalyzeUrl,
}: CrawlResultsTableProps) {
  const maxH1 = Math.max(0, ...results.map(r => r.h1_tags?.length || 0));
  const maxH2 = Math.max(0, ...results.map(r => r.h2_tags?.length || 0));
  const maxH3 = Math.max(0, ...results.map(r => r.h3_tags?.length || 0));
  const maxH4 = Math.max(0, ...results.map(r => r.h4_tags?.length || 0));
  const maxH5 = Math.max(0, ...results.map(r => r.h5_tags?.length || 0));
  const maxH6 = Math.max(0, ...results.map(r => r.h6_tags?.length || 0));

  const hasKeywords = results.some(r => r.analyzed && (r.kw_1 || r.kw_2 || r.kw_3 || r.kw_4 || r.kw_5 || r.kw_6 || r.kw_7 || r.kw_8 || r.kw_9 || r.kw_10));
  const keywordColumns: number[] = [];
  if (hasKeywords) {
    for (let i = 1; i <= 10; i++) {
      const kwKey = `kw_${i}` as keyof SitemapEntry;
      if (results.some(r => r[kwKey])) {
        keywordColumns.push(i);
      }
    }
  }

  return (
    <div className="overflow-auto border border-gray-300 rounded bg-white mb-8" style={{ maxHeight: 'calc(100vh - 420px)' }}>
      <table className="border-collapse" style={{ fontSize: '11px', fontFamily: 'system-ui, -apple-system, sans-serif', width: 'max-content', minWidth: '100%' }}>
        <thead className="sticky top-0 z-20 bg-gray-100">
          <tr>
            <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ width: '36px', minWidth: '36px' }}>
              <button
                onClick={onSelectAll}
                className="p-0.5 hover:bg-gray-200 rounded"
                title={selectedUrls.size === results.length ? 'Deselect all' : 'Select all'}
              >
                {selectedUrls.size === results.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-gray-700" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
            </th>
            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 bg-gray-100" style={{ width: '45px', minWidth: '45px' }}>
              Row
            </th>
            <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '350px' }}>
              Address
            </th>
            {includeMeta && (
              <>
                <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '200px' }}>
                  Title 1
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '250px' }}>
                  Meta Description 1
                </th>
              </>
            )}
            {results.some(r => r.analyzed) && (
              <>
                {results.some(r => r.status_code) && (
                  <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '90px' }}>
                    Status Code
                  </th>
                )}
                {results.some(r => r.indexable !== undefined && r.indexable !== null) && (
                  <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '100px' }}>
                    Indexability
                  </th>
                )}
                {results.some(r => r.canonical_url) && (
                  <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '250px' }}>
                    Canonical Link Element 1
                  </th>
                )}
                {results.some(r => r.word_count) && (
                  <th className="border border-gray-300 px-2 py-1 text-right font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '90px' }}>
                    Word Count
                  </th>
                )}
                {Array.from({ length: maxH1 }, (_, i) => (
                  <th key={`h1-${i}`} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '180px' }}>
                    H1-{i + 1}
                  </th>
                ))}
                {Array.from({ length: maxH2 }, (_, i) => (
                  <th key={`h2-${i}`} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '180px' }}>
                    H2-{i + 1}
                  </th>
                ))}
                {Array.from({ length: maxH3 }, (_, i) => (
                  <th key={`h3-${i}`} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '180px' }}>
                    H3-{i + 1}
                  </th>
                ))}
                {Array.from({ length: maxH4 }, (_, i) => (
                  <th key={`h4-${i}`} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '180px' }}>
                    H4-{i + 1}
                  </th>
                ))}
                {Array.from({ length: maxH5 }, (_, i) => (
                  <th key={`h5-${i}`} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '180px' }}>
                    H5-{i + 1}
                  </th>
                ))}
                {Array.from({ length: maxH6 }, (_, i) => (
                  <th key={`h6-${i}`} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '180px' }}>
                    H6-{i + 1}
                  </th>
                ))}
                {results.some(r => r.images && r.images.length > 0) && (
                  <th className="border border-gray-300 px-2 py-1 text-right font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '70px' }}>
                    Images
                  </th>
                )}
                {results.some(r => r.links && r.links.length > 0) && (
                  <th className="border border-gray-300 px-2 py-1 text-right font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '70px' }}>
                    Links
                  </th>
                )}
                {results.some(r => r.images_without_alt && r.images_without_alt > 0) && (
                  <th className="border border-gray-300 px-2 py-1 text-right font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '110px' }}>
                    Images Missing Alt Text
                  </th>
                )}
                {keywordColumns.map(i => (
                  <th key={`kw-header-${i}`} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '150px' }}>
                    KW-{i}
                  </th>
                ))}
              </>
            )}
            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700 bg-gray-100" style={{ minWidth: '90px' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((entry, index) => (
            <tr key={index} className="hover:bg-gray-50" style={{ height: '22px' }}>
              <td className="border border-gray-300 px-1 py-0.5 bg-white text-center">
                <button
                  onClick={() => onSelectUrl(entry.url)}
                  className="p-0.5 hover:bg-gray-200 rounded"
                >
                  {selectedUrls.has(entry.url) ? (
                    <CheckSquare className="w-3.5 h-3.5 text-gray-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </td>
              <td className="border border-gray-300 px-2 py-0.5 bg-white text-gray-600 text-center">
                {index + 1}
              </td>
              <td className="border border-gray-300 px-2 py-0.5 bg-white">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:underline truncate block"
                  title={entry.url}
                >
                  {entry.url}
                </a>
              </td>
              {includeMeta && (
                <>
                  <td className="border border-gray-300 px-2 py-0.5 bg-white">
                    <div className="text-gray-700 truncate" title={entry.title}>
                      {entry.title || ''}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-0.5 bg-white">
                    <div className="text-gray-600 truncate" title={entry.description}>
                      {entry.description || ''}
                    </div>
                  </td>
                </>
              )}
              {results.some(r => r.analyzed) && (
                <>
                  {results.some(r => r.status_code) && (
                    <td className="border border-gray-300 px-2 py-0.5 bg-white text-center">
                      <span className={`font-medium ${entry.status_code === 200 ? 'text-gray-600' : 'text-gray-600'}`}>
                        {entry.status_code || ''}
                      </span>
                    </td>
                  )}
                  {results.some(r => r.indexable !== undefined && r.indexable !== null) && (
                    <td className="border border-gray-300 px-2 py-0.5 bg-white">
                      <span className={`font-medium ${entry.indexable ? 'text-gray-600' : 'text-gray-600'}`}>
                        {entry.indexable !== null && entry.indexable !== undefined ? (entry.indexable ? 'Indexable' : 'Non-Indexable') : ''}
                      </span>
                    </td>
                  )}
                  {results.some(r => r.canonical_url) && (
                    <td className="border border-gray-300 px-2 py-0.5 bg-white">
                      <div className="text-gray-700 truncate" title={entry.canonical_url}>
                        {entry.canonical_url || ''}
                      </div>
                    </td>
                  )}
                  {results.some(r => r.word_count) && (
                    <td className="border border-gray-300 px-2 py-0.5 bg-white text-right">
                      <span className="text-gray-700">
                        {entry.word_count || 0}
                      </span>
                    </td>
                  )}
                  {Array.from({ length: maxH1 }, (_, i) => (
                    <td key={`h1-${i}`} className="border border-gray-300 px-2 py-0.5 bg-white">
                      <div className="text-gray-700 truncate" title={entry.h1_tags?.[i]}>
                        {entry.h1_tags?.[i] || ''}
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: maxH2 }, (_, i) => (
                    <td key={`h2-${i}`} className="border border-gray-300 px-2 py-0.5 bg-white">
                      <div className="text-gray-700 truncate" title={entry.h2_tags?.[i]}>
                        {entry.h2_tags?.[i] || ''}
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: maxH3 }, (_, i) => (
                    <td key={`h3-${i}`} className="border border-gray-300 px-2 py-0.5 bg-white">
                      <div className="text-gray-700 truncate" title={entry.h3_tags?.[i]}>
                        {entry.h3_tags?.[i] || ''}
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: maxH4 }, (_, i) => (
                    <td key={`h4-${i}`} className="border border-gray-300 px-2 py-0.5 bg-white">
                      <div className="text-gray-700 truncate" title={entry.h4_tags?.[i]}>
                        {entry.h4_tags?.[i] || ''}
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: maxH5 }, (_, i) => (
                    <td key={`h5-${i}`} className="border border-gray-300 px-2 py-0.5 bg-white">
                      <div className="text-gray-700 truncate" title={entry.h5_tags?.[i]}>
                        {entry.h5_tags?.[i] || ''}
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: maxH6 }, (_, i) => (
                    <td key={`h6-${i}`} className="border border-gray-300 px-2 py-0.5 bg-white">
                      <div className="text-gray-700 truncate" title={entry.h6_tags?.[i]}>
                        {entry.h6_tags?.[i] || ''}
                      </div>
                    </td>
                  ))}
                  {results.some(r => r.images && r.images.length > 0) && (
                    <td className="border border-gray-300 px-2 py-0.5 bg-white text-right">
                      <span className="text-gray-700">
                        {entry.images?.length || 0}
                      </span>
                    </td>
                  )}
                  {results.some(r => r.links && r.links.length > 0) && (
                    <td className="border border-gray-300 px-2 py-0.5 bg-white text-right">
                      <span className="text-gray-700">
                        {entry.links?.length || 0}
                      </span>
                    </td>
                  )}
                  {results.some(r => r.images_without_alt && r.images_without_alt > 0) && (
                    <td className="border border-gray-300 px-2 py-0.5 bg-white text-right">
                      <span className="text-gray-700">
                        {entry.images_without_alt || 0}
                      </span>
                    </td>
                  )}
                  {keywordColumns.map(i => {
                    const kwKey = `kw_${i}` as keyof SitemapEntry;
                    const kwValue = entry[kwKey];
                    const displayValue = typeof kwValue === 'string' ? kwValue : '';
                    return (
                      <td key={`kw-${i}-${index}`} className="border border-gray-300 px-2 py-0.5 bg-white">
                        <div className="text-gray-700 truncate" title={displayValue}>
                          {displayValue || ''}
                        </div>
                      </td>
                    );
                  })}
                </>
              )}
              <td className="border border-gray-300 px-1 py-0.5 bg-white">
                <div className="flex items-center justify-center">
                  {analyzingUrls.has(entry.url) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />
                  )}
                  {!entry.analyzed && !analyzingUrls.has(entry.url) && (
                    <button
                      onClick={() => onAnalyzeUrl(entry.url)}
                      className="px-2 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                      style={{ fontSize: '10px' }}
                    >
                      <Eye className="w-3 h-3" />
                      Analyze
                    </button>
                  )}
                  {entry.analyzed && (
                    <span className="text-gray-600 font-bold">✓</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
