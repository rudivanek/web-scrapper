import { Check } from 'lucide-react';

export interface Module {
  id: string;
  name: string;
  description: string;
  requiresFullScrape: boolean;
}

export const AVAILABLE_MODULES: Module[] = [
  {
    id: 'redirects',
    name: 'HTTP Redirect Tracking',
    description: 'Track redirect chains and identify loops',
    requiresFullScrape: false,
  },
  {
    id: 'robots',
    name: 'Robots.txt, llms.txt & Meta Robots',
    description: 'Analyze indexability rules and AI crawler policies',
    requiresFullScrape: true,
  },
  {
    id: 'canonical',
    name: 'Canonical Validation',
    description: 'Detect canonical tag mismatches',
    requiresFullScrape: true,
  },
  {
    id: 'duplicates',
    name: 'Duplicate Meta Finder',
    description: 'Find duplicate titles and descriptions',
    requiresFullScrape: true,
  },
  {
    id: 'brokenlinks',
    name: 'Broken Link Checker',
    description: 'Identify broken internal links',
    requiresFullScrape: true,
  },
  {
    id: 'schema',
    name: 'Schema.org Detection / Validator',
    description: 'Detect and validate JSON-LD structured data',
    requiresFullScrape: false,
  },
  {
    id: 'socialmeta',
    name: 'Open Graph / Twitter Card Checker',
    description: 'Validate social media preview tags',
    requiresFullScrape: false,
  },
  {
    id: 'paginationhreflang',
    name: 'Pagination & hreflang Validator',
    description: 'Validate pagination links and international hreflang tags',
    requiresFullScrape: false,
  },
  {
    id: 'imageanalyzer',
    name: 'Image Analyzer',
    description: 'Evaluate image SEO quality, alt text, and performance',
    requiresFullScrape: false,
  },
  {
    id: 'imageusagemapper',
    name: 'Image Usage Mapper',
    description: 'Map all images and show where each is used across pages',
    requiresFullScrape: false,
  },
  {
    id: 'schemacleanup',
    name: 'Schema Cleanup / Orphan Detector',
    description: 'Detect duplicate and orphan JSON-LD blocks (leftover FAQPage, missing @id, deprecated paths)',
    requiresFullScrape: false,
  },
  {
    id: 'thincontent',
    name: 'Thin Content Detector',
    description: 'Flag pages with little or no real content (empty CPT/archive pages)',
    requiresFullScrape: true,
  },
];

interface ModuleSelectorProps {
  selectedModules: string[];
  onToggleModule: (moduleId: string) => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
  disabled?: boolean;
}

export function ModuleSelector({ selectedModules, onToggleModule, onSelectAll, onUnselectAll, disabled }: ModuleSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-900">Select Analysis Modules</h3>
        <div className="flex items-center gap-3">
          <p className="text-xs text-neutral-500">
            {selectedModules.length} of {AVAILABLE_MODULES.length} selected
          </p>
          <button
            onClick={onSelectAll}
            disabled={disabled || selectedModules.length === AVAILABLE_MODULES.length}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:text-neutral-400 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <button
            onClick={onUnselectAll}
            disabled={disabled || selectedModules.length === 0}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:text-neutral-400 disabled:cursor-not-allowed"
          >
            Unselect All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AVAILABLE_MODULES.map((module) => {
          const isSelected = selectedModules.includes(module.id);

          return (
            <button
              key={module.id}
              onClick={() => onToggleModule(module.id)}
              disabled={disabled}
              className={`p-4 border-2 text-left transition-all ${
                isSelected
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-400'
              } ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-neutral-900">{module.name}</h4>
                    {module.requiresFullScrape && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300">
                        Scrape
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">{module.description}</p>
                </div>

                <div
                  className={`w-5 h-5 flex items-center justify-center border-2 flex-shrink-0 ml-2 ${
                    isSelected
                      ? 'bg-neutral-900 border-neutral-900'
                      : 'bg-white border-neutral-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200">
        <p className="text-xs text-blue-900">
          <span className="font-medium">Tip:</span> Modules marked with "Scrape" require full page content and consume more tokens.
          Other modules only need basic page checks.
        </p>
      </div>
    </div>
  );
}
