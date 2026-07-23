import { ExternalLink } from 'lucide-react';

interface BrokenLink {
  sourceUrl: string;
  link: string;
  statusCode: number;
  statusText: string;
}

interface BrokenLinkCheckerResultProps {
  data: BrokenLink[];
}

export function BrokenLinkCheckerResult({ data }: BrokenLinkCheckerResultProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-neutral-600">
        ✅ No broken internal links found.
      </div>
    );
  }

  const brokenCount = data.filter(d => d.statusCode >= 400).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-600">
          <strong>{brokenCount}</strong> broken internal links detected
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Source Page</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Broken Link</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {data.map((item, idx) => (
              <tr key={idx} className="bg-gray-50">
                <td className="px-4 py-2 text-neutral-600 break-all max-w-xs">
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 flex items-center space-x-1">
                    <span className="truncate">{item.sourceUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </td>
                <td className="px-4 py-2 text-neutral-600 break-all max-w-xs">
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 flex items-center space-x-1">
                    <span className="truncate">{item.link}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </td>
                <td className="px-4 py-2">
                  <span className="text-gray-600 font-medium">
                    {item.statusCode} {item.statusText}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
