import { useState, forwardRef, useImperativeHandle } from 'react';
import { Check, AlertTriangle, XCircle, ChevronDown, ChevronRight, Code } from 'lucide-react';

interface SchemaValidationResult {
  url: string;
  schemas: {
    type: string;
    valid: boolean;
    error?: string;
    context?: string;
    rawJson?: any;
  }[];
  rawJson?: any[];
}

interface SchemaValidatorProps {
  crawlId: string;
  filteredUrls: string[];
  domain?: string;
  onLoadingChange?: (loading: boolean) => void;
  onResultsChange?: (results: SchemaValidationResult[]) => void;
}

export interface SchemaValidatorRef {
  runAnalysis: () => Promise<void>;
  getResults: () => SchemaValidationResult[];
  isLoading: () => boolean;
  exportToCSV: () => void;
}

export const SchemaValidator = forwardRef<SchemaValidatorRef, SchemaValidatorProps>(
  ({ crawlId, filteredUrls, domain = 'analysis', onLoadingChange, onResultsChange }, ref) => {
  const [results, setResults] = useState<SchemaValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());

  const runAnalysis = async () => {
    if (filteredUrls.length === 0) {
      alert('No URLs selected for analysis');
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-schema`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            crawl_id: crawlId,
            urls: filteredUrls,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      const newResults = data.results || [];
      setResults(newResults);
      onResultsChange?.(newResults);
    } catch (err) {
      console.error('Schema analysis error:', err);
      alert('Failed to analyze schemas. Please try again.');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvRows: any[] = [];
    results.forEach(result => {
      if (result.schemas.length === 0) {
        csvRows.push({
          url: result.url,
          schemaType: 'None',
          valid: 'N/A',
          error: 'No schema found'
        });
      } else {
        result.schemas.forEach(schema => {
          csvRows.push({
            url: result.url,
            schemaType: schema.type,
            valid: schema.valid ? 'Yes' : 'No',
            error: schema.error || ''
          });
        });
      }
    });

    const headers = ['URL', 'Schema Type', 'Valid', 'Error'];
    let csv = headers.join(',') + '\n';

    csvRows.forEach(row => {
      const values = [row.url, row.schemaType, row.valid, row.error].map(val => `"${val}"`);
      csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `${domain}-schema-validation-${timestamp}.csv`;
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
    const newExpanded = new Set(expandedUrls);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedUrls(newExpanded);
  };

  const totalPages = results.length;
  const pagesWithSchema = results.filter(r => r.schemas.length > 0 && r.schemas[0].type !== 'Error').length;
  const validSchemas = results.reduce((count, r) => count + r.schemas.filter(s => s.valid).length, 0);
  const invalidSchemas = results.reduce((count, r) => count + r.schemas.filter(s => !s.valid && s.type !== 'Error').length, 0);
  const missingSchema = totalPages - pagesWithSchema;

  const getStatusIcon = (result: SchemaValidationResult) => {
    if (result.schemas.length === 0) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (result.schemas[0].type === 'Error') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (result.schemas.every(s => s.valid)) {
      return <Check className="w-5 h-5 text-green-500" />;
    }
    if (result.schemas.some(s => s.valid)) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = (result: SchemaValidationResult) => {
    if (result.schemas.length === 0) {
      return <span className="text-red-600 font-medium">Missing</span>;
    }
    if (result.schemas[0].type === 'Error') {
      return <span className="text-red-600 font-medium">Error</span>;
    }
    if (result.schemas.every(s => s.valid)) {
      return <span className="text-green-600 font-medium">Valid</span>;
    }
    if (result.schemas.some(s => s.valid)) {
      return <span className="text-yellow-600 font-medium">Partial</span>;
    }
    return <span className="text-red-600 font-medium">Invalid</span>;
  };

  return (
    <div className="space-y-4">
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{totalPages}</div>
              <div className="text-sm text-gray-600">Pages Scanned</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{validSchemas}</div>
              <div className="text-sm text-green-600">Valid Schema</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{invalidSchemas}</div>
              <div className="text-sm text-yellow-600">Invalid Schema</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{missingSchema}</div>
              <div className="text-sm text-red-600">Missing Schema</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-12 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Detected Types
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, idx) => {
                    const isExpanded = expandedUrls.has(result.url);
                    return (
                      <>
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpand(result.url)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
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
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {result.schemas.length === 0 ? (
                              <span className="text-gray-400">No schema detected</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {result.schemas.map((schema, sidx) => (
                                  <span
                                    key={sidx}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      schema.valid
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {schema.type}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result)}
                              {getStatusText(result)}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="px-4 py-4 bg-gray-50">
                              <div className="space-y-3">
                                {result.schemas.map((schema, sidx) => (
                                  <div
                                    key={sidx}
                                    className="bg-white p-3 rounded border border-gray-200"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Code className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-900">
                                          {schema.type}
                                        </span>
                                        {schema.valid ? (
                                          <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                    {schema.error && (
                                      <div className="text-sm text-red-600 mb-2">
                                        Error: {schema.error}
                                      </div>
                                    )}
                                    {schema.context && (
                                      <div className="text-xs text-gray-500 mb-2">
                                        Context: {schema.context}
                                      </div>
                                    )}
                                    {schema.rawJson && (
                                      <details className="mt-2">
                                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                                          View Raw Schema
                                        </summary>
                                        <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                                          {JSON.stringify(schema.rawJson, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                  </div>
                                ))}
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
            Click "Run Analysis" to start detecting and validating Schema.org structured data
          </p>
        </div>
      )}
    </div>
  );
});

SchemaValidator.displayName = 'SchemaValidator';

export interface SchemaValidatorResult {
  module: 'schema_validator';
  results: SchemaValidationResult[];
}
