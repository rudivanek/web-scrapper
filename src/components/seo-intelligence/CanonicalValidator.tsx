import { ExternalLink } from 'lucide-react';

interface CanonicalCheck {
  url: string;
  canonicalUrl?: string;
  hasMismatch: boolean;
  issue?: string;
}

interface CanonicalValidatorResultProps {
  data: CanonicalCheck[];
}

export function CanonicalValidatorResult({ data }: CanonicalValidatorResultProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-neutral-600">
        No data available. Run analysis to check canonical tags.
      </div>
    );
  }

  const mismatchCount = data.filter(d => d.hasMismatch).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-neutral-700">
          <strong>{data.length}</strong> pages checked
        </span>
        {mismatchCount > 0 && (
          <span className="text-gray-600">
            <strong>{mismatchCount}</strong> canonical mismatches
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Page URL</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Canonical URL</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Issue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {data.map((item, idx) => (
              <tr key={idx} className={item.hasMismatch ? 'bg-gray-50' : ''}>
                <td className="px-4 py-2 text-neutral-600 break-all max-w-xs">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 flex items-center space-x-1">
                    <span className="truncate">{item.url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </td>
                <td className="px-4 py-2 text-neutral-600 break-all max-w-xs truncate">
                  {item.canonicalUrl || <span className="text-neutral-400">none</span>}
                </td>
                <td className="px-4 py-2">
                  {item.hasMismatch ? (
                    <span className="text-gray-600 font-medium">⛔ Mismatch</span>
                  ) : (
                    <span className="text-gray-600 font-medium">✅ OK</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {item.issue || <span className="text-neutral-400">none</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
