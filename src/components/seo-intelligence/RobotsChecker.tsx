import { ExternalLink, FileText, Copy, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useState } from 'react';

interface RobotsCheckResult {
  url: string;
  indexable: boolean;
  reason: string;
  metaRobots?: string;
  robotsDisallowed: boolean;
}

interface ParsedTxtFile {
  userAgents: string[];
  disallows: string[];
  allows: string[];
  sitemaps?: string[];
  policies?: string[];
}

interface TxtFileInfo {
  exists: boolean;
  content: string | null;
  parsed: ParsedTxtFile | null;
  suggested?: string;
}

interface Comparison {
  hasDifferences: boolean;
  differences: string[];
  robotsRulesCount: number;
  llmsRulesCount: number;
}

interface RobotsCheckerResultProps {
  data: {
    pages: RobotsCheckResult[];
    robotsTxt: TxtFileInfo | null;
    llmsTxt: TxtFileInfo | null;
    comparison: Comparison | null;
  } | RobotsCheckResult[];
}

export function RobotsCheckerResult({ data }: RobotsCheckerResultProps) {
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'robots' | 'llms' | 'pages'>('overview');

  if (!data) {
    return (
      <div className="text-sm text-neutral-600">
        No data available. Run analysis to check robots.txt and meta robots tags.
      </div>
    );
  }

  // Handle legacy format (array of pages only)
  const isLegacyFormat = Array.isArray(data);
  const pages = isLegacyFormat ? data : data.pages;
  const robotsTxt = isLegacyFormat ? null : data.robotsTxt;
  const llmsTxt = isLegacyFormat ? null : data.llmsTxt;
  const comparison = isLegacyFormat ? null : data.comparison;

  const nonIndexableCount = pages.filter(d => !d.indexable).length;

  const copyTemplate = () => {
    if (llmsTxt?.suggested) {
      navigator.clipboard.writeText(llmsTxt.suggested);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('robots')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'robots'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            robots.txt
          </button>
          <button
            onClick={() => setActiveTab('llms')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'llms'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            llms.txt {!llmsTxt?.exists && <span className="ml-1 text-xs text-orange-600">Missing</span>}
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pages'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Pages ({pages.length})
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-neutral-50 border border-neutral-200">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-4 h-4 text-neutral-600" />
                <h4 className="text-sm font-medium text-neutral-900">robots.txt</h4>
              </div>
              <p className="text-lg font-bold text-neutral-900">
                {robotsTxt?.exists ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-1" /> Found
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <AlertTriangle className="w-5 h-5 mr-1" /> Not Found
                  </span>
                )}
              </p>
              {robotsTxt?.parsed && (
                <p className="text-xs text-neutral-600 mt-1">
                  {robotsTxt.parsed.disallows.length + robotsTxt.parsed.allows.length} rules
                </p>
              )}
            </div>

            <div className="p-4 bg-neutral-50 border border-neutral-200">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-4 h-4 text-neutral-600" />
                <h4 className="text-sm font-medium text-neutral-900">llms.txt</h4>
              </div>
              <p className="text-lg font-bold text-neutral-900">
                {llmsTxt?.exists ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-1" /> Found
                  </span>
                ) : (
                  <span className="flex items-center text-orange-600">
                    <AlertTriangle className="w-5 h-5 mr-1" /> Missing
                  </span>
                )}
              </p>
              {llmsTxt?.parsed && (
                <p className="text-xs text-neutral-600 mt-1">
                  {llmsTxt.parsed.disallows.length + llmsTxt.parsed.allows.length} rules
                </p>
              )}
            </div>

            <div className="p-4 bg-neutral-50 border border-neutral-200">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-neutral-600" />
                <h4 className="text-sm font-medium text-neutral-900">Pages Analyzed</h4>
              </div>
              <p className="text-lg font-bold text-neutral-900">{pages.length}</p>
              {nonIndexableCount > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {nonIndexableCount} non-indexable
                </p>
              )}
            </div>
          </div>

          {/* Comparison */}
          {comparison && comparison.hasDifferences && (
            <div className="p-4 bg-yellow-50 border border-yellow-200">
              <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Differences Detected
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {comparison.differences.map((diff, idx) => (
                  <li key={idx}>• {diff}</li>
                ))}
              </ul>
            </div>
          )}

          {!llmsTxt?.exists && (
            <div className="p-4 bg-blue-50 border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Recommendation</h4>
              <p className="text-sm text-blue-800">
                Consider creating an llms.txt file to control how AI crawlers interact with your content. Switch to the "llms.txt" tab to see a suggested template.
              </p>
            </div>
          )}
        </div>
      )}

      {/* robots.txt Tab */}
      {activeTab === 'robots' && (
        <div className="space-y-4">
          {robotsTxt?.exists ? (
            <>
              <div className="p-4 bg-neutral-50 border border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-900 mb-3">Parsed Rules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">User-agents:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {robotsTxt.parsed?.userAgents.map((ua, idx) => (
                        <li key={idx} className="font-mono text-xs">• {ua}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">Disallow Rules:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {robotsTxt.parsed?.disallows.map((rule, idx) => (
                        <li key={idx} className="font-mono text-xs">• {rule || '(empty)'}</li>
                      )) || <li className="text-neutral-400">None</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">Allow Rules:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {robotsTxt.parsed?.allows.map((rule, idx) => (
                        <li key={idx} className="font-mono text-xs">• {rule}</li>
                      )) || <li className="text-neutral-400">None</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">Sitemaps:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {robotsTxt.parsed?.sitemaps?.map((sitemap, idx) => (
                        <li key={idx} className="font-mono text-xs break-all">• {sitemap}</li>
                      )) || <li className="text-neutral-400">None</li>}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-900 mb-2">Raw Content</h4>
                <pre className="text-xs text-neutral-600 overflow-x-auto p-3 bg-neutral-50 border border-neutral-200 whitespace-pre-wrap font-mono">
                  {robotsTxt.content}
                </pre>
              </div>
            </>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-600">robots.txt file not found on this domain.</p>
            </div>
          )}
        </div>
      )}

      {/* llms.txt Tab */}
      {activeTab === 'llms' && (
        <div className="space-y-4">
          {llmsTxt?.exists ? (
            <>
              <div className="p-4 bg-neutral-50 border border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-900 mb-3">Parsed Rules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">User-agents:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {llmsTxt.parsed?.userAgents.map((ua, idx) => (
                        <li key={idx} className="font-mono text-xs">• {ua}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">Disallow Rules:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {llmsTxt.parsed?.disallows.map((rule, idx) => (
                        <li key={idx} className="font-mono text-xs">• {rule || '(empty)'}</li>
                      )) || <li className="text-neutral-400">None</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">Allow Rules:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {llmsTxt.parsed?.allows.map((rule, idx) => (
                        <li key={idx} className="font-mono text-xs">• {rule}</li>
                      )) || <li className="text-neutral-400">None</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700 mb-2">Policies:</p>
                    <ul className="text-neutral-600 space-y-1">
                      {llmsTxt.parsed?.policies?.map((policy, idx) => (
                        <li key={idx} className="font-mono text-xs break-all">• {policy}</li>
                      )) || <li className="text-neutral-400">None</li>}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-900 mb-2">Raw Content</h4>
                <pre className="text-xs text-neutral-600 overflow-x-auto p-3 bg-neutral-50 border border-neutral-200 whitespace-pre-wrap font-mono">
                  {llmsTxt.content}
                </pre>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-orange-50 border border-orange-200">
                <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  llms.txt Not Found
                </h4>
                <p className="text-sm text-orange-800">
                  Your site doesn't have an llms.txt file. This file helps control how AI crawlers interact with your content.
                </p>
              </div>

              {llmsTxt?.suggested && (
                <div className="p-4 bg-white border border-neutral-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-neutral-900">Suggested Template</h4>
                    <button
                      onClick={copyTemplate}
                      className="flex items-center space-x-2 px-3 py-1 bg-neutral-900 text-white text-xs hover:bg-neutral-700 transition-colors"
                    >
                      {copiedTemplate ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Template</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs text-neutral-600 overflow-x-auto p-3 bg-neutral-50 border border-neutral-200 whitespace-pre-wrap font-mono">
                    {llmsTxt.suggested}
                  </pre>
                  <p className="text-xs text-neutral-500 mt-2">
                    Create this file at the root of your domain as <code className="bg-neutral-100 px-1 py-0.5">/llms.txt</code>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-neutral-700">
              <strong>{pages.length}</strong> pages checked
            </span>
            {nonIndexableCount > 0 && (
              <span className="text-gray-600">
                <strong>{nonIndexableCount}</strong> pages marked noindex
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">URL</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Meta Robots</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {pages.map((item, idx) => (
                  <tr key={idx} className={!item.indexable ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2 text-neutral-600 break-all max-w-xs">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 flex items-center space-x-1">
                        <span className="truncate">{item.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      {item.indexable ? (
                        <span className="text-gray-600 font-medium">✅ Indexable</span>
                      ) : (
                        <span className="text-gray-600 font-medium">⚠️ Non-Indexable</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {item.metaRobots || <span className="text-neutral-400">none</span>}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
