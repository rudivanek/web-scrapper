import { ExternalLink } from 'lucide-react';

interface DuplicateGroup {
  value: string;
  type: 'title' | 'description';
  urls: string[];
  count: number;
}

interface DuplicateMetaFinderResultProps {
  data: DuplicateGroup[];
}

export function DuplicateMetaFinderResult({ data }: DuplicateMetaFinderResultProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-neutral-600">
        ✅ No duplicate titles or descriptions found.
      </div>
    );
  }

  const titleDuplicates = data.filter(d => d.type === 'title');
  const descDuplicates = data.filter(d => d.type === 'description');

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 text-sm">
        {titleDuplicates.length > 0 && (
          <span className="text-gray-600">
            <strong>{titleDuplicates.length}</strong> duplicate titles
          </span>
        )}
        {descDuplicates.length > 0 && (
          <span className="text-gray-600">
            <strong>{descDuplicates.length}</strong> duplicate descriptions
          </span>
        )}
      </div>

      <div className="space-y-6">
        {data.map((group, idx) => (
          <div key={idx} className="border border-neutral-200  p-4 bg-gray-50">
            <div className="mb-3">
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-800 uppercase mb-2">
                {group.type}
              </span>
              <p className="text-sm font-medium text-neutral-900 break-words">
                "{group.value}"
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                Found on {group.count} pages:
              </p>
            </div>
            <ul className="space-y-1">
              {group.urls.map((url, urlIdx) => (
                <li key={urlIdx} className="text-sm text-neutral-600">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-neutral-900 flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
