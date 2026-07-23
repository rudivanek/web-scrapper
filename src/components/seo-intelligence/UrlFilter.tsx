import { useState } from 'react';
import { Filter, Plus, X } from 'lucide-react';

interface UrlFilterProps {
  onApplyFilter: (config: FilterConfig) => void;
  disabled?: boolean;
}

export interface FilterConfig {
  mode: 'all' | 'include' | 'exclude' | 'manual';
  patterns: string[];
  manualUrls: string[];
}

export function UrlFilter({ onApplyFilter, disabled }: UrlFilterProps) {
  const [mode, setMode] = useState<FilterConfig['mode']>('all');
  const [patterns, setPatterns] = useState<string[]>([]);
  const [currentPattern, setCurrentPattern] = useState('');
  const [manualUrls, setManualUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');

  const addPattern = () => {
    if (currentPattern.trim() && !patterns.includes(currentPattern.trim())) {
      const newPatterns = [...patterns, currentPattern.trim()];
      setPatterns(newPatterns);
      setCurrentPattern('');
      onApplyFilter({ mode, patterns: newPatterns, manualUrls });
    }
  };

  const removePattern = (pattern: string) => {
    const newPatterns = patterns.filter(p => p !== pattern);
    setPatterns(newPatterns);
    onApplyFilter({ mode, patterns: newPatterns, manualUrls });
  };

  const addUrl = () => {
    if (currentUrl.trim() && !manualUrls.includes(currentUrl.trim())) {
      const newUrls = [...manualUrls, currentUrl.trim()];
      setManualUrls(newUrls);
      setCurrentUrl('');
      onApplyFilter({ mode, patterns, manualUrls: newUrls });
    }
  };

  const removeUrl = (url: string) => {
    const newUrls = manualUrls.filter(u => u !== url);
    setManualUrls(newUrls);
    onApplyFilter({ mode, patterns, manualUrls: newUrls });
  };

  const handleModeChange = (newMode: FilterConfig['mode']) => {
    setMode(newMode);
    onApplyFilter({ mode: newMode, patterns, manualUrls });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-3">
        <Filter className="w-4 h-4 text-neutral-600" />
        <h3 className="text-sm font-medium text-neutral-900">URL Filtering</h3>
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="filter-mode"
            value="all"
            checked={mode === 'all'}
            onChange={() => handleModeChange('all')}
            disabled={disabled}
            className="w-4 h-4"
          />
          <div>
            <span className="text-sm font-medium text-neutral-900">Crawl entire site</span>
            <p className="text-xs text-neutral-600">Discover and analyze all pages</p>
          </div>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="filter-mode"
            value="include"
            checked={mode === 'include'}
            onChange={() => handleModeChange('include')}
            disabled={disabled}
            className="w-4 h-4"
          />
          <div>
            <span className="text-sm font-medium text-neutral-900">Include only matching URLs</span>
            <p className="text-xs text-neutral-600">Only crawl URLs that match patterns</p>
          </div>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="filter-mode"
            value="exclude"
            checked={mode === 'exclude'}
            onChange={() => handleModeChange('exclude')}
            disabled={disabled}
            className="w-4 h-4"
          />
          <div>
            <span className="text-sm font-medium text-neutral-900">Exclude matching URLs</span>
            <p className="text-xs text-neutral-600">Skip URLs that match patterns</p>
          </div>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="filter-mode"
            value="manual"
            checked={mode === 'manual'}
            onChange={() => handleModeChange('manual')}
            disabled={disabled}
            className="w-4 h-4"
          />
          <div>
            <span className="text-sm font-medium text-neutral-900">Specify URLs manually</span>
            <p className="text-xs text-neutral-600">Provide exact URLs to analyze</p>
          </div>
        </label>
      </div>

      {(mode === 'include' || mode === 'exclude') && (
        <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200">
          <p className="text-xs text-neutral-700 mb-3">
            Add URL patterns (e.g., /blog/*, /products/*, *.pdf)
          </p>
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={currentPattern}
              onChange={(e) => setCurrentPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPattern()}
              placeholder="/blog/*"
              disabled={disabled}
              className="flex-1 px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <button
              onClick={addPattern}
              disabled={disabled || !currentPattern.trim()}
              className="px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {patterns.length > 0 && (
            <div className="space-y-2">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2 border border-neutral-200">
                  <span className="text-sm text-neutral-900">{pattern}</span>
                  <button
                    onClick={() => removePattern(pattern)}
                    disabled={disabled}
                    className="text-neutral-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200">
          <p className="text-xs text-neutral-700 mb-3">
            Add specific URLs to analyze
          </p>
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUrl()}
              placeholder="https://example.com/page"
              disabled={disabled}
              className="flex-1 px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <button
              onClick={addUrl}
              disabled={disabled || !currentUrl.trim()}
              className="px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {manualUrls.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {manualUrls.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2 border border-neutral-200">
                  <span className="text-sm text-neutral-900 truncate">{url}</span>
                  <button
                    onClick={() => removeUrl(url)}
                    disabled={disabled}
                    className="text-neutral-500 hover:text-red-600 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
