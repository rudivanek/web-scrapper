import {
  Server,
  Type,
  FileText,
  Search,
  Link2,
  AlignLeft,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Link,
  Image,
  ImagePlus,
  Hash,
  CheckSquare,
  Square
} from 'lucide-react';

export interface AnalysisModule {
  id: string;
  label: string;
  icon: React.ElementType;
  defaultEnabled: boolean;
  tooltip: string;
}

export const ANALYSIS_MODULES: AnalysisModule[] = [
  {
    id: 'status',
    label: 'Status',
    icon: Server,
    defaultEnabled: true,
    tooltip: 'Check HTTP response code'
  },
  {
    id: 'metaTitle',
    label: 'Meta Title',
    icon: Type,
    defaultEnabled: true,
    tooltip: 'Extract meta title tag and length'
  },
  {
    id: 'metaDescription',
    label: 'Meta Description',
    icon: FileText,
    defaultEnabled: true,
    tooltip: 'Extract meta description tag and length'
  },
  {
    id: 'indexable',
    label: 'Indexable',
    icon: Search,
    defaultEnabled: false,
    tooltip: 'Detect if page can appear in search results'
  },
  {
    id: 'canonical',
    label: 'Canonical',
    icon: Link2,
    defaultEnabled: false,
    tooltip: 'Extract canonical tag URL'
  },
  {
    id: 'wordCount',
    label: 'Word Count',
    icon: AlignLeft,
    defaultEnabled: false,
    tooltip: 'Count visible text content'
  },
  {
    id: 'h1',
    label: 'H1',
    icon: Heading1,
    defaultEnabled: true,
    tooltip: 'Extract H1 headings and length'
  },
  {
    id: 'h2',
    label: 'H2',
    icon: Heading2,
    defaultEnabled: false,
    tooltip: 'Extract H2 headings and length'
  },
  {
    id: 'h3',
    label: 'H3',
    icon: Heading3,
    defaultEnabled: false,
    tooltip: 'Extract H3 headings and length'
  },
  {
    id: 'h4',
    label: 'H4',
    icon: Heading4,
    defaultEnabled: false,
    tooltip: 'Extract H4 headings and length'
  },
  {
    id: 'h5',
    label: 'H5',
    icon: Heading5,
    defaultEnabled: false,
    tooltip: 'Extract H5 headings and length'
  },
  {
    id: 'h6',
    label: 'H6',
    icon: Heading6,
    defaultEnabled: false,
    tooltip: 'Extract H6 headings and length'
  },
  {
    id: 'links',
    label: 'Links',
    icon: Link,
    defaultEnabled: false,
    tooltip: 'Extract and count all links'
  },
  {
    id: 'images',
    label: 'Images',
    icon: Image,
    defaultEnabled: false,
    tooltip: 'Extract and count all images'
  },
  {
    id: 'imageAlts',
    label: 'Alt Text',
    icon: ImagePlus,
    defaultEnabled: false,
    tooltip: 'Check image alt text presence'
  },
  {
    id: 'keywords',
    label: 'Keywords',
    icon: Hash,
    defaultEnabled: false,
    tooltip: 'Extract meta keywords from page'
  }
];

const STORAGE_KEY = 'webcrawler_activeModules';

export const getDefaultModules = (): string[] => {
  return ANALYSIS_MODULES
    .filter(module => module.defaultEnabled)
    .map(module => module.id);
};

export const loadActiveModules = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultModules();
    }
  }
  return getDefaultModules();
};

export const saveActiveModules = (modules: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
};

interface AnalysisToggleBarProps {
  activeModules: string[];
  setActiveModules: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AnalysisToggleBar({ activeModules, setActiveModules }: AnalysisToggleBarProps) {
  const toggleModule = (moduleId: string) => {
    setActiveModules(prev => {
      const newModules = prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId];
      saveActiveModules(newModules);
      return newModules;
    });
  };

  const allSelected = activeModules.length === ANALYSIS_MODULES.length;

  const toggleAll = () => {
    if (allSelected) {
      setActiveModules([]);
      saveActiveModules([]);
    } else {
      const allModuleIds = ANALYSIS_MODULES.map(m => m.id);
      setActiveModules(allModuleIds);
      saveActiveModules(allModuleIds);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-900">Analysis Modules</h3>
        <span className="text-xs text-gray-500">
          {activeModules.length} / {ANALYSIS_MODULES.length} active
        </span>
      </div>
      <div className="overflow-x-auto" style={{ maxHeight: '80px' }}>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={toggleAll}
            title={allSelected ? 'Unselect all modules' : 'Select all modules'}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold
              transition-all border
              ${allSelected
                ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
              }
            `}
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <Square className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span>{allSelected ? 'Unselect All' : 'Select All'}</span>
          </button>
          {ANALYSIS_MODULES.map((module) => {
            const Icon = module.icon;
            const isActive = activeModules.includes(module.id);

            return (
              <button
                key={module.id}
                onClick={() => toggleModule(module.id)}
                title={module.tooltip}
                className={`
                  inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
                  transition-all border
                  ${isActive
                    ? 'bg-gray-600 text-white border-gray-700 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{module.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
