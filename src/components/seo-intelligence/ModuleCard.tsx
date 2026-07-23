import { Loader2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useState, ReactNode } from 'react';

export interface ModuleResult {
  [key: string]: any;
}

interface ModuleCardProps {
  title: string;
  description: string;
  runModule: () => Promise<void>;
  loading: boolean;
  result?: ReactNode;
  totalIssues?: number;
  onExport?: () => void;
}

export function ModuleCard({
  title,
  description,
  runModule,
  loading,
  result,
  totalIssues,
  onExport
}: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusBadge = () => {
    if (loading) {
      return <span className="text-xs px-2 py-1  bg-gray-100 text-gray-700">Running</span>;
    }
    if (!result) {
      return <span className="text-xs px-2 py-1  bg-neutral-100 text-neutral-600">Not Run</span>;
    }
    if (totalIssues === 0) {
      return <span className="text-xs px-2 py-1  bg-gray-100 text-gray-700">✅ OK</span>;
    }
    if (totalIssues && totalIssues < 5) {
      return <span className="text-xs px-2 py-1  bg-gray-100 text-gray-700">⚠️ {totalIssues} issues</span>;
    }
    return <span className="text-xs px-2 py-1  bg-gray-100 text-gray-700">⛔ {totalIssues} issues</span>;
  };

  return (
    <div className="bg-white border border-neutral-200  shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
            {getStatusBadge()}
          </div>
          <div className="flex items-center space-x-2">
            {result && onExport && (
              <button
                onClick={onExport}
                className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50  transition-colors flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}
            <button
              onClick={runModule}
              disabled={loading}
              className="px-4 py-2 bg-neutral-900 text-white  hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <span>Run Analysis</span>
              )}
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-500 ml-8">{description}</p>
      </div>

      {isExpanded && result && (
        <div className="border-t border-neutral-200 p-4 bg-neutral-50">
          {result}
        </div>
      )}
    </div>
  );
}
